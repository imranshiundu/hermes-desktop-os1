import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ConnectionProfile, ExecResult, SessionSummary, SessionDetail, OverviewStatus, RemoteFile, CronJob, KanbanCard, Skill, KnowledgeEntry, UsageEntry, HealthCheck } from '../shared/ipc.js';
import { loadCredential } from './credentials.js';

const execFileAsync = promisify(execFile);

// ─── Core exec helper ──────────────────────────────────────────────────────

export async function execOnConnection(connection: ConnectionProfile, cmd: string): Promise<ExecResult> {
  if (connection.transport === 'ssh') {
    const ssh = connection.ssh!;
    const args: string[] = [];
    if (ssh.port) args.push('-p', String(ssh.port));
    const target = ssh.user ? `${ssh.user}@${ssh.host || ssh.alias}` : (ssh.host || ssh.alias);
    args.push(target, cmd);
    try {
      const { stdout, stderr } = await execFileAsync('ssh', args, { timeout: 15_000 });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return { stdout: e.stdout ?? '', stderr: e.stderr ?? String(err), exitCode: e.code ?? 1 };
    }
  }

  if (connection.transport === 'orgo') {
    const orgoKey = loadCredential('orgo');
    if (!orgoKey) return { stdout: '', stderr: 'No Orgo API key saved.', exitCode: 1 };
    const { computerId } = connection.orgo!;
    const endpoint = `https://www.orgo.ai/api/computers/${computerId}/bash`;
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orgoKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: cmd }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => resp.statusText);
        return { stdout: '', stderr: text, exitCode: resp.status };
      }
      const json = await resp.json() as { stdout?: string; stderr?: string; exit_code?: number };
      return {
        stdout: json.stdout ?? '',
        stderr: json.stderr ?? '',
        exitCode: json.exit_code ?? 0,
      };
    } catch (err) {
      return { stdout: '', stderr: String(err), exitCode: 1 };
    }
  }

  return { stdout: '', stderr: 'Unknown transport', exitCode: 1 };
}

// ─── Overview ─────────────────────────────────────────────────────────────

export async function fetchOverview(connection: ConnectionProfile): Promise<OverviewStatus> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const cmd = `
    HERMES_HOME="${profile}";
    echo "AGENT_INSTALLED=$([ -f $HERMES_HOME/gateway.py ] && echo 1 || echo 0)";
    echo "AGENT_VERSION=$(cat $HERMES_HOME/VERSION 2>/dev/null | head -1)";
    echo "HERMES_HOME=$HERMES_HOME";
    echo "PYTHON=$(which python3 2>/dev/null)";
    GW_PID_FILE="$HERMES_HOME/gateway.pid";
    if [ -f "$GW_PID_FILE" ]; then
      GW_PID=$(cat "$GW_PID_FILE");
      kill -0 "$GW_PID" 2>/dev/null && echo "GATEWAY_RUNNING=1" || echo "GATEWAY_RUNNING=0";
    else echo "GATEWAY_RUNNING=0"; fi
  `.trim();
  const result = await execOnConnection(connection, cmd);
  const parse = (key: string): string => {
    const m = result.stdout.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m?.[1]?.trim() ?? '';
  };
  return {
    agentInstalled: parse('AGENT_INSTALLED') === '1',
    agentVersion: parse('AGENT_VERSION') || undefined,
    hermesHomePath: parse('HERMES_HOME') || undefined,
    pythonPath: parse('PYTHON') || undefined,
    gatewayReachable: parse('GATEWAY_RUNNING') === '1',
    gatewayUrl: undefined,
    installRunning: false,
    updateRunning: false,
    updateAvailable: false,
  };
}

// ─── Sessions ─────────────────────────────────────────────────────────────

