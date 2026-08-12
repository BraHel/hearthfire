import { describe, it, expect } from 'vitest';
import { INSERT_TABS, FOLLOWERS_INSERT_ID, getInsertTab } from '../insertTabs';

describe('insertTabs registry', () => {
  it('keeps the ids that live Firestore documents already store', () => {
    // CharacterData.inserts holds these exact strings on real characters. Renaming
    // one doesn't migrate anything — it orphans the insert on every sheet that has
    // it, and the player's data for it stops loading.
    expect(INSERT_TABS.map(({ id }) => id)).toEqual(['Revenant', 'Ghost', 'Thrall', 'Followers']);
  });

  it('resolves the auto-added Followers id to a real entry', () => {
    expect(getInsertTab(FOLLOWERS_INSERT_ID)?.label).toBe('Followers');
  });

  it('names the playbookFeatures key that removing Followers must delete', () => {
    // Omitting a key from the patch merges as "unchanged", not "deleted", so the
    // followers would come straight back on the next read (issue #241).
    expect(getInsertTab(FOLLOWERS_INSERT_ID)?.deleteFeatureKeys).toEqual(['followers']);
  });

  it('returns undefined for an id this build does not know', () => {
    // A document can name an insert added by a newer build; callers handle the
    // miss rather than crashing the sheet.
    expect(getInsertTab('NotAnInsert')).toBeUndefined();
  });
});
