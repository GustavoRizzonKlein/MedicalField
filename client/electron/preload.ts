import { contextBridge, ipcRenderer } from 'electron';
import type { AppState, MedicalFieldApi } from '../shared/contract';

// The only bridge between the screens and the main process: no Node access in the renderer.
const api: MedicalFieldApi = {
  getState: () => ipcRenderer.invoke('get-state'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  login: (registryNumber, password) => ipcRenderer.invoke('login', registryNumber, password),
  logout: () => ipcRenderer.invoke('logout'),
  setOnline: (online) => ipcRenderer.invoke('set-online', online),
  pull: () => ipcRenderer.invoke('pull'),
  push: () => ipcRenderer.invoke('push'),
  listMedications: () => ipcRenderer.invoke('list-medications'),
  listPatients: () => ipcRenderer.invoke('list-patients'),
  listEncounters: () => ipcRenderer.invoke('list-encounters'),
  listOutbox: () => ipcRenderer.invoke('list-outbox'),
  registerOccurrence: (input) => ipcRenderer.invoke('register-occurrence', input),
  onStateChanged: (listener) => {
    const handler = (_event: unknown, state: AppState) => listener(state);
    ipcRenderer.on('state-changed', handler);
    return () => ipcRenderer.removeListener('state-changed', handler);
  },
};

contextBridge.exposeInMainWorld('medicalField', api);
