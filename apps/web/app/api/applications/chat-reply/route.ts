import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recruiterMessage, resumeContent } = await request.json();

    if (!recruiterMessage) {
      return NextResponse.json({ error: 'Recruiter message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    // Prepare prompt
    const prompt = `
You are a job applicant replying to a recruiter's message on LinkedIn.
Draft a polite, professional, warm, and concise response (1 to 3 sentences maximum) suitable for LinkedIn chat.

Recruiter Message:
"${recruiterMessage}"

My Resume Context (if available):
${resumeContent ? JSON.stringify(resumeContent) : 'Not provided. Keep response polite and open to discussion.'}

Instructions:
- Keep it highly professional, short, and to the point.
- If they ask for a resume or chat, politely agree and offer to share contact details or schedule a quick call.
- Do NOT include any placeholders like [Your Name]. Just write the actual message body directly.
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
    const replyText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
                      'Thank you for reaching out! I would love to connect and discuss this opportunity further.';

    return NextResponse.json({ replyText });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate chat reply' },
      { status: 500 }
    );
  }
}
