import { IconHeartbeat } from '@tabler/icons-react';
import { type FormEvent, useState } from 'react';
import { postJson, setToken } from '../api';
import type { Professional } from '../types';

interface LoginResponse {
  token: string;
  professional: Professional;
}

export function Login({ onLogin }: { onLogin: (professional: Professional) => void }) {
  const [registryNumber, setRegistryNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await postJson<LoginResponse>('identity', '/auth/login', { registryNumber, password });
      setToken(response.token);
      onLogin(response.professional);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Falha no login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="glass login-form" onSubmit={submit}>
        <div className="logo">
          <IconHeartbeat size={24} />
        </div>
        <div>
          <h1>MedicalField</h1>
          <p className="muted">Portal administrativo</p>
        </div>
        <label>
          Registro profissional (CRM, COREN ou ID de socorrista)
          <input value={registryNumber} onChange={(event) => setRegistryNumber(event.target.value)} autoFocus required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <p className="error">{error === 'Invalid credentials' ? 'Registro ou senha inválidos.' : error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
