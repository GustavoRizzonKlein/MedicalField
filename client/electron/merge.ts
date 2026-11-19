import type { SyncStatus } from '../shared/contract';

export interface LocalVersion {
  syncStatus: SyncStatus;
}

/**
 * Strategy Pattern (client side): decides whether a record received in a pull replaces the
 * local copy. The server has its own strategy (last-write-wins) for the opposite direction.
 */
export interface MergeStrategy {
  shouldReplaceLocal(local: LocalVersion | undefined): boolean;
}

/**
 * Changes made on this device and not yet sent are never overwritten by a pull:
 * they reach the server on the next push, where the server strategy decides.
 */
export class KeepPendingLocalChanges implements MergeStrategy {
  shouldReplaceLocal(local: LocalVersion | undefined): boolean {
    return !local || local.syncStatus === 'SYNCED';
  }
}
