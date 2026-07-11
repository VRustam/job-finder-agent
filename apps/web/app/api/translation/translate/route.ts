import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, sourceLang, targetLang } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text to translate is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const prompt = `
You are an expert translator and speech polisher.
Translate this spoken transcript from ${sourceLang || 'auto'} to ${targetLang || 'English'}.
The output must sound extremely professional, fluent, and well-structured, exactly as if a candidate is delivering it in a formal job interview.

Raw Transcript:
"${text}"

Instructions:
- Keep the output natural but grammatically perfect and polished.
- Do NOT add any explanations, notes, or markdown wrappers. Output only the final translated and polished text.
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
    const translatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return NextResponse.json({ translatedText });

  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to translate speech' },
      { status: 500 }
    );
  }
}
