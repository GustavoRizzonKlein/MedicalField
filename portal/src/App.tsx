import {
  IconFileText,
  IconHeartbeat,
  IconLayoutDashboard,
  IconLogout,
  IconPill,
  IconSearch,
  IconShieldCheck,
  IconStethoscope,
  IconUsers,
} from '@tabler/icons-react';
import { type ComponentType, useEffect, useState } from 'react';
import { getJson, getToken, setToken, setUnauthorizedHandler } from './api';
import { Login } from './components/Login';
import { initials } from './format';
import type { Professional } from './types';
import { AuditView } from './views/AuditView';
import { EncountersView } from './views/EncountersView';
import { MedicationsView } from './views/MedicationsView';
import { MedicalRecordsView, PersonsView, ProfessionalsView } from './views/RegistryViews';

export interface ViewProps {
  search: string;
}

interface Tab {
  label: string;
  title: string;
  icon: ComponentType<{ size?: number }>;
  view: ComponentType<ViewProps>;
}

const TABS = {
  encounters: { label: 'Painel', title: 'Painel de atendimentos', icon: IconLayoutDashboard, view: EncountersView },
  records: { label: 'Prontuários', title: 'Prontuários', icon: IconFileText, view: MedicalRecordsView },
  persons: { label: 'Pessoas', title: 'Pessoas', icon: IconUsers, view: PersonsView },
  medications: { label: 'Remédios', title: 'Medicamentos', icon: IconPill, view: MedicationsView },
  professionals: { label: 'Equipe', title: 'Profissionais', icon: IconStethoscope, view: ProfessionalsView },
  audit: { label: 'Auditoria', title: 'Auditoria e logs', icon: IconShieldCheck, view: AuditView },
} satisfies Record<string, Tab>;

type TabKey = keyof typeof TABS;

export function App() {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<TabKey>('encounters');
  const [search, setSearch] = useState('');

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

  const current = TABS[tab];
  const View = current.view;
  return (
    <div className="shell">
      <aside className="glass sidebar">
        <div className="logo" title="MedicalField">
          <IconHeartbeat size={24} />
        </div>
        {(Object.keys(TABS) as TabKey[]).map((key) => {
          const Icon = TABS[key].icon;
          return (
            <button
              key={key}
              type="button"
              className={key === tab ? 'nav-btn active' : 'nav-btn'}
              onClick={() => {
                setTab(key);
                setSearch('');
              }}
              title={TABS[key].title}
            >
              <Icon size={21} />
              {TABS[key].label}
            </button>
          );
        })}
        <div className="spacer" />
        <button type="button" className="nav-btn" onClick={logout} title="Sair">
          <IconLogout size={21} />
          Sair
        </button>
      </aside>

      <div className="main">
        <header className="glass header">
          <div>
            <h1>{current.title}</h1>
            <span className="muted">MedicalField · Portal administrativo</span>
          </div>
          <div className="header-right">
            <label className="glass search">
              <IconSearch size={16} />
              <input placeholder="Buscar paciente" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="user-name">
              <span>{professional.fullName}</span>
              <span className="muted">{professional.registryNumber}</span>
            </div>
            <div className="avatar">{initials(professional.fullName)}</div>
          </div>
        </header>
        <main className="content">
          <View key={tab} search={search.trim().toLowerCase()} />
        </main>
      </div>
    </div>
  );
}
