import { getTeamMembers, getWebhooks, getProjects } from '@/lib/api';
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

  let teamData = { members: [], invites: [] } as { members: any[]; invites: any[] };
  let allProjects: any[] = [];

  try {
    if (token) {
      // Robust decoding for both JWT and static dev tokens
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const p = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          projectId = p.projectId ?? '';
        }
      } catch (e) {
        console.warn('Failed to decode JWT, might be a static token');
      }

      // Fetch team and projects
      const [team, projects] = await Promise.all([
        projectId ? getTeamMembers(projectId) : Promise.resolve({ members: [], invites: [] }),
        getProjects(),
      ]);

      teamData = team as any;
      allProjects = projects || [];

      // If no projectId found in token yet, but we have projects, pick the first one
      if (!projectId && allProjects.length > 0) {
        projectId = allProjects[0].id;
      }

      // Find the API key for the current project
      const currentProject = allProjects.find((p) => p.id === projectId);
      apiKey = currentProject?.api_key ?? '';
    } else {
      console.warn('No token found in cookies');
    }
  } catch (err) {
    console.error('SettingsPage data fetch error:', err);
  }

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
