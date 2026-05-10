import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ConnectionInput, ConnectionProfile, ConnectionStoreSnapshot } from '../shared/connections';
import type { DiagnosticCheck, DiagnosticReport } from '../shared/diagnostics';
import type { CredentialName, CredentialStatus } from '../shared/credentials';
import type { OrgoComputer, OrgoComputerListResult, OrgoVerificationResult, OrgoWorkspaceListResult } from '../shared/orgo';
import type { TerminalSessionState } from '../shared/terminal';
import './styles.css';

type AppSection =
  | 'connections'
  | 'overview'
  | 'sessions'
  | 'cronjobs'
  | 'kanban'
  | 'files'
  | 'usage'
  | 'skills'
  | 'knowledge'
  | 'desktop'
  | 'mail'
  | 'messaging'
  | 'connectors'
  | 'providers'
  | 'doctor'
  | 'terminal'
  | 'voice'
  | 'boot';

const sections: Array<{ id: AppSection; title: string; icon: string; status: 'live' | 'next' }> = [
  { id: 'connections', title: 'Connections', icon: '⌁', status: 'live' },
  { id: 'overview', title: 'Overview', icon: '⌘', status: 'live' },
  { id: 'sessions', title: 'Sessions', icon: '◷', status: 'next' },
  { id: 'cronjobs', title: 'Cron Jobs', icon: '↻', status: 'next' },
  { id: 'kanban', title: 'Kanban', icon: '▦', status: 'next' },
  { id: 'files', title: 'Files', icon: '▤', status: 'next' },
  { id: 'usage', title: 'Usage', icon: '◇', status: 'next' },
  { id: 'skills', title: 'Skills', icon: '✦', status: 'next' },
  { id: 'knowledge', title: 'Knowledge Base', icon: '◫', status: 'next' },
  { id: 'desktop', title: 'Desktop', icon: '▣', status: 'next' },
  { id: 'mail', title: 'Mail', icon: '✉', status: 'next' },
  { id: 'messaging', title: 'Messaging', icon: '✦', status: 'next' },
  { id: 'connectors', title: 'Connectors', icon: '⛓', status: 'next' },
  { id: 'providers', title: 'Providers', icon: '◆', status: 'live' },
  { id: 'doctor', title: 'Doctor', icon: '✓', status: 'live' },
  { id: 'terminal', title: 'Terminal', icon: '›_', status: 'live' },
  { id: 'voice', title: 'Voice mode', icon: '◌', status: 'next' },
  { id: 'boot', title: 'Boot animation', icon: '▧', status: 'next' },
];

const emptyConnectionForm: ConnectionInput = {
  label: '',
  kind: 'ssh',
  sshAlias: '',
  host: '',
  user: '',
  port: undefined,
  hermesProfile: 'default',
  remoteHermesHome: '~/.hermes',
  orgoWorkspaceId: '',
  orgoComputerId: '',
};

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

function bootError(message: string): void {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:#f6f3ee;color:#1f1f1f;font-family:Inter,system-ui,sans-serif;"><section style="max-width:620px;padding:32px;"><p style="margin:0 0 10px;color:#9d2828;text-transform:uppercase;letter-spacing:.13em;font-size:12px;font-weight:800;">OS1 renderer error</p><h1 style="margin:0 0 12px;font-size:42px;line-height:.95;letter-spacing:-.06em;">Renderer failed to mount</h1><pre style="white-space:pre-wrap;background:rgba(185,45,45,.1);border-radius:12px;padding:16px;line-height:1.5;">${message.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char)}</pre></section></main>`;
}

