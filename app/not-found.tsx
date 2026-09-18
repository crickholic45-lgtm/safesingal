export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', background: '#f7efe8', color: '#1f2433', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 12, color: '#8d5a4d' }}>SafeSignal</p>
        <h1 style={{ margin: '0.5rem 0 0.75rem', fontSize: 'clamp(2.1rem, 5vw, 3rem)' }}>Page not found</h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#495268' }}>
          The page you requested does not exist, or it may have moved.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            background: '#d96745',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 999,
            padding: '0.85rem 1.4rem',
            fontWeight: 700,
          }}
        >
          Back to home
        </a>
      </div>
    </main>
  );
}
