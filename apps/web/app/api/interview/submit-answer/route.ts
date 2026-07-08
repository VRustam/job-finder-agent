import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, questionId, questionText, userAnswer } = await request.json();

    if (!sessionId || !questionId || !questionText || userAnswer === undefined) {
      return NextResponse.json(
        { error: 'Missing required evaluation fields' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    // 1. Fetch current session details
    const { data: session, error: dbError } = await supabase
      .from('interview_sessions')
      .select('questions, answers')
      .eq('id', sessionId)
      .single();

    if (dbError || !session) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 });
    }

    const currentAnswers = session.answers || [];

    // 2. Call Gemini to evaluate the answer
    const prompt = `
You are an expert technical and behavioral interviewer.
Evaluate the candidate's response to the following interview question:

Question: "${questionText}"
Candidate's Answer:
"${userAnswer || '(No answer provided)'}"

Evaluation Instructions:
- Score the response strictly on a scale of 0 to 100.
- Be constructive. Highlight strengths and explicitly state what was missing (e.g. lack of metric results, missing technical specifics, or poor structure like neglecting STAR method).
- Provide a perfect, professional, and high-scoring suggested response that the candidate could have given instead.
- Do NOT include any markdown wrappers or text explanations outside the JSON block. Return strictly a JSON object.

Respond with a JSON object of this exact schema:
{
  "score": 85,
  "feedback": "Your response started off strong by...",
  "suggestedAnswer": "A perfect response would look like..."
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
      throw new Error('Empty response from Gemini evaluation');
    }

    const evaluated = JSON.parse(responseText.trim());

    // 3. Update the session answers array
    const newAnswerItem = {
      questionId,
      questionText,
      userAnswer,
      score: evaluated.score,
      feedback: evaluated.feedback,
      suggestedAnswer: evaluated.suggestedAnswer
    };

    const updatedAnswers = [...currentAnswers.filter((a: any) => a.questionId !== questionId), newAnswerItem];

    // Check if session is finished
    const totalQuestions = (session.questions as any[]).length;
    const isFinished = updatedAnswers.length >= totalQuestions;
    let overallScore = null;

    if (isFinished) {
      const sum = updatedAnswers.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
      overallScore = Math.round(sum / updatedAnswers.length);
    }

    // 4. Update row in database
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        answers: updatedAnswers,
        overall_score: overallScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return NextResponse.json({
      score: evaluated.score,
      feedback: evaluated.feedback,
      suggestedAnswer: evaluated.suggestedAnswer,
      isFinished
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
