import ContestPageContent from '@/components/contest/ContestPageContent';
import { PreviewMode } from '@/components/contest/DevContestPreviewBar';

export const dynamic = 'force-dynamic';

export default async function ContestPage({
  searchParams
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = searchParams ? await searchParams : {};
  const isDev = process.env.NODE_ENV !== 'production';
  const previewRaw = isDev && typeof params.preview === 'string' ? params.preview.toUpperCase() : undefined;
  const initialPreview: PreviewMode | undefined =
    previewRaw && ['LOCKED', 'LIVE', 'ENDED'].includes(previewRaw)
      ? (previewRaw as PreviewMode)
      : undefined;

  return <ContestPageContent initialPreview={initialPreview} />;
}
