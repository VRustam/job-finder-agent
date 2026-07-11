import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profession, technology } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const prompt = `
You are an expert technical interviewer and technical trainer.
Provide interview preparation and learning resources for the following:
Profession: ${profession || 'Software Engineer'}
Target Technology/Language/Topic: ${technology || 'General'}

Generate a JSON object containing two main sections: "videos" and "written".

1. "videos" must be a list of 3 high-quality YouTube tutorial recommendations. Each should have:
   - "title": A descriptive title of the tutorial (e.g. "React Hooks Explained").
   - "channel": A popular technical educator or channel (e.g. "Web Dev Simplified", "Traversy Media", "Academind").
   - "duration": Estimated video length (e.g. "15 mins").
   - "searchQuery": A query string optimized for YouTube search (e.g. "React hooks crash course").
   - "description": A 1-sentence description of what they will learn from this video.

2. "written" must be an object containing:
   - "coreConcepts": A list of 4 key technical concepts or architectural topics they must master for this topic.
   - "interviewQuestions": A list of 5 common interview questions. Each question must have:
     - "question": The question text.
     - "answer": A detailed, professional model answer (2-3 sentences).
   - "cheatsheet": A 1-2 paragraph quick study guide summarizing best practices, gotchas, or common code patterns.

IMPORTANT: Return ONLY valid, minified JSON. Do not include markdown code block syntax (like \`\`\`json) or any explanations outside the JSON.
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
    
    const parsedData = JSON.parse(rawText.trim());
    return NextResponse.json(parsedData);
  } catch (err) {
    console.error('Tutorials API error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
