import { useEffect, useState } from 'react';
import { getJson, getToken, setToken, setUnauthorizedHandler } from './api';
import { Login } from './components/Login';
import type { Professional } from './types';
import { AuditView } from './views/AuditView';
import { EncountersView } from './views/EncountersView';
import { MedicalRecordsView, MedicationsView, PersonsView, ProfessionalsView } from './views/RegistryViews';

const TABS = {
  encounters: { label: 'Atendimentos', view: EncountersView },
  records: { label: 'Prontuários', view: MedicalRecordsView },
  persons: { label: 'Pessoas', view: PersonsView },
  medications: { label: 'Medicamentos', view: MedicationsView },
  professionals: { label: 'Profissionais', view: ProfessionalsView },
  audit: { label: 'Auditoria', view: AuditView },
} as const;

type TabKey = keyof typeof TABS;

export function App() {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<TabKey>('encounters');

  function logout() {
    setToken(null);
    setProfessional(null);
  }

  useEffect(() => {
    setUnauthorizedHandler(logout);
    // Restores the session after a page reload while the token is still valid.
    if (getToken()) {
      getJson<Professional>('identity', '/auth/me')
        .then(setProfessional)
        .catch(logout)
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) return null;
  if (!professional) return <Login onLogin={setProfessional} />;

  const View = TABS[tab].view;
  return (
    <div className="app">
      <header className="topbar">
        <strong>MedicalField · Portal</strong>
        <nav>
          {(Object.keys(TABS) as TabKey[]).map((key) => (
            <button key={key} type="button" className={key === tab ? 'tab active' : 'tab'} onClick={() => setTab(key)}>
              {TABS[key].label}
            </button>
          ))}
        </nav>
        <div className="user">
          {professional.fullName} ({professional.registryNumber})
          <button type="button" className="secondary" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <main className="content">
        <View key={tab} />
      </main>
    </div>
  );
}
