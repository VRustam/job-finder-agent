import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fields, jobTitle, companyName } = await request.json();

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Fields list is required' }, { status: 400 });
    }

    // 1. Fetch user's latest resume to match against
    const { data: resumeData } = await supabase
      .from('resumes')
      .select('content')
      .order('updated_at', { ascending: false })
      .limit(1);

    const resumeContent = resumeData && resumeData.length > 0 
      ? JSON.stringify(resumeData[0].content) 
      : "No resume uploaded yet.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const prompt = `
You are an intelligent Career AI Agent filling out a job application on behalf of a candidate.
Your goal is to look at the form fields and determine the most truthful and appropriate answers based on the candidate's resume.

---
CANDIDATE RESUME:
${resumeContent}

---
JOB DETAILS:
Title: ${jobTitle || 'Unknown Role'}
Company: ${companyName || 'Unknown Company'}

---
FORM FIELDS TO AUTOFILL:
${JSON.stringify(fields, null, 2)}

---
INSTRUCTIONS:
1. For each input field, decide the value to fill in based on the resume.
2. For multiple-choice fields (radio buttons, checkboxes, select dropdowns), match the options against the candidate's resume details.
   - For authorization questions (e.g. "Are you authorized to work?"): If the resume shows the candidate resides in the appropriate country or has work history there, default to "Yes" or equivalent choice.
   - For sponsorship questions (e.g. "Will you require sponsorship?"): Answer "No" unless the resume explicitly indicates visa requirements.
   - For experience questions (e.g. "How many years of experience do you have with React?"): Calculate the years of experience based on the resume job history dates.
3. For additional information/cover letter sections, write a brief, polite note:
   "This application was submitted automatically on my behalf by my Career AI Agent. If you would like to schedule an interview, please send the date and time directly to my LinkedIn messaging thread or to my email. Thank you!"

Return ONLY a JSON object mapping each input's "id" (from the input array) to its decided "value" (a string or boolean matching the input type).
Example format:
{
  "answers": {
    "field-id-1": "Candidate Name",
    "field-id-2": "Yes",
    "field-id-3": "3"
  }
}

Do not include markdown wrappers (like \`\`\`json) or any external comments. Return raw JSON.
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
    
    let answers = {};
    try {
      const parsedData = JSON.parse(rawText.trim());
      answers = parsedData.answers || parsedData;
    } catch (parseErr) {
      console.error('Failed to parse Gemini auto-fill response:', rawText, parseErr);
    }

    return NextResponse.json({ answers });
  } catch (err) {
    console.error('Auto-fill API error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
