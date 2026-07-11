import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { resumeId, jobTitle, companyName, jobDescription } = await request.json();

    if (!jobTitle || !companyName) {
      return NextResponse.json(
        { error: 'Missing jobTitle or companyName' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured.' },
        { status: 500 }
      );
    }

    let resumeContext = '';
    if (resumeId) {
      const supabase = await createClient();
      const { data: resume, error } = await supabase
        .from('resumes')
        .select('content')
        .eq('id', resumeId)
        .single();

      if (!error && resume) {
        resumeContext = `Here are my resume details in JSON: ${JSON.stringify(resume.content)}`;
      }
    }

    const prompt = `
You are an expert executive cover letter writer and technical recruiter.
Write a highly professional, tailored, and persuasive cover letter for:
- Job Title: ${jobTitle}
- Company: ${companyName}
- Job Description: ${jobDescription || 'Not specified'}

${resumeContext ? `Use the following details from my resume to highlight matching skills and achievements: ${resumeContext}` : 'Write a high-quality general cover letter for this role.'}

Follow these instructions strictly:
1. Make it professional, engaging, and clear.
2. Structure it properly with date, recipient (e.g., Hiring Manager), introduction, body paragraphs highlighting qualifications, and a professional call-to-action closing.
3. Keep it within 300 to 450 words.
4. Output the raw text of the cover letter. Do not include any HTML, markdown formatting, or JSON wrapping. Just output the clean, printable text.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'text/plain'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Gemini API error: ${errorText}` },
        { status: 502 }
      );
    }

    const resultData = await response.json();
    const coverLetterText = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ content: coverLetterText.trim() });
  } catch (err) {
    console.error('Error generating cover letter:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
