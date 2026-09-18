import Link from 'next/link';

export default function Home() {
  return (
    <div className="container landing-page">
      <div className="page-kicker">A quieter way to speak up</div>
      <h1>Small signals.<br />Safer places.</h1>
      <p className="subtitle">SafeSignal turns anonymous, place-based reports into useful patterns for the people who can respond.</p>
      <div className="landing-actions">
        <Link href="/report" className="report-orb" aria-label="Report a safety concern"><span aria-hidden="true">↗</span><strong>Report<br />a concern</strong></Link>
        <Link href="/dashboard" className="landing-secondary">Open authority dashboard <span aria-hidden="true">→</span></Link>
      </div>
      <div className="landing-notes">
        <div><strong>01</strong><span>No account needed</span></div>
        <div><strong>02</strong><span>No names collected</span></div>
        <div><strong>03</strong><span>Patterns, not profiles</span></div>
      </div>
    </div>
  );
}
