export default function DiagnosticTestPage() {
  return (
    <div style={{ padding: '50px', backgroundColor: '#ebf8ff', border: '5px solid #4299e1', borderRadius: '20px' }}>
      <h1 style={{ color: '#2b6cb0', fontSize: '32px', marginBottom: '10px' }}>ROUTING TEST SUCCESSFUL</h1>
      <p style={{ fontSize: '18px' }}>If you see this blue box, Next.js <strong>IS</strong> routing to the <code>sessions</code> folder correctly.</p>
      <p style={{ marginTop: '20px' }}>Path: <code>/sessions/diagnostic-test</code></p>
    </div>
  );
}
