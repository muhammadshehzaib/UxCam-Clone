import { redirect } from 'next/navigation';

// Analytics page redirects to dashboard for MVP
export default function AnalyticsPage() {
  redirect('/dashboard');
}
