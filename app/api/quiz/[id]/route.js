import { getQuizForPlayer } from '@/lib/quizStore';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const quiz = getQuizForPlayer(id);

    if (!quiz) {
      return Response.json({ error: 'Quiz not found or expired' }, { status: 404 });
    }

    return Response.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return Response.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}
