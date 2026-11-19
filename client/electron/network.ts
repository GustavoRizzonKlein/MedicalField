/**
 * Observer Pattern: the connectivity simulator is the subject. The sync service subscribes
 * to it and flushes the Outbox as soon as the state changes to online; the main window
 * subscribes too, to repaint the status bar.
 */
export type NetworkListener = (online: boolean) => void;

export class NetworkMonitor {
  private listeners = new Set<NetworkListener>();

  constructor(private online: boolean) {}

  isOnline(): boolean {
    return this.online;
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setOnline(online: boolean): void {
    if (online === this.online) return;
    this.online = online;
    for (const listener of this.listeners) {
      listener(online);
    }
  }
}
