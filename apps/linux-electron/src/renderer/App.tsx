import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { DiagnosticCheck, DiagnosticReport } from '../shared/diagnostics';
import './styles.css';

function statusLabel(status: DiagnosticCheck['status']): string {
  if (status === 'ok') return 'OK';
  if (status === 'warn') return 'WARN';
  return 'FAIL';
}

function DiagnosticsPanel(): JSX.Element {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function runDiagnostics(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const nextReport = await window.os1.diagnostics.run();
      setReport(nextReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run diagnostics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runDiagnostics();
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, DiagnosticCheck[]>();
    for (const check of report?.checks ?? []) {
      const existing = grouped.get(check.group) ?? [];
      existing.push(check);
      grouped.set(check.group, existing);
    }
    return Array.from(grouped.entries());
  }, [report]);

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Diagnostics</p>
          <h2>Linux readiness check</h2>
        </div>
        <button type="button" onClick={() => void runDiagnostics()} disabled={loading}>
          {loading ? 'Running…' : 'Run again'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {report ? (
        <div className="summary">
          <span>{report.platform}</span>
          <span>{report.arch}</span>
          <span>{new Date(report.generatedAt).toLocaleString()}</span>
        </div>
      ) : null}

      <div className="checks">
        {groups.map(([group, checks]) => (
          <div className="group" key={group}>
            <h3>{group}</h3>
            {checks.map((check) => (
              <article className={`check check-${check.status}`} key={check.id}>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.message}</p>
                  {check.fix ? <small>{check.fix}</small> : null}
                </div>
                <span>{statusLabel(check.status)}</span>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function App(): JSX.Element {
  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">OS¹</span>
          <div>
            <strong>OS1</strong>
            <small>Linux shell</small>
          </div>
        </div>

        <nav>
          <button className="active">Diagnostics</button>
          <button disabled>Connections</button>
          <button disabled>Terminal</button>
          <button disabled>Sessions</button>
          <button disabled>Files</button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="hero">
          <p className="eyebrow">Element Software · Orgo powered</p>
          <h1>OS1 Linux compatibility shell</h1>
          <p>
            Same OS1 direction. Electron, TypeScript, React, and Vite. First target: safe diagnostics before remote control.
          </p>
        </header>
        <DiagnosticsPanel />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