export async function fetchSessions(connection: ConnectionProfile): Promise<SessionSummary[]> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const cmd = `python3 -c "
import json, os, glob
home = os.path.expanduser('${profile}')
sessions = []
for d in sorted(glob.glob(home + '/sessions/*/'), reverse=True)[:50]:
    sid = os.path.basename(d.rstrip('/'))
    meta_f = d + 'metadata.json'
    msg_f  = d + 'messages.json'
    meta = {}
    if os.path.exists(meta_f):
        try: meta = json.load(open(meta_f))
        except: pass
    msg_count = None
    if os.path.exists(msg_f):
        try: msg_count = len(json.load(open(msg_f)))
        except: pass
    sessions.append({'id': sid, 'title': meta.get('title'), 'preview': meta.get('preview'), 'messageCount': msg_count, 'startedAt': meta.get('started_at'), 'lastActive': meta.get('last_active')})
print(json.dumps(sessions))
" 2>/dev/null || echo '[]'`;
  const result = await execOnConnection(connection, cmd);
  try {
    return JSON.parse(result.stdout.trim()) as SessionSummary[];
  } catch {
    return [];
  }
}

export async function fetchSessionDetail(connection: ConnectionProfile, sessionId: string): Promise<SessionDetail | null> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cmd = `python3 -c "
import json, os
home = os.path.expanduser('${profile}')
msg_f = home + '/sessions/${safeId}/messages.json'
if os.path.exists(msg_f):
    print(json.dumps(json.load(open(msg_f))))
else:
    print('[]')
" 2>/dev/null || echo '[]'`;
  const result = await execOnConnection(connection, cmd);
  try {
    const messages = JSON.parse(result.stdout.trim()) as SessionDetail['messages'];
    return { id: sessionId, messages };
  } catch {
    return null;
  }
}

// ─── Files ────────────────────────────────────────────────────────────────

export async function listFiles(connection: ConnectionProfile, remotePath: string): Promise<RemoteFile[]> {
  const safe = remotePath.replace(/'/g, "'\\''");
  const cmd = `python3 -c "
import json, os, stat
p = os.path.expanduser('${safe}')
entries = []
try:
    for name in sorted(os.listdir(p)):
        full = os.path.join(p, name)
        s = os.stat(full)
        entries.append({'path': full, 'name': name, 'isDir': os.path.isdir(full), 'size': s.st_size, 'modifiedAt': str(s.st_mtime)})
except Exception as e:
    pass
print(json.dumps(entries))
" 2>/dev/null || echo '[]'`;
  const result = await execOnConnection(connection, cmd);
  try {
    return JSON.parse(result.stdout.trim()) as RemoteFile[];
  } catch {
    return [];
  }
}

export async function readFile(connection: ConnectionProfile, remotePath: string): Promise<string> {
  const safe = remotePath.replace(/'/g, "'\\''");
  const result = await execOnConnection(connection, `cat '${safe}' 2>/dev/null`);
  return result.stdout;
}

export async function writeFile(connection: ConnectionProfile, remotePath: string, content: string): Promise<void> {
  const safe = remotePath.replace(/'/g, "'\\''");
  const encoded = Buffer.from(content).toString('base64');
  await execOnConnection(connection, `echo '${encoded}' | base64 -d > '${safe}'`);
}

// ─── Cron Jobs ────────────────────────────────────────────────────────────

export async function fetchCronJobs(connection: ConnectionProfile): Promise<CronJob[]> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const result = await execOnConnection(connection, `cat ${profile}/cron/jobs.json 2>/dev/null || echo '[]'`);
  try { return JSON.parse(result.stdout.trim()) as CronJob[]; } catch { return []; }
}

// ─── Kanban ───────────────────────────────────────────────────────────────

export async function fetchKanban(connection: ConnectionProfile): Promise<KanbanCard[]> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const cmd = `python3 -c "
import json, sqlite3, os
db = os.path.expanduser('${profile}/../kanban.db')
if not os.path.exists(db):
    print('[]')
else:
    conn = sqlite3.connect(db)
    rows = conn.execute('SELECT id, title, body, status, priority, created_at FROM cards ORDER BY created_at DESC LIMIT 200').fetchall()
    print(json.dumps([{'id': r[0], 'title': r[1], 'body': r[2], 'status': r[3], 'priority': r[4], 'createdAt': r[5]} for r in rows]))
    conn.close()
" 2>/dev/null || echo '[]'`;
  const result = await execOnConnection(connection, cmd);
  try { return JSON.parse(result.stdout.trim()) as KanbanCard[]; } catch { return []; }
}

// ─── Skills ───────────────────────────────────────────────────────────────

export async function fetchSkills(connection: ConnectionProfile): Promise<Skill[]> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const cmd = `python3 -c "
import json, os, glob
home = os.path.expanduser('${profile}')
skills = []
for f in sorted(glob.glob(home + '/skills/*.md') + glob.glob(home + '/skills/*.py')):
    name = os.path.basename(f)
    try:
        preview = open(f).read(300)
    except:
        preview = ''
    skills.append({'name': name, 'path': f, 'description': preview[:120]})
print(json.dumps(skills))
" 2>/dev/null || echo '[]'`;
  const result = await execOnConnection(connection, cmd);
  try { return JSON.parse(result.stdout.trim()) as Skill[]; } catch { return []; }
}

