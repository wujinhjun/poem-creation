import type { PoemCreationDraftStore } from './types';
import { IndexedDbDraftStore } from './indexedDbDraftStore';
import {
  SupabaseDraftStore,
  supabaseStoreReady,
} from './supabaseDraftStore';
import { SUPABASE_BYOK_ENABLED } from '../utils/settings';
import type { PersistenceSettings } from '../utils/settings';

export function createDraftStore(
  persistence: PersistenceSettings,
): PoemCreationDraftStore {
  if (
    SUPABASE_BYOK_ENABLED &&
    persistence.mode === 'supabase' &&
    supabaseStoreReady(persistence.supabase)
  ) {
    return new SupabaseDraftStore(persistence.supabase);
  }

  return new IndexedDbDraftStore();
}
