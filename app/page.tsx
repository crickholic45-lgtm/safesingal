import Link from 'next/link';

export default function Home() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 100 }}>
      <h1>SafeSignal</h1>
      <p className="subtitle">Anonymous micro-reporting for emerging safety patterns.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 30 }}>
        <Link href="/report" className="submit-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
          Report a moment
        </Link>
        <Link
          href="/dashboard"
          className="submit-btn"
          style={{ textDecoration: 'none', textAlign: 'center', background: '#2c3050', color: '#f4f4f8' }}
        >
          Authority dashboard
        </Link>
      </div>
    </div>
  );
}
