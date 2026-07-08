import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { resume, jobTitle, companyName, tone } = await request.json();

    if (!resume || !jobTitle || !companyName) {
      return NextResponse.json(
        { error: 'Missing resume, job title, or company name' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const selectedTone = tone || 'Professional';

    if (!apiKey) {
      // Fallback to high-quality template email if no Gemini key is provided yet
      const candidateName = resume.personal?.name || 'Applicant';
      const skillsList = resume.skills?.slice(0, 3).join(', ') || 'software development';
      
      const mockEmail = `Subject: Inquiry: ${jobTitle} Role at ${companyName} - ${candidateName}

Dear Hiring Team at ${companyName},

I hope this email finds you well.

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. With my background in technology and my experience working with key stacks like ${skillsList}, I am confident in my ability to contribute value to your engineering department.

${resume.personal?.summary ? `My professional summary aligns directly with what you are seeking:\n"${resume.personal.summary}"` : `I have built multiple reactive projects utilizing clean code structures and modern web standard practices.`}

I would welcome the opportunity to discuss how my qualifications align with the requirements of the ${jobTitle} role. I have attached my resume for your review.

Thank you for your time and consideration.

Best regards,

${candidateName}
${resume.personal?.email || ''}
${resume.personal?.phone || ''}
${resume.personal?.socialLinks?.[0]?.url || ''}
`;

      return NextResponse.json({ emailText: mockEmail });
    }

    // Call Gemini API
    const systemPrompt = `
You are an expert copywriter and career coach.
Write a highly targeted, compelling, and personalized cold outreach email from a candidate to a recruiter or hiring manager at a company.

Candidate Resume Details:
${JSON.stringify(resume, null, 2)}

Target Job:
- Position: ${jobTitle}
- Company: ${companyName}
- Desired Tone: ${selectedTone} (e.g. Professional, Casual, Confident, Enthusiastic)

Instructions:
1. Write a clean Subject line at the very top starting with "Subject: ".
2. Reference specific skills and experiences from the candidate's resume that are highly relevant to a ${jobTitle}.
3. Keep the email concise, professional, and clear.
4. Adapt the tone to match "${selectedTone}".
5. Do not include placeholders like "[Your Name]" or "[Date]" — fill them in using the candidate's details from the resume. If email, phone, or name are missing, omit them gracefully.
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

    return NextResponse.json({ emailText: responseText.trim() });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error during email generation' },
      { status: 500 }
    );
  }
}
