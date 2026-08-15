import FeedbackClient from './FeedbackClient';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Share Your Feedback | AWS Student Builder Group',
  description: 'Your feedback helps us improve our community events, workshops, and student experience.',
};

export default async function FeedbackPage() {
  const isPublished = await db.settings.getFeedbackPagePublished();
  return <FeedbackClient isPublished={isPublished} />;
}
