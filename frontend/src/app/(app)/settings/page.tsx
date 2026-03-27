import { getTeamMembers, getWebhooks } from '@/lib/api';
import TeamMembersList from '@/components/settings/TeamMembersList';
import InviteForm from '@/components/settings/InviteForm';
import ApiKeyCard from '@/components/settings/ApiKeyCard';
import WebhooksList from '@/components/settings/WebhooksList';
import WebhookForm from '@/components/settings/WebhookForm';
import ReportSubscriptions from '@/components/settings/ReportSubscriptions';
import { Settings } from 'lucide-react';
import { cookies } from 'next/headers';

export const revalidate = 0;

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('uxclone_token')?.value ?? '';

  let projectId  = '';
  let apiKey     = '';

  try {
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const p = JSON.parse(atob(parts[1])) as Record<string, string>;
        projectId = p.projectId ?? '';
      }
    }
  } catch { /* ignore */ }

  let teamData = { members: [], invites: [] } as { members: never[]; invites: never[] };
  try {
    if (projectId) {
      // Fetch both team and project info in parallel
      const [team] = await Promise.all([
        getTeamMembers(projectId),
      ]);
      teamData = team as typeof teamData;
    }
  } catch { /* API not available */ }

  // Extract api_key from ProjectSwitcher data (it's in the JWT project context)
  // For display we read it from the projects list in the sidebar — here we just show placeholder
  // The actual key comes from the API via ProjectSwitcher state; for settings we show via API
  try {
    const res = await fetch(
      `${process.env.API_URL ?? 'http://localhost:3001'}/api/v1/projects`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    );
    if (res.ok) {
      const body = await res.json() as { data: Array<{ id: string; api_key: string }> };
      const project = body.data.find((p) => p.id === projectId);
      apiKey = project?.api_key ?? '';
    }
  } catch { /* ignore */ }

  let webhooks: import('@/types').Webhook[] = [];
  try {
    if (projectId) webhooks = await getWebhooks();
  } catch { /* ignore */ }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings size={20} className="text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your project team and configuration</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Team members */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-8">
          <TeamMembersList
            projectId={projectId}
            members={teamData.members}
            invites={teamData.invites}
            currentUserId=""
          />
          <div className="border-t border-slate-100 pt-6">
            <InviteForm projectId={projectId} />
          </div>
        </div>

        {/* API Key */}
        {apiKey && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <ApiKeyCard projectId={projectId} initialKey={apiKey} />
          </div>
        )}

        {/* Webhooks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <WebhooksList webhooks={webhooks} />
          <div className="border-t border-slate-100 pt-6">
            <WebhookForm projectId={projectId} />
          </div>
        </div>

        {/* Email Reports */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ReportSubscriptions projectId={projectId} reports={[]} />
        </div>
      </div>
    </div>
  );
}
