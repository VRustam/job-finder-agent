import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobs } = await request.json();
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json(
        { error: 'Jobs array is required' },
        { status: 400 }
      );
    }

    // 1. Fetch user's latest resume to match against
    const { data: resumeData } = await supabase
      .from('resumes')
      .select('content')
      .order('updated_at', { ascending: false })
      .limit(1);

    const resumeContent = resumeData && resumeData.length > 0 ? JSON.stringify(resumeData[0].content) : "No resume uploaded yet.";

    // 2. Fetch already synced jobs for this user to prevent duplicates
    const jobIds = jobs.map(j => String(j.linkedin_job_id));
    const { data: existingJobs } = await supabase
      .from('synced_jobs')
      .select('linkedin_job_id')
      .eq('user_id', user.id)
      .in('linkedin_job_id', jobIds);

    const existingIds = new Set(existingJobs?.map(ej => String(ej.linkedin_job_id)) || []);
    
    // Filter out jobs that are already in the DB
    const newJobs = jobs.filter(j => !existingIds.has(String(j.linkedin_job_id)));

    if (newJobs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All synced jobs were already in the database. No new jobs to process.',
        processedCount: 0 
      });
    }

    // 3. Call Gemini to score the new jobs in a single batch
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    const geminiJobsInput = newJobs.map(j => ({
      linkedin_job_id: String(j.linkedin_job_id),
      title: j.title,
      company: j.company,
      location: j.location
    }));

    const prompt = `
You are an advanced AI recruiter and career matcher.
Compare the following user resume against the list of newly scraped job postings.
For each job posting, evaluate:
1. "match_score": A percentage score (integer between 0 and 100) indicating how well the candidate's skills and experience match the job.
2. "match_reason": A short 1-2 sentence explanation of why this score was given, referencing key matching or missing skills.

---
USER RESUME:
${resumeContent}

---
JOB POSTINGS TO EVALUATE:
${JSON.stringify(geminiJobsInput, null, 2)}

---
IMPORTANT: Output ONLY a JSON object containing a "results" array. Each item in "results" must contain:
- "linkedin_job_id": The string ID matching the input job posting.
- "match_score": Integer (0-100).
- "match_reason": String.

Do not include markdown code block formatting (like \`\`\`json) or any external comments. Return raw JSON.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Gemini API returned error: ${errorText}` },
        { status: 502 }
      );
    }

    const resultData = await response.json();
    const rawText = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const analysisMap: Record<string, { score: number; reason: string }> = {};
    try {
      const parsedData = JSON.parse(rawText.trim());
      if (parsedData.results && Array.isArray(parsedData.results)) {
        for (const item of parsedData.results) {
          analysisMap[String(item.linkedin_job_id)] = {
            score: Number(item.match_score) || 0,
            reason: item.match_reason || ''
          };
        }
      }
    } catch (parseErr) {
      console.error('Failed to parse Gemini batch response:', rawText, parseErr);
    }

    // 4. Map the evaluations and insert into the database
    const jobsToInsert = newJobs.map(j => {
      const idStr = String(j.linkedin_job_id);
      const evalData = analysisMap[idStr] || { score: 50, reason: 'AI matching failed to parse' };
      return {
        user_id: user.id,
        linkedin_job_id: idStr,
        title: j.title,
        company: j.company,
        location: j.location,
        link: j.link,
        match_score: evalData.score,
        match_reason: evalData.reason
      };
    });

    const { error: insertErr } = await supabase
      .from('synced_jobs')
      .insert(jobsToInsert);

    if (insertErr) {
      throw new Error(`Database insert failed: ${insertErr.message}`);
    }

    return NextResponse.json({
      success: true,
      processedCount: jobsToInsert.length,
      jobs: jobsToInsert
    });
  } catch (err) {
    console.error('Bulk sync API error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
