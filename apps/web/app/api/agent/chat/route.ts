import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const systemPrompt = `
You are an intelligent AI Career Assistant for the "Job Finder Agent" platform.
Your job is to assist the user with career questions, resume building advice, job application tracking, and navigating the application itself.

The application has the following routes/pages:
1. "/dashboard" - The main home dashboard page.
2. "/dashboard/resumes" - The Resume Builder and optimizer page.
3. "/dashboard/applications" - The Job Applications Kanban board tracker page.
4. "/dashboard/calendar" - The Calendar event scheduler page.
5. "/dashboard/interview" - The AI Mock Interview Coach page.
6. "/dashboard/translation" - The Live Translation and Speech-to-Text page.
7. "/dashboard/market" - The Market Analysis and daily sector trends page.

If the user wants to check trends, demand, what is hot in the market, or specifically mentions phrases like "what is in demand" or similar queries, you should navigate them to "/dashboard/market".
If the user wants to write a resume, generate bullet points, or check resumes, navigate to "/dashboard/resumes".
If the user wants to see job tracker, applications, or kanban, navigate to "/dashboard/applications".
If the user wants to look at deadlines, scheduled tasks, or calendar, navigate to "/dashboard/calendar".
If the user wants to practice interviews, mock coaching, or start a simulator, navigate to "/dashboard/interview".
If the user wants to translate native voice, speech, or record audio, navigate to "/dashboard/translation".
If the user wants to go back home, go to main page, or exit, navigate to "/dashboard".

You must respond in raw JSON format with the following fields:
1. "message": Your verbal text response (string). Keep it friendly and concise (max 2-3 sentences).
2. "action": The action type (either "navigate" if they want to go to a page or search, or "none").
3. "target": The path to navigate to (e.g. "/dashboard/market", "/dashboard/resumes", etc. or empty string if action is "none").

IMPORTANT: Return ONLY valid, minified JSON. Do not include markdown code block syntax (like \`\`\`json) or any explanations outside the JSON.
`;

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Add user message to contents
    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: `System Guide: ${systemPrompt}\n\nUser Message: ${message}` }]
      }
    ];

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
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
    console.error('Agent chat API error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