function Field({ label, children }: { label: string; children: JSX.Element }): JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ConnectionsView({
  snapshot,
  onRefresh,
  onSaved,
}: {
  snapshot: ConnectionStoreSnapshot | null;
  onRefresh: () => Promise<void>;
  onSaved: (snapshot: ConnectionStoreSnapshot) => void;
}): JSX.Element {
  const [form, setForm] = useState<ConnectionInput>(emptyConnectionForm);
  const [selectedId, setSelectedId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const connections = snapshot?.connections ?? [];
  const selected = connections.find((connection) => connection.id === selectedId) ?? snapshot?.activeConnection ?? connections[0];

  useEffect(() => {
    setSelectedId(snapshot?.activeConnectionId ?? connections[0]?.id ?? '');
  }, [snapshot?.activeConnectionId, connections.length]);

  function editConnection(connection: ConnectionProfile): void {
    setSelectedId(connection.id);
    setForm({ ...connection });
  }

  async function save(): Promise<void> {
    setBusy(true);
    setStatus('');
    try {
      const next = await window.os1.connections.save(form);
      onSaved(next);
      setForm(emptyConnectionForm);
      setStatus('Connection saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save connection.');
    } finally {
      setBusy(false);
    }
  }

  async function makeActive(id: string): Promise<void> {
    const next = await window.os1.connections.setActive(id);
    onSaved(next);
    setSelectedId(id);
  }

  async function remove(id: string): Promise<void> {
    const next = await window.os1.connections.delete(id);
    onSaved(next);
  }

  async function test(id: string): Promise<void> {
    setBusy(true);
    try {
      const result = await window.os1.connections.test(id);
      setStatus(result.detail ? `${result.message} ${result.detail}` : result.message);
      await onRefresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to test connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workbench twoColumnWorkbench">
      <aside className="sectionBrowser">
        <div className="browserHeader">
          <p>Connections</p>
          <button type="button" onClick={() => setForm(emptyConnectionForm)}>New</button>
        </div>
        <div className="browserList">
          {connections.length === 0 ? <p className="emptyState">No saved connections yet.</p> : null}
          {connections.map((connection) => (
            <button
              className={`browserRow ${selected?.id === connection.id ? 'selected' : ''}`}
              key={connection.id}
              type="button"
              onClick={() => editConnection(connection)}
            >
              <strong>{connection.label}</strong>
              <span>{connection.kind === 'ssh' ? connection.sshAlias || connection.host : connection.orgoComputerId}</span>
              <small>{connection.lastStatus.toUpperCase()}</small>
            </button>
          ))}
        </div>
      </aside>

      <div className="detailPane">
        <header className="detailHeader">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Connections</h1>
            <p>Add SSH and Orgo computer targets. This matches the macOS section flow: browser left, selected detail right.</p>
          </div>
          <button type="button" onClick={() => void onRefresh()}>Refresh</button>
        </header>

        <div className="connectionGrid">
          <section className="panel flatPanel">
            <div className="panelHeader compactHeader">
              <div>
                <p className="eyebrow">Profile</p>
                <h2>{form.id ? 'Edit connection' : 'New connection'}</h2>
              </div>
              <button type="button" onClick={() => void save()} disabled={busy || !form.label.trim()}>{busy ? 'Saving…' : 'Save'}</button>
            </div>

            <div className="formGrid">
              <Field label="Label">
                <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Production box" />
              </Field>
              <Field label="Transport">
                <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as ConnectionInput['kind'] }))}>
                  <option value="ssh">SSH</option>
                  <option value="orgo">Orgo</option>
                </select>
              </Field>
              {form.kind === 'ssh' ? (
                <>
                  <Field label="SSH alias"><input value={form.sshAlias ?? ''} onChange={(event) => setForm((current) => ({ ...current, sshAlias: event.target.value }))} placeholder="my-server" /></Field>
                  <Field label="Host"><input value={form.host ?? ''} onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))} placeholder="10.0.0.5" /></Field>
                  <Field label="User"><input value={form.user ?? ''} onChange={(event) => setForm((current) => ({ ...current, user: event.target.value }))} placeholder="ubuntu" /></Field>
                  <Field label="Port"><input type="number" value={form.port ?? ''} onChange={(event) => setForm((current) => ({ ...current, port: event.target.value ? Number(event.target.value) : undefined }))} placeholder="22" /></Field>
                </>
              ) : (
                <>
                  <Field label="Workspace id"><input value={form.orgoWorkspaceId ?? ''} onChange={(event) => setForm((current) => ({ ...current, orgoWorkspaceId: event.target.value }))} placeholder="workspace id" /></Field>
                  <Field label="Computer id"><input value={form.orgoComputerId ?? ''} onChange={(event) => setForm((current) => ({ ...current, orgoComputerId: event.target.value }))} placeholder="computer id" /></Field>
                </>
              )}
              <Field label="Hermes profile"><input value={form.hermesProfile ?? ''} onChange={(event) => setForm((current) => ({ ...current, hermesProfile: event.target.value }))} placeholder="default" /></Field>
              <Field label="Hermes home"><input value={form.remoteHermesHome ?? ''} onChange={(event) => setForm((current) => ({ ...current, remoteHermesHome: event.target.value }))} placeholder="~/.hermes" /></Field>
            </div>
            {status ? <p className="notice">{status}</p> : null}
          </section>

          <section className="panel flatPanel">
            <div className="panelHeader compactHeader">
              <div>
                <p className="eyebrow">Selected</p>
                <h2>{selected?.label ?? 'No connection'}</h2>
              </div>
              {selected ? <span className="pill">{selected.lastStatus.toUpperCase()}</span> : null}
            </div>
            {selected ? (
              <div className="facts">
                <p><strong>Type</strong><span>{selected.kind.toUpperCase()}</span></p>
                <p><strong>Target</strong><span>{selected.kind === 'ssh' ? selected.sshAlias || selected.host : selected.orgoComputerId}</span></p>
                <p><strong>Profile</strong><span>{selected.hermesProfile || 'default'}</span></p>
                <p><strong>Message</strong><span>{selected.lastMessage}</span></p>
                <div className="buttonRow splitButtons">
                  <button type="button" onClick={() => void makeActive(selected.id)}>Use</button>
                  <button type="button" onClick={() => void test(selected.id)} disabled={busy}>Test</button>
                  <button type="button" onClick={() => remove(selected.id)}>Delete</button>
                </div>
              </div>
            ) : <p className="emptyState">Create a connection to unlock the rest of the workspace.</p>}
          </section>
        </div>
      </div>
    </section>
  );
}

