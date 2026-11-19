import { useState } from 'react';
import type { AppState } from '../../shared/contract';

function time(value: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca';
}

export function StatusBar({ state }: { state: AppState }) {
  const [busy, setBusy] = useState<'pull' | 'push' | null>(null);
  const professional = state.professional!;

  async function run(kind: 'pull' | 'push') {
    setBusy(kind);
    try {
      await (kind === 'pull' ? window.medicalField.pull() : window.medicalField.push());
    } finally {
      setBusy(null);
    }
  }

  return (
    <header className="statusbar">
      <div className="brand">
        <strong>MedicalField</strong>
        <span className="muted">
          {professional.fullName} · {professional.registryNumber}
        </span>
      </div>

      {/* Simulador de conectividade exigido pelo roteiro de testes */}
      <label className={`switch ${state.online ? 'on' : 'off'}`}>
        <input
          type="checkbox"
          checked={state.online}
          onChange={(event) => void window.medicalField.setOnline(event.target.checked)}
        />
        <span className="slider" />
        <span className="switch-label">Simular conectividade: {state.online ? 'ONLINE' : 'OFFLINE'}</span>
      </label>

      <div className="sync">
        <span title="Operações aguardando envio">
          Pendentes: <b>{state.pendingCount}</b>
          {state.failedCount > 0 && <b className="error"> · {state.failedCount} com erro</b>}
        </span>
        <button type="button" className="secondary" onClick={() => run('pull')} disabled={busy !== null || !state.online}>
          {busy === 'pull' ? 'Recebendo...' : 'Receber dados do Portal'}
        </button>
        <button type="button" onClick={() => run('push')} disabled={busy !== null || !state.online || state.syncing}>
          {busy === 'push' || state.syncing ? 'Enviando...' : 'Enviar pendentes'}
        </button>
        <button type="button" className="secondary" onClick={() => void window.medicalField.logout()}>
          Sair
        </button>
      </div>

      <div className="status-line muted">
        Último recebimento: {time(state.lastPullAt)} · Último envio: {time(state.lastPushAt)} · Dispositivo: {state.deviceId}
        {state.lastMessage && <span className="message"> · {state.lastMessage}</span>}
      </div>
    </header>
  );
}
