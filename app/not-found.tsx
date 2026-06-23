import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ paddingTop: 80, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>🧭</div>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Not found</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>That project or page isn&rsquo;t in the vault.</p>
      <Link href="/" className="back" style={{ display: "inline-flex" }}>← Back to Tracker</Link>
    </main>
  );
}
