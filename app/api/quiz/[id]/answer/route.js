import { checkAnswer } from '@/lib/quizStore';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { roundIndex, answer } = body;

    if (roundIndex === undefined || !answer) {
      return Response.json(
        { error: 'roundIndex and answer are required' },
        { status: 400 }
      );
    }

    const result = checkAnswer(id, roundIndex, answer);

    if (!result) {
      return Response.json(
        { error: 'Quiz not found or invalid round' },
        { status: 404 }
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error checking answer:', error);
    return Response.json({ error: 'Failed to check answer' }, { status: 500 });
  }
}
