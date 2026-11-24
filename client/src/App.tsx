import { IconAmbulance, IconFileText, IconPill, IconStack2, IconUsers } from '@tabler/icons-react';
import { type ComponentType, useEffect, useState } from 'react';
import type { AppState } from '../shared/contract';
import { StatusBar } from './components/StatusBar';
import { Login } from './views/Login';
import { EncountersList, MedicationsList, OutboxList, PatientsList } from './views/Lists';
import { NewOccurrence } from './views/NewOccurrence';

const TABS: Record<string, { label: string; icon: ComponentType<{ size?: number }> }> = {
  occurrence: { label: 'Nova ocorrência', icon: IconAmbulance },
  patients: { label: 'Pacientes', icon: IconUsers },
  encounters: { label: 'Atendimentos', icon: IconFileText },
  outbox: { label: 'Pendências', icon: IconStack2 },
  medications: { label: 'Medicamentos', icon: IconPill },
};

type TabKey = 'occurrence' | 'patients' | 'encounters' | 'outbox' | 'medications';

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<TabKey>('occurrence');
  // Bumped on every state change so the lists reload after sync or new records.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void window.medicalField.getState().then(setState);
    return window.medicalField.onStateChanged((next) => {
      setState(next);
      setVersion((value) => value + 1);
    });
  }, []);

  if (!state) return null;
  if (!state.professional) return <Login />;

  return (
    <div className="app">
      <StatusBar state={state} />
      <nav className="glass tabs">
        {(Object.keys(TABS) as TabKey[]).map((key) => {
          const Icon = TABS[key]!.icon;
          return (
            <button key={key} type="button" className={key === tab ? 'tab active' : 'tab'} onClick={() => setTab(key)}>
              <Icon size={17} />
              {TABS[key]!.label}
              {key === 'outbox' && state.pendingCount + state.failedCount > 0 && (
                <span className="pill">{state.pendingCount + state.failedCount}</span>
              )}
            </button>
          );
        })}
      </nav>
      <main className="content">
        {tab === 'occurrence' && <NewOccurrence version={version} online={state.online} />}
        {tab === 'patients' && <PatientsList version={version} />}
        {tab === 'encounters' && <EncountersList version={version} />}
        {tab === 'outbox' && <OutboxList version={version} />}
        {tab === 'medications' && <MedicationsList version={version} />}
      </main>
    </div>
  );
}
