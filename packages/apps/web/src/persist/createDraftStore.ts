import type { PoemCreationDraftStore } from './types';
import { IndexedDbDraftStore } from './indexedDbDraftStore';
import {
  SupabaseDraftStore,
  supabaseStoreReady,
} from './supabaseDraftStore';
import type { PersistenceSettings } from '../utils/settings';

export function createDraftStore(
  persistence: PersistenceSettings,
): PoemCreationDraftStore {
  if (
    persistence.mode === 'supabase' &&
    supabaseStoreReady(persistence.supabase)
  ) {
    return new SupabaseDraftStore(persistence.supabase);
  }

  return new IndexedDbDraftStore();
}
