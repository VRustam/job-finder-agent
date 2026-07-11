import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY to your environment.' },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are an expert resume writer and technical recruiter.
Generate a complete, highly professional, realistic, and detailed resume matching the user's request.
Make the bullet points for work experience extremely detailed, quantitative, and professional.

User Request: "${prompt}"

Respond strictly with a JSON object matching this exact TypeScript structure:
{
  "personal": {
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "phone": "+1 (555) 019-2834",
    "website": "linkedin.com/in/janedoe",
    "summary": "Professional summary statement summarizing credentials and specialization."
  },
  "experience": [
    {
      "company": "Initech Systems",
      "position": "Lead Software Engineer",
      "startDate": "Jan 2022",
      "endDate": "Present",
      "description": "• Spearheaded migration of legacy systems to Next.js and Tailwind, reducing load times by 40%.\\n• Managed a team of 4 junior developers to deliver secure dashboard analytics."
    }
  ],
  "education": [
    {
      "school": "State Technical University",
      "degree": "Bachelor of Science in Computer Science",
      "startDate": "2015",
      "endDate": "2019",
      "description": "Graduated with honors. Specialized in Distributed Systems."
    }
  ],
  "skills": ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "System Design"],
  "projects": [
    {
      "name": "Open-Source E-Commerce Engine",
      "description": "Designed a serverless billing architecture handling up to 10k concurrent sessions using Redis.",
      "link": "github.com/example/ecommerce"
    }
  ]
}

Ensure the output is valid JSON. Do not wrap the JSON output in markdown tags (like \`\`\`json). Just return the raw JSON object string.
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
                text: systemPrompt,
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

    const generatedResume = JSON.parse(responseText.trim());
    return NextResponse.json(generatedResume);

  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error during resume generation' },
      { status: 500 }
    );
  }
}
