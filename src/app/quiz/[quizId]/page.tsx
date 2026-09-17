import WeeklyQuizPage from '../page';

export default async function DynamicWeeklyQuizPage({
  params
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  return <WeeklyQuizPage />;
}
