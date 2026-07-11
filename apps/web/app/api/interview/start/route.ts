import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId, jobTitle, jobDescription } = await request.json();

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    let resumeContent = null;
    if (resumeId) {
      const { data, error } = await supabase
        .from('resumes')
        .select('content')
        .eq('id', resumeId)
        .single();

      if (!error && data) {
        resumeContent = data.content;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const prompt = `
You are an expert interviewer.
Generate exactly 5 interview questions for a candidate practicing for the role of: "${jobTitle}".
Target Job Description:
"${jobDescription || 'Not provided'}"

Candidate's Resume Context:
${resumeContent ? JSON.stringify(resumeContent) : 'No resume provided. Ask standard questions for this role.'}

Requirements:
- Generate a mix of:
  * 2 Technical questions (based on skills in the resume or required for the role)
  * 2 Behavioral questions (based on experience or standard workplace scenarios)
  * 1 General question (background, career goals, or why they want the role)
- Keep questions challenging but realistic.
- Do NOT include any markdown wrapper or explanation in the response. Return strictly a JSON array.

Respond with a JSON array where each object has these exact fields:
[
  {
    "id": 1,
    "question": "Question text here...",
    "type": "technical" | "behavioral" | "general"
  }
]
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
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Gemini API returned error: ${errorText}` },
        { status: 502 }
      );
    }

    const resData = await response.json();
    const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    const questionsArray = JSON.parse(responseText.trim());

    // Insert new session into database
    const { data: session, error: dbError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        resume_id: resumeId || null,
        job_title: jobTitle,
        job_description: jobDescription || null,
        questions: questionsArray,
        answers: [],
        overall_score: null
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      sessionId: session.id,
      questions: questionsArray
    });

  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to initialize practice session' },
      { status: 500 }
    );
  }
}
