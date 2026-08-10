import { describe, it, expect, vi } from 'vitest';
import { createRef, type MutableRefObject } from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import type { ArcanaMinorEntry } from '@/types';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MinorArcanaPanel } from '../MinorArcanaPanel';

// Real MINOR_ARCANA ids the panel looks up, so the rendered cards match the shipped data:
//   31 — a cracked flute: marksTracker unlock, follower with loyalty + loyaltyStart
//   52 — a prospector's tale: move with a statuses group (Sublime Words)
//   63 — an oversized crown: follower with no loyaltyStart
const FLUTE = '31';
const TALE = '52';
const CROWN = '63';

// The panel reads the current entries off the ref (not the prop) when building each save payload, so
// tests hand it the same array both ways — mirroring what useOptimisticField gives the real component.
const renderPanel = (entries: ArcanaMinorEntry[]) => {
  const saveMinor = vi.fn();
  const ref = createRef() as MutableRefObject<ArcanaMinorEntry[]>;
  ref.current = entries;
  renderWithProviders(
    <MinorArcanaPanel arcanaMinor={entries} arcanaMinorRef={ref} saveMinor={saveMinor} />,
  );
  return { saveMinor };
};

// An unrelated entry carried alongside the one under test: every handler rewrites the whole array,
// so each test asserts this one comes back untouched.
const otherEntry: ArcanaMinorEntry = { id: CROWN, requirementsChecked: { req0: true } };

const addArcanum = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Add Minor Arcanum' }));
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: name } });
  fireEvent.click(screen.getByRole('option', { name: new RegExp(name, 'i') }));
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
};

describe('MinorArcanaPanel add', () => {
  it('seeds a follower that starts with Loyalty already held', () => {
    const { saveMinor } = renderPanel([]);
    addArcanum('A cracked flute');
    expect(saveMinor).toHaveBeenCalledTimes(1);
    expect(saveMinor.mock.calls[0][0]).toEqual([
      { id: FLUTE, requirementsChecked: {}, marksValue: 0, followerHp: [8], followerLoyalty: 1 },
    ]);
  });

  it('leaves Loyalty unseeded for a follower that starts with none', () => {
    const { saveMinor } = renderPanel([]);
    addArcanum('An oversized crown');
    const [entry] = saveMinor.mock.calls[0][0];
    expect(entry).not.toHaveProperty('followerLoyalty');
  });
});

describe('MinorArcanaPanel marks', () => {
  it('saves the clicked circle count without touching other arcana', () => {
    const { saveMinor } = renderPanel([
      otherEntry,
      { id: FLUTE, requirementsChecked: {}, marksValue: 1 },
    ]);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'circles marked' })).getByRole('button', {
        name: 'Use 3',
      }),
    );
    expect(saveMinor).toHaveBeenCalledWith([
      otherEntry,
      { id: FLUTE, requirementsChecked: {}, marksValue: 3 },
    ]);
  });
});

describe('MinorArcanaPanel move statuses', () => {
  // Sublime Words unlocks on all four requirements, then offers the voice-damage statuses.
  const unlockedTale: ArcanaMinorEntry = {
    id: TALE,
    requirementsChecked: { req0: true, req1: true, req2: true, req3: true },
    statusChecks: { raspy: true },
  };

  it('saves a newly marked status alongside the ones already marked', () => {
    const { saveMinor } = renderPanel([otherEntry, unlockedTale]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'coughing fits' }));
    expect(saveMinor).toHaveBeenCalledWith([
      otherEntry,
      { ...unlockedTale, statusChecks: { raspy: true, coughing: true } },
    ]);
  });

  it('saves a cleared status as false rather than dropping it', () => {
    const { saveMinor } = renderPanel([unlockedTale]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'raspy voice' }));
    expect(saveMinor).toHaveBeenCalledWith([{ ...unlockedTale, statusChecks: { raspy: false } }]);
  });
});

describe('MinorArcanaPanel follower Loyalty', () => {
  it('saves the clicked Loyalty count without touching other arcana', () => {
    const { saveMinor } = renderPanel([
      otherEntry,
      { id: FLUTE, requirementsChecked: {}, marksValue: 3, followerLoyalty: 1 },
    ]);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Loyalty' })).getByRole('button', { name: 'Use 2' }),
    );
    expect(saveMinor).toHaveBeenCalledWith([
      otherEntry,
      { id: FLUTE, requirementsChecked: {}, marksValue: 3, followerLoyalty: 2 },
    ]);
  });
});
