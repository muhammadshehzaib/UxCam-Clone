import { getTeamMembers } from '@/lib/api';
import TeamMembersList from '@/components/settings/TeamMembersList';
import InviteForm from '@/components/settings/InviteForm';
import { Settings } from 'lucide-react';
import { cookies } from 'next/headers';

export const revalidate = 0;

function getProjectIdFromCookie(cookieHeader: string | undefined): string {
  if (!cookieHeader) return '';
  try {
    const token = cookieHeader.split('; ').find((c) => c.startsWith('uxclone_token='))?.split('=').slice(1).join('=');
    if (!token) return '';
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(atob(parts[1])) as Record<string, string>;
    return payload.projectId ?? '';
  } catch { return ''; }
}

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('uxclone_token')?.value ?? '';
  let projectId = '';
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
      teamData = await getTeamMembers(projectId) as typeof teamData;
    }
  } catch { /* API not available */ }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings size={20} className="text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your project team</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-8">
        {/* Team members */}
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
    </div>
  );
}
