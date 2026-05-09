import type {
  PrepareTerminalSessionInput,
  TerminalResizeInput,
  TerminalSessionState,
  TerminalWriteInput,
} from '../shared/terminal.js';

let currentSession: TerminalSessionState = {
  status: 'idle',
  message: 'No terminal session selected.',
  updatedAt: new Date().toISOString(),
};

function now(): string {
  return new Date().toISOString();
}

export function getTerminalSession(): TerminalSessionState {
  return currentSession;
}

export function prepareTerminalSession(input: PrepareTerminalSessionInput): TerminalSessionState {
  currentSession = {
    status: 'selected',
    target: input.target,
    message: 'Terminal target prepared. Real transport is not connected yet.',
    updatedAt: now(),
  };

  return currentSession;
}

export function connectTerminalSession(): TerminalSessionState {
  if (!currentSession.target) {
    currentSession = {
      status: 'error',
      message: 'Cannot connect terminal without a selected target.',
      updatedAt: now(),
    };
    return currentSession;
  }

  currentSession = {
    ...currentSession,
    status: 'error',
    message: 'Terminal transport is not implemented yet. No websocket was opened.',
    updatedAt: now(),
  };

  return currentSession;
}

export function writeTerminal(_input: TerminalWriteInput): TerminalSessionState {
  if (currentSession.status !== 'connected') {
    currentSession = {
      ...currentSession,
      status: 'error',
      message: 'Cannot write to terminal because no real transport is connected.',
      updatedAt: now(),
    };
  }

  return currentSession;
}

export function resizeTerminal(input: TerminalResizeInput): TerminalSessionState {
  const colsOk = Number.isInteger(input.cols) && input.cols > 0 && input.cols <= 500;
  const rowsOk = Number.isInteger(input.rows) && input.rows > 0 && input.rows <= 500;

  if (!colsOk || !rowsOk) {
    currentSession = {
      ...currentSession,
      status: 'error',
      message: 'Invalid terminal size.',
      updatedAt: now(),
    };
    return currentSession;
  }

  currentSession = {
    ...currentSession,
    message: currentSession.status === 'connected'
      ? `Terminal resize accepted: ${input.cols}x${input.rows}.`
      : `Terminal resize recorded locally: ${input.cols}x${input.rows}.`,
    updatedAt: now(),
  };

  return currentSession;
}

export function disconnectTerminalSession(): TerminalSessionState {
  currentSession = {
    ...currentSession,
    status: currentSession.target ? 'disconnected' : 'idle',
    message: currentSession.target ? 'Terminal session disconnected.' : 'No terminal session selected.',
    updatedAt: now(),
  };

  return currentSession;
}