function DiagnosticsPanel(): JSX.Element {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function runDiagnostics(): Promise<void> {
    setLoading(true);
    setError(null);
    try { setReport(await window.os1.diagnostics.run()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to run diagnostics.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void runDiagnostics(); }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, DiagnosticCheck[]>();
    for (const check of report?.checks ?? []) grouped.set(check.group, [...(grouped.get(check.group) ?? []), check]);
    return Array.from(grouped.entries());
  }, [report]);

  return (
    <section className="panel flatPanel">
      <div className="panelHeader"><div><p className="eyebrow">Doctor</p><h2>Linux readiness check</h2></div><button type="button" onClick={() => void runDiagnostics()} disabled={loading}>{loading ? 'Running…' : 'Run again'}</button></div>
      {error ? <p className="error">{error}</p> : null}
      {report ? <div className="summary"><span>{report.platform}</span><span>{report.arch}</span><span>{new Date(report.generatedAt).toLocaleString()}</span></div> : null}
      <div className="checks">{groups.map(([group, checks]) => <div className="group" key={group}><h3>{group}</h3>{checks.map((check) => <article className={`check check-${check.status}`} key={check.id}><div><strong>{check.label}</strong><p>{check.message}</p>{check.fix ? <small>{check.fix}</small> : null}</div><span>{statusLabel(check.status)}</span></article>)}</div>)}</div>
    </section>
  );
}

