import { getInviteInfo } from '@/lib/api';
import InviteAcceptClient from './InviteAcceptClient';
import { InviteInfo } from '@/types';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <InviteAcceptClient token="" inviteInfo={null} error="No invite token provided." />
    );
  }

  let inviteInfo: InviteInfo | null = null;
  let error: string | undefined;

  try {
    inviteInfo = await getInviteInfo(token);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('expired'))  error = 'This invite has expired.';
      else if (e.message.includes('404')) error = 'Invite not found.';
      else                                error = 'This invite is no longer valid.';
    } else {
      error = 'Unable to load invite.';
    }
  }

  return (
    <InviteAcceptClient token={token} inviteInfo={inviteInfo} error={error} />
  );
}
