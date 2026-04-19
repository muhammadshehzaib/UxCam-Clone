import { getSession, getSessionEvents } from '@/lib/api';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

interface Props {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ seek?: string; from?: string }>;
}

export const revalidate = 0;

export default async function SessionReplayPage({ params, searchParams }: Props) {
  // DIAGNOSTIC LOG AT VERY TOP
  console.log('!!! REPLAY PAGE ENTERED !!!');

  let id = 'UNKNOWN';
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    console.log(`[Dashboard] Diagnostic: ID resolved as ${id}`);
  } catch (err) {
    console.error('[Dashboard] Diagnostic: Failed to resolve params!', err);
  }

  return (
    <div style={{ padding: '50px', backgroundColor: '#f0fff4', border: '5px solid #48bb78', borderRadius: '20px' }}>
      <h1 style={{ color: '#2f855a', fontSize: '32px', marginBottom: '10px' }}>HELLO WORLD - REPLAY PAGE</h1>
      <p style={{ fontSize: '18px' }}>If you see this big green box, the routing is <strong>WORKING</strong>.</p>
      <p style={{ fontFamily: 'monospace', marginTop: '20px' }}>Session ID: {id}</p>
      <hr style={{ margin: '20px 0' }} />
      <div style={{ color: '#718096', fontSize: '14px' }}>
        Checking logs in terminal for: <code>!!! REPLAY PAGE ENTERED !!!</code>
      </div>
    </div>
  );
}
