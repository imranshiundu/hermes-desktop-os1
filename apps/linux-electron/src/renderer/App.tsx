import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { DiagnosticCheck, DiagnosticReport } from '../shared/diagnostics';
import type { CredentialName, CredentialStatus } from '../shared/credentials';
import type { OrgoVerificationResult, OrgoWorkspaceListResult } from '../shared/orgo';
import './styles.css';

function statusLabel(status: DiagnosticCheck['status']): string {
  if (status === 'ok') return 'OK';
  if (status === 'warn') return 'WARN';
  return 'FAIL';
}

function providerStatusLabel(status: OrgoVerificationResult['status']): string {
  if (status === 'ok') return 'OK';
  if (status === 'warn') return 'WARN';
  if (status === 'fail') return 'FAIL';
  return 'UNTESTED';
}

function credentialStatusLabel(status: CredentialStatus): string {
  if (!status.present) return 'MISSING';
  if (status.source === 'environment') return 'ENV';
  return 'SAVED';
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

function ProviderPanel(): JSX.Element {
  const [result, setResult] = useState<OrgoVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      setResult(await window.os1.orgo.verify());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify Orgo provider.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel compactPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Cloud provider</p>
          <h2>Orgo verification</h2>
        </div>
        <button type="button" onClick={() => void verify()} disabled={loading}>
          {loading ? 'Verifying…' : 'Verify Orgo'}
        </button>
      </div>

      <p className="muted">
        Orgo is the first cloud-computer provider. The architecture still allows future providers through the same controlled main-process boundary.
      </p>

      {error ? <p className="error">{error}</p> : null}

      <article className={`check check-${result?.status === 'ok' ? 'ok' : result?.status === 'fail' ? 'fail' : 'warn'}`}>
        <div>
          <strong>Provider status</strong>
          <p>{result?.message ?? 'Orgo has not been verified in this session.'}</p>
          {result?.endpointTried ? <small>Endpoint: {result.endpointTried}</small> : null}
        </div>
        <span>{providerStatusLabel(result?.status ?? 'untested')}</span>
      </article>
    </section>
  );
}

function WorkspacePanel(): JSX.Element {
  const [result, setResult] = useState<OrgoWorkspaceListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWorkspaces(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      setResult(await window.os1.orgo.listWorkspaces());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Orgo workspaces.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel compactPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Workspaces</p>
          <h2>Orgo workspaces</h2>
        </div>
        <button type="button" onClick={() => void loadWorkspaces()} disabled={loading}>
          {loading ? 'Loading…' : 'Load workspaces'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <article className={`check check-${result?.status === 'ok' ? 'ok' : result?.status === 'fail' ? 'fail' : 'warn'}`}>
        <div>
          <strong>Workspace status</strong>
          <p>{result?.message ?? 'No workspace request has been made yet.'}</p>
          {result?.endpointTried ? <small>Endpoint: {result.endpointTried}</small> : null}
        </div>
        <span>{providerStatusLabel(result?.status ?? 'untested')}</span>
      </article>

      {result?.workspaces.length ? (
        <div className="workspaceList">
          {result.workspaces.map((workspace) => (
            <article className="workspaceItem" key={workspace.id}>
              <strong>{workspace.name}</strong>
              <small>{workspace.id}</small>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CredentialsPanel(): JSX.Element {
  const [statuses, setStatuses] = useState<CredentialStatus[]>([]);
  const [values, setValues] = useState<Record<CredentialName, string>>({ orgo: '', openai: '' });
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    setError(null);
    try {
      setStatuses(await window.os1.credentials.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read credential status.');
    }
  }

  async function save(name: CredentialName): Promise<void> {
    setError(null);
    try {
      const next = await window.os1.credentials.save({ name, value: values[name] });
      setValues((current) => ({ ...current, [name]: '' }));
      setStatuses(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save credential.');
    }
  }

  async function remove(name: CredentialName): Promise<void> {
    setError(null);
    try {
      setStatuses(await window.os1.credentials.delete(name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove credential.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section className="panel compactPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Providers</p>
          <h2>Credential boundary</h2>
        </div>
        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      <p className="muted">
        Keys are submitted through preload IPC to the main process. The renderer receives status only, never raw saved values.
      </p>

      {error ? <p className="error">{error}</p> : null}

      <div className="credentialList">
        {statuses.map((status) => (
          <article className="credential" key={status.name}>
            <div className="credentialTop">
              <div>
                <strong>{status.label}</strong>
                <p>{status.message}</p>
              </div>
              <span className={status.present ? 'savedBadge' : 'missingBadge'}>{credentialStatusLabel(status)}</span>
            </div>

            <div className="credentialForm">
              <input
                type="password"
                value={values[status.name]}
                placeholder={`Paste ${status.label}`}
                onChange={(event) => setValues((current) => ({ ...current, [status.name]: event.target.value }))}
              />
              <button type="button" onClick={() => void save(status.name)} disabled={!values[status.name].trim()}>
                Save
              </button>
              <button type="button" onClick={() => void remove(status.name)} disabled={!status.present || status.source === 'environment'}>
                Remove
              </button>
            </div>
          </article>
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
          <button className="active">Providers</button>
          <button className="active">Workspaces</button>
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
        <CredentialsPanel />
        <ProviderPanel />
        <WorkspacePanel />
        <DiagnosticsPanel />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