function ProviderPanel(): JSX.Element {
  const [result, setResult] = useState<OrgoVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function verify(): Promise<void> { setLoading(true); setError(null); try { setResult(await window.os1.orgo.verify()); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to verify Orgo provider.'); } finally { setLoading(false); } }
  return <section className="panel flatPanel"><div className="panelHeader"><div><p className="eyebrow">Cloud provider</p><h2>Orgo verification</h2></div><button type="button" onClick={() => void verify()} disabled={loading}>{loading ? 'Verifying…' : 'Verify Orgo'}</button></div><p className="muted">Orgo is the first cloud-computer provider. Future providers should use the same controlled main-process boundary.</p>{error ? <p className="error">{error}</p> : null}<article className={`check check-${result?.status === 'ok' ? 'ok' : result?.status === 'fail' ? 'fail' : 'warn'}`}><div><strong>Provider status</strong><p>{result?.message ?? 'Orgo has not been verified in this session.'}</p>{result?.endpointTried ? <small>Endpoint: {result.endpointTried}</small> : null}</div><span>{providerStatusLabel(result?.status ?? 'untested')}</span></article></section>;
}

function WorkspacePanel({ onSelectWorkspace }: { onSelectWorkspace: (workspaceId: string) => void }): JSX.Element {
  const [result, setResult] = useState<OrgoWorkspaceListResult | null>(null);
  const [loading, setLoading] = useState(false);
  async function loadWorkspaces(): Promise<void> { setLoading(true); try { const next = await window.os1.orgo.listWorkspaces(); setResult(next); const first = next.workspaces[0]?.id ?? ''; if (first) onSelectWorkspace(first); } finally { setLoading(false); } }
  return <section className="panel flatPanel"><div className="panelHeader"><div><p className="eyebrow">Workspaces</p><h2>Orgo workspaces</h2></div><button type="button" onClick={() => void loadWorkspaces()} disabled={loading}>{loading ? 'Loading…' : 'Load workspaces'}</button></div><article className={`check check-${result?.status === 'ok' ? 'ok' : result?.status === 'fail' ? 'fail' : 'warn'}`}><div><strong>Workspace status</strong><p>{result?.message ?? 'No workspace request has been made yet.'}</p></div><span>{providerStatusLabel(result?.status ?? 'untested')}</span></article></section>;
}

function ComputersPanel({ workspaceId, onSelectComputer }: { workspaceId: string; onSelectComputer: (computer: OrgoComputer) => void }): JSX.Element {
  const [result, setResult] = useState<OrgoComputerListResult | null>(null);
  const [loading, setLoading] = useState(false);
  async function loadComputers(): Promise<void> { setLoading(true); try { setResult(await window.os1.orgo.listComputers({ workspaceId: workspaceId || undefined })); } finally { setLoading(false); } }
  return <section className="panel flatPanel"><div className="panelHeader"><div><p className="eyebrow">Computers</p><h2>Orgo computers</h2></div><button type="button" onClick={() => void loadComputers()} disabled={loading}>{loading ? 'Loading…' : 'Load computers'}</button></div><p className="muted">Selected workspace: {workspaceId || 'none yet.'}</p><article className={`check check-${result?.status === 'ok' ? 'ok' : result?.status === 'fail' ? 'fail' : 'warn'}`}><div><strong>Computer status</strong><p>{result?.message ?? 'No computer request has been made yet.'}</p></div><span>{providerStatusLabel(result?.status ?? 'untested')}</span></article>{result?.computers.length ? <div className="workspaceList">{result.computers.map((computer) => <button className="workspaceItem selectableItem" key={computer.id} type="button" onClick={() => onSelectComputer(computer)}><strong>{computer.name}</strong><small>{computer.id}</small></button>)}</div> : null}</section>;
}

function TerminalPanel({ session, onConnect, onDisconnect }: { session: TerminalSessionState; onConnect: () => void; onDisconnect: () => void }): JSX.Element {
  return <section className="panel flatPanel terminalPanel"><div className="panelHeader"><div><p className="eyebrow">Terminal</p><h2>Session scaffold</h2></div><div className="buttonRow"><button type="button" onClick={onConnect} disabled={!session.target}>Connect</button><button type="button" onClick={onDisconnect}>Disconnect</button></div></div><article className="terminalSurface"><div className="terminalLine">Status: {session.status}</div><div className="terminalLine">Message: {session.message}</div>{session.target ? <div className="terminalLine">Target: {session.target.displayName}</div> : null}</article></section>;
}

function CredentialsPanel(): JSX.Element {
  const [statuses, setStatuses] = useState<CredentialStatus[]>([]);
  const [values, setValues] = useState<Record<CredentialName, string>>({ orgo: '', openai: '' });
  const [error, setError] = useState<string | null>(null);
  async function refresh(): Promise<void> { setError(null); try { setStatuses(await window.os1.credentials.list()); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read credential status.'); } }
  async function save(name: CredentialName): Promise<void> { setError(null); try { const next = await window.os1.credentials.save({ name, value: values[name] }); setValues((current) => ({ ...current, [name]: '' })); setStatuses(next); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save credential.'); } }
  async function remove(name: CredentialName): Promise<void> { setError(null); try { setStatuses(await window.os1.credentials.delete(name)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to remove credential.'); } }
  useEffect(() => { void refresh(); }, []);
  return <section className="panel flatPanel"><div className="panelHeader"><div><p className="eyebrow">Providers</p><h2>Credential boundary</h2></div><button type="button" onClick={() => void refresh()}>Refresh</button></div>{error ? <p className="error">{error}</p> : null}<div className="credentialList">{statuses.map((status) => <article className="credential" key={status.name}><div className="credentialTop"><div><strong>{status.label}</strong><p>{status.message}</p></div><span className={status.present ? 'savedBadge' : 'missingBadge'}>{credentialStatusLabel(status)}</span></div><div className="credentialForm"><input type="password" value={values[status.name]} placeholder={`Paste ${status.label}`} onChange={(event) => setValues((current) => ({ ...current, [status.name]: event.target.value }))} /><button type="button" onClick={() => void save(status.name)} disabled={!values[status.name].trim()}>Save</button><button type="button" onClick={() => void remove(status.name)} disabled={!status.present || status.source === 'environment'}>Remove</button></div></article>)}</div></section>;
}

function PlaceholderView({ section }: { section: AppSection }): JSX.Element {
  const meta = sections.find((item) => item.id === section);
  return <section className="workbench"><div className="detailPane singlePane"><header className="detailHeader"><div><p className="eyebrow">Parity queue</p><h1>{meta?.title ?? section}</h1><p>This section is now visible in the Linux shell and reserved for the macOS parity build. We wire it one feature at a time instead of hiding it behind disabled buttons.</p></div></header><section className="panel flatPanel"><h2>Implementation status</h2><p className="muted">Next pass: port the real data contract, then the section browser, then the action flow. No fake backend data will be added.</p></section></div></section>;
}

function Overview({ children }: { children: JSX.Element[] | JSX.Element }): JSX.Element {
  return <section className="workbench"><div className="detailPane singlePane"><header className="detailHeader"><div><p className="eyebrow">Element Software · Orgo powered</p><h1>Hermes Desktop Linux</h1><p>MacOS-style workspace shell: left section list, active connection context, and detail views on the right.</p></div></header><div className="stack">{children}</div></div></section>;
}

function App(): JSX.Element {
  const [selectedSection, setSelectedSection] = useState<AppSection>('connections');
  const [connections, setConnections] = useState<ConnectionStoreSnapshot | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [terminalSession, setTerminalSession] = useState<TerminalSessionState>({ status: 'idle', message: 'Select a computer to prepare a terminal session.', updatedAt: new Date().toISOString() });

  async function refreshConnections(): Promise<void> { setConnections(await window.os1.connections.list()); }

  useEffect(() => { void refreshConnections(); window.os1.terminal.get().then(setTerminalSession).catch(() => undefined); }, []);

  async function selectComputer(computer: OrgoComputer): Promise<void> {
    setTerminalSession(await window.os1.terminal.prepare({ target: { provider: 'orgo', computerId: computer.id, workspaceId: computer.workspaceId || selectedWorkspaceId || undefined, displayName: computer.name, transport: 'orgo-websocket' } }));
  }

  function activeContent(): JSX.Element {
    if (selectedSection === 'connections') return <ConnectionsView snapshot={connections} onRefresh={refreshConnections} onSaved={setConnections} />;
    if (selectedSection === 'overview') return <Overview><WorkspacePanel onSelectWorkspace={setSelectedWorkspaceId} /><ComputersPanel workspaceId={selectedWorkspaceId} onSelectComputer={(computer) => void selectComputer(computer)} /></Overview>;
    if (selectedSection === 'providers') return <Overview><CredentialsPanel /><ProviderPanel /></Overview>;
    if (selectedSection === 'doctor') return <Overview><DiagnosticsPanel /></Overview>;
    if (selectedSection === 'terminal') return <Overview><TerminalPanel session={terminalSession} onConnect={() => window.os1.terminal.connect().then(setTerminalSession)} onDisconnect={() => window.os1.terminal.disconnect().then(setTerminalSession)} /></Overview>;
    return <PlaceholderView section={selectedSection} />;
  }

  return (
    <main className="appShell macShell">
      <aside className="sidebar macSidebar">
        <div className="brand compactBrand"><span className="mark">H</span><div><strong>Hermes Desktop</strong><small>{connections?.activeConnection?.label ?? 'No active connection'}</small></div></div>
        <nav>{sections.map((section) => <button key={section.id} className={selectedSection === section.id ? 'active' : ''} type="button" onClick={() => setSelectedSection(section.id)}><span>{section.icon}</span><strong>{section.title}</strong>{section.status === 'next' ? <small>next</small> : null}</button>)}</nav>
      </aside>
      {activeContent()}
    </main>
  );
}

try {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element.');
  createRoot(root).render(<App />);
} catch (error) {
  bootError(error instanceof Error ? error.message : 'Unknown renderer boot error.');
}
