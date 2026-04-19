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

  let projectId  = '';
  let apiKey     = '';
  let teamData   = { members: [], invites: [] } as { members: any[]; invites: any[] };
  let allProjects: any[] = [];
  let fetchError = '';

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
        projectId ? getTeamMembers(projectId, token) : Promise.resolve({ members: [], invites: [] }),
        getProjects(token),
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

      console.log(`[Dashboard] SettingsPage: token present, projectId=${projectId}, projectsFound=${allProjects.length}, apiKeyFound=${!!apiKey}`);
    } else {
      console.warn('[Dashboard] SettingsPage: No token found in cookies');
    }
  } catch (err: any) {
    console.error('SettingsPage data fetch error:', err);
    fetchError = err.message || String(err);
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
          <h1 className="text-2xl font-bold text-slate-900">
            Settings <span className="text-xs font-normal text-slate-400 ml-2">V4 - Debug</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your project team and configuration</p>
        </div>
      </div>

      {fetchError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <strong>Backend Connection Error:</strong> {fetchError}
          <p className="mt-1 text-xs opacity-70">Check dashboard logs for ECONNREFUSED details.</p>
        </div>
      )}

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
