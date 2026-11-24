import { IconCloudDownload, IconCloudUpload, IconHeartbeat, IconLogout, IconStack2 } from '@tabler/icons-react';
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
    <header className="glass statusbar">
      <div className="brand">
        <div className="logo">
          <IconHeartbeat size={21} />
        </div>
        <div className="brand-text">
          <strong>MedicalField</strong>
          <span className="muted">
            {professional.fullName} · {professional.registryNumber}
          </span>
        </div>
      </div>

      {/* Connectivity simulator required by the test script */}
      <label className={`switch ${state.online ? 'on' : 'off'}`}>
        <input
          type="checkbox"
          checked={state.online}
          onChange={(event) => void window.medicalField.setOnline(event.target.checked)}
        />
        <span className="slider" />
        Simular conectividade: {state.online ? 'ONLINE' : 'OFFLINE'}
      </label>

      <div className="sync">
        <span className="glass pending-counter" title="Operações aguardando envio">
          <IconStack2 size={16} /> Pendentes: <b>{state.pendingCount}</b>
          {state.failedCount > 0 && <b className="error"> · {state.failedCount} com erro</b>}
        </span>
        <button type="button" className="secondary" onClick={() => run('pull')} disabled={busy !== null || !state.online}>
          <IconCloudDownload size={17} />
          {busy === 'pull' ? 'Recebendo...' : 'Receber dados do Portal'}
        </button>
        <button type="button" onClick={() => run('push')} disabled={busy !== null || !state.online || state.syncing}>
          <IconCloudUpload size={17} />
          {busy === 'push' || state.syncing ? 'Enviando...' : 'Enviar pendentes'}
        </button>
        <button type="button" className="secondary" onClick={() => void window.medicalField.logout()} aria-label="Sair">
          <IconLogout size={17} />
        </button>
      </div>

      <div className="status-line muted">
        <span>Último recebimento: {time(state.lastPullAt)}</span>
        <span>Último envio: {time(state.lastPushAt)}</span>
        <span>Dispositivo: {state.deviceId}</span>
        {state.lastMessage && <span className="message">{state.lastMessage}</span>}
      </div>
    </header>
  );
}