export async function readSkill(connection: ConnectionProfile, skillPath: string): Promise<string> {
  return readFile(connection, skillPath);
}

// ─── Knowledge Base ───────────────────────────────────────────────────────

export async function fetchKnowledge(connection: ConnectionProfile): Promise<KnowledgeEntry[]> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const cmd = `python3 -c "
import json, os, glob
home = os.path.expanduser('${profile}')
entries = []
for f in sorted(glob.glob(home + '/knowledge/**/*', recursive=True)):
    if os.path.isfile(f):
        try:
            preview = open(f).read(200)
        except:
            preview = ''
        entries.append({'name': os.path.basename(f), 'path': f, 'preview': preview[:120], 'size': os.path.getsize(f)})
print(json.dumps(entries[:100]))
" 2>/dev/null || echo '[]'`;
  const result = await execOnConnection(connection, cmd);
  try { return JSON.parse(result.stdout.trim()) as KnowledgeEntry[]; } catch { return []; }
}

// ─── Usage ────────────────────────────────────────────────────────────────

export async function fetchUsage(connection: ConnectionProfile): Promise<UsageEntry[]> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const result = await execOnConnection(connection, `cat ${profile}/usage.json 2>/dev/null || echo '[]'`);
  try { return JSON.parse(result.stdout.trim()) as UsageEntry[]; } catch { return []; }
}

// ─── Doctor ───────────────────────────────────────────────────────────────

export async function fetchHealth(connection: ConnectionProfile): Promise<HealthCheck[]> {
  const profile = connection.hermesProfile ? `~/.hermes/profiles/${connection.hermesProfile}` : '~/.hermes';
  const cmd = `
    HOME_DIR="${profile}"
    CHECKS='[]'
    GW="$HOME_DIR/gateway.py"
    echo "gateway_script=$([ -f $GW ] && echo ok || echo fail)"
    echo "python3=$(which python3 2>/dev/null && echo ok || echo fail)"
    echo "ssh_reachable=ok"
    echo "hermes_home=$([ -d $HOME_DIR ] && echo ok || echo fail)"
  `.trim();
  const result = await execOnConnection(connection, cmd);
  const parse = (key: string): string => {
    const m = result.stdout.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m?.[1]?.trim() ?? 'fail';
  };
  return [
    { id: 'ssh_reachable', label: 'Connection reachable', status: result.exitCode === 0 ? 'ok' : 'fail', message: result.exitCode === 0 ? 'Host is reachable.' : result.stderr },
    { id: 'hermes_home', label: 'Hermes home directory', status: parse('hermes_home') as 'ok' | 'fail', message: parse('hermes_home') === 'ok' ? 'Directory exists.' : 'Directory missing.' },
    { id: 'python3', label: 'python3 available', status: parse('python3') as 'ok' | 'fail', message: parse('python3') === 'ok' ? 'python3 found on PATH.' : 'python3 not found.', fix: 'Install Python 3 on the remote host.' },
    { id: 'gateway_script', label: 'Hermes gateway script', status: parse('gateway_script') as 'ok' | 'fail', message: parse('gateway_script') === 'ok' ? 'gateway.py found.' : 'Agent not installed.', fix: 'Use Overview → Install Hermes Agent.' },
  ];
}
