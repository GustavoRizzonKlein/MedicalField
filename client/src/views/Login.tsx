import { IconHeartbeat } from '@tabler/icons-react';
import { type FormEvent, useEffect, useState } from 'react';
import type { ClientConfig } from '../../shared/contract';

export function Login() {
  const [registryNumber, setRegistryNumber] = useState('');
  const [password, setPassword] = useState('');
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.medicalField.getConfig().then(setConfig);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (config) await window.medicalField.setConfig(config);
    const result = await window.medicalField.login(registryNumber.trim(), password);
    if (!result.ok) setError(result.message);
    setBusy(false);
  }

  return (
    <main className="login">
      <form className="glass login-form" onSubmit={submit}>
        <div className="logo">
          <IconHeartbeat size={24} />
        </div>
        <div>
          <h1>MedicalField</h1>
          <p className="muted">Ficha de atendimento pré-hospitalar</p>
        </div>
        <label>
          Registro profissional (CRM, COREN ou ID de socorrista)
          <input value={registryNumber} onChange={(event) => setRegistryNumber(event.target.value)} autoFocus required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>

        <button type="button" className="link" onClick={() => setShowConfig((value) => !value)}>
          {showConfig ? 'Ocultar servidores' : 'Configurar servidores'}
        </button>
        {showConfig && config && (
          <div className="grid">
            <label>
              Serviço de identidade
              <input value={config.identityUrl} onChange={(event) => setConfig({ ...config, identityUrl: event.target.value })} />
            </label>
            <label>
              Serviço clínico
              <input value={config.clinicalUrl} onChange={(event) => setConfig({ ...config, clinicalUrl: event.target.value })} />
            </label>
          </div>
        )}
      </form>
    </main>
  );
}
