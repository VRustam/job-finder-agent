import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { resume, jobDescription } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing resume content or job description' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return high-quality, relevant mock data if no Gemini key is provided yet.
      // We parse the job description for common tech keywords to make it feel realistic.
      const jdLower = jobDescription.toLowerCase();
      const detectedKeywords: string[] = [];
      const commonTechKeywords = [
        'next.js', 'react', 'typescript', 'tailwind', 'supabase', 'postgresql', 
        'graphql', 'docker', 'node.js', 'kubernetes', 'aws', 'ci/cd', 'git'
      ];
      
      commonTechKeywords.forEach(kw => {
        if (jdLower.includes(kw) && !JSON.stringify(resume).toLowerCase().includes(kw)) {
          detectedKeywords.push(kw.charAt(0).toUpperCase() + kw.slice(1));
        }
      });

      // Default keywords if none matched
      if (detectedKeywords.length === 0) {
        detectedKeywords.push('ATS Optimization', 'Performance Analytics', 'Microservices');
      }

      // Generate a mock matching score
      const matchPercentage = Math.floor(Math.random() * (90 - 50 + 1)) + 50;

      const mockResponse = {
        score: matchPercentage,
        missingKeywords: detectedKeywords,
        suggestedRewrites: [
          {
            original: resume.personal.summary ? resume.personal.summary.substring(0, 80) + '...' : 'Built web applications.',
            suggested: 'Spearheaded full-stack development using modern reactive frameworks, increasing deployment velocity by 25% and improving lighthouse scores.',
            rationale: 'Incorporates action verbs and concrete metrics which appeal to ATS scanners and hiring managers.'
          },
          {
            original: resume.skills && resume.skills.length > 0 ? `Proficient in ${resume.skills.slice(0, 3).join(', ')}.` : 'Worked with frontend coding.',
            suggested: `Engineered scalable architectures with ${detectedKeywords.slice(0, 2).join(' and ') || 'modern libraries'} aligning strictly with industry design patterns.`,
            rationale: 'Demonstrates application of missing tech keywords inside an active project context.'
          }
        ]
      };

      return NextResponse.json(mockResponse);
    }

    // Call Gemini API
    const prompt = `
You are an expert ATS (Applicant Tracking System) optimizer and hiring director.
Analyze the following resume JSON and job description. Suggest optimizations to improve keyword match and overall impact.

Resume JSON:
${JSON.stringify(resume, null, 2)}

Job Description:
${jobDescription}

Respond strictly with a JSON object in this exact format, with no extra text or Markdown formatting:
{
  "score": 85,
  "missingKeywords": ["Next.js", "CI/CD"],
  "suggestedRewrites": [
    {
      "original": "Worked on frontend features.",
      "suggested": "Architected performant React features and Next.js static pathways, improving user retention by 15%.",
      "rationale": "Uses strong action verbs and links it to missing keywords and metrics."
    }
  ]
}
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

    const resultJson = JSON.parse(responseText.trim());
    return NextResponse.json(resultJson);

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error during optimization' },
      { status: 500 }
    );
  }
}
