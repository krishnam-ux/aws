import ExamPortalPage from '../page';

export default async function DynamicExamPortalPage({
  params
}: {
  params: Promise<{ examId: string }>;
}) {
  const resolvedParams = await params;
  return <ExamPortalPage initialExamId={resolvedParams?.examId} />;
}
