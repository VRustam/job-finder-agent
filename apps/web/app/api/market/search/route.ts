import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, profession } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const searchContext = `
Profession: ${profession || 'All/General'}
User Custom Query: ${query || 'General market demand'}
`;

    const prompt = `
You are an advanced recruitment market analyst.
Analyze the job market, hiring demand, and skill requirements based on the following query:
${searchContext}

Provide the analysis in a raw JSON format containing the following fields:
1. "profession": The analyzed profession (string).
2. "demandScore": A number from 0 to 100 representing today's hiring demand.
3. "summary": A 2-3 sentence overview of the demand trend, job availability, and hiring velocity.
4. "requiredSkills": A list of 4-5 key skills or frameworks in high demand for this role.
5. "salaryRange": Estimated average annual salary range or market rates (e.g. "$90,000 - $130,000").
6. "topRegions": A list of 2-3 geographic locations or remote terms seeing the most job postings.

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
    
    const parsedData = JSON.parse(rawText.trim());
    return NextResponse.json(parsedData);
  } catch (err) {
    console.error('Market search API error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
