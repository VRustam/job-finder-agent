import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const prompt = `
Perform real-time global market research on today's job sectors and career demands.
Provide the findings in a raw JSON format containing three main fields:
1. "dailyInsight": A short summary paragraph outlining the major shift or focus area in today's tech/business recruitment market.
2. "sectors": A list of 4-5 high-demand career sectors. For each sector, provide:
   - "name": The sector name (e.g. AI & Intelligent Agents, Cloud Security, Healthcare Data Analyst).
   - "demand": "Critical", "High", or "Moderate".
   - "trend": "up", "down", or "stable".
   - "description": A brief summary of why this sector is currently in high demand and what companies are looking for.
3. "emergingSkills": A list of 5 key technologies/skills currently seeing the fastest adoption.

IMPORTANT: Return ONLY valid, minified JSON. Do not include markdown code block syntax (like \`\`\`json) or any explanations.
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
    
    // Parse to ensure it is valid JSON
    const parsedData = JSON.parse(rawText.trim());

    return NextResponse.json(parsedData);
  } catch (err) {
    console.error('Market trends API error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
