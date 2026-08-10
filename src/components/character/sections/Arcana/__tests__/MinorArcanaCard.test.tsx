import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { MinorArcanum } from '@/types';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MinorArcanaCard } from '../MinorArcanaCard';

// Stable base props so each test only overrides what it's exercising.
const baseArcanum = (overrides: Partial<MinorArcanum> = {}): MinorArcanum => ({
  id: 'test-1',
  name: 'Test arcanum',
  description: 'A test description.',
  requirements: ['…first requirement.', '…second requirement.'],
  move: { name: 'Test Move', text: 'Move text.' },
  ...overrides,
});

const noop = () => {};

describe('MinorArcanaCard unlock — default count', () => {
  it('stays locked until every requirement is checked', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={baseArcanum()}
        requirementsChecked={{ req0: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryByText('Test Move')).not.toBeInTheDocument();
  });

  it('unlocks once every requirement is checked', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={baseArcanum()}
        requirementsChecked={{ req0: true, req1: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText('Test Move')).toBeInTheDocument();
  });
});

describe('MinorArcanaCard unlock — requirementsUnlockAt', () => {
  // Modeled on ids 2/3/14 in minor.ts: an either/or pair where checking just one unlocks.
  const arcanum = baseArcanum({ requirementsUnlockAt: 1 });

  it('stays locked with nothing checked', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryByText('Test Move')).not.toBeInTheDocument();
  });

  it('unlocks once the threshold count is reached, regardless of which box', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req1: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText('Test Move')).toBeInTheDocument();
  });
});

describe('MinorArcanaCard unlock — unlockGroups', () => {
  // Modeled on id 44 ("A silvery glass bottle") in minor.ts: item 0 alone, OR both items 1 and 2.
  const arcanum = baseArcanum({
    requirements: ['…find a teacher.', '…fill the bottle.', '…drink the contents.'],
    unlockGroups: [[0], [1, 2]],
  });

  it('unlocks when the single-item group is satisfied', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req0: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText('Test Move')).toBeInTheDocument();
  });

  it('unlocks when the two-item group is fully satisfied', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req1: true, req2: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText('Test Move')).toBeInTheDocument();
  });

  it('stays locked on only the last item of the two-item group', () => {
    // The exact bug this data shape was built to prevent: item 2 alone is not a valid path.
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req2: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryByText('Test Move')).not.toBeInTheDocument();
  });

  it('stays locked on only the first item of the two-item group', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req1: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryByText('Test Move')).not.toBeInTheDocument();
  });
});

describe('MinorArcanaCard requirementsDivider', () => {
  // Modeled on id 26 ("A strange skull and antlers"): "or…" rendered above the second requirement.
  const arcanum = baseArcanum({
    requirements: ['…learn the name.', '…use the move to call it up.'],
    requirementsDivider: { index: 1, text: 'or…' },
  });

  it('renders the divider text exactly once', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getAllByText('or…')).toHaveLength(1);
  });

  it('positions the divider before the requirement at its index, not the first', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    const container = screen.getByText('or…').closest('div');
    const text = container?.textContent ?? '';
    const dividerIndex = text.indexOf('or…');
    const secondReqIndex = text.indexOf('…use the move to call it up.');
    const firstReqIndex = text.indexOf('…learn the name.');
    expect(firstReqIndex).toBeLessThan(dividerIndex);
    expect(dividerIndex).toBeLessThan(secondReqIndex);
  });

  it('does not render a divider when none is configured', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={baseArcanum()}
        requirementsChecked={{}}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryByText('or…')).not.toBeInTheDocument();
  });
});

describe('MinorArcanaCard requirementsNote', () => {
  // Modeled on id 18 ("A path in the woods"): a trailing caveat, not a checkbox.
  const arcanum = baseArcanum({
    requirementsNote: 'Should multiple people attempt this, only one can succeed.',
  });

  it('renders the note as prose, not as an additional checkbox', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(
      screen.getByText('Should multiple people attempt this, only one can succeed.'),
    ).toBeInTheDocument();
    // 2 requirements in baseArcanum() => exactly 2 checkboxes; the note must not add a third.
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('is excluded from unlock counting', () => {
    // Both real requirements checked; the note is not a checkbox so it can't block unlock.
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req0: true, req1: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText('Test Move')).toBeInTheDocument();
  });
});

describe('MinorArcanaCard marksTracker', () => {
  // Modeled on id 31 ("A cracked flute"): unlock is earned by marking circles on a roll, and the
  // single requirement string is prose explaining the payoff — not a task to tick off.
  const arcanum = baseArcanum({
    requirements: ['When you mark all three circles, you unlock the mysteries of the flute.'],
    marksTracker: { label: 'circles marked', max: 3 },
  });

  it('renders clickable dots and no requirement checkboxes', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('group', { name: 'circles marked' })).toBeInTheDocument();
    expect(
      screen.getByText('When you mark all three circles, you unlock the mysteries of the flute.'),
    ).toBeInTheDocument();
  });

  it('reports the clicked dot count', () => {
    const onMarksChange = vi.fn();
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        marksValue={1}
        onToggleRequirement={noop}
        onMarksChange={onMarksChange}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    screen.getByRole('button', { name: 'Use 3' }).click();
    expect(onMarksChange).toHaveBeenCalledWith(3);
  });

  it('stays locked below the mark threshold, even with requirement keys checked', () => {
    // requirementsChecked must not be a back door to unlocking a marks-based arcanum.
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req0: true }}
        marksValue={2}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryByText('Test Move')).not.toBeInTheDocument();
  });

  it('unlocks once every circle is marked', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        marksValue={3}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText('Test Move')).toBeInTheDocument();
  });
});

describe('MinorArcanaCard move statuses', () => {
  // Modeled on id 51 ("Sublime Words"): named states the move tells you to mark and clear, marked
  // independently — the book's order is severity, not a sequence.
  const arcanum = baseArcanum({
    move: {
      name: 'Test Move',
      text: 'Move text.',
      statuses: {
        label: 'Voice',
        items: [
          { id: 'raspy', label: 'raspy voice' },
          { id: 'coughing', label: 'coughing fits' },
          { id: 'mute', label: 'mute' },
        ],
      },
    },
  });
  const unlocked = { req0: true, req1: true };

  it('renders one checkbox per status, reflecting saved state', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={unlocked}
        statusChecks={{ raspy: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    // The two unlock requirements are checked off above, so the move's own boxes are the rest.
    expect(screen.getByRole('checkbox', { name: 'raspy voice' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'coughing fits' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'mute' })).not.toBeChecked();
  });

  it('reports the toggled status id, leaving its siblings alone', () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={unlocked}
        statusChecks={{ raspy: true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={onStatusChange}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    screen.getByRole('checkbox', { name: 'coughing fits' }).click();
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith('coughing', true);
  });
});

describe('MinorArcanaCard follower Loyalty', () => {
  // Modeled on the cracked flute's andalau: an unlocked follower tracked by Loyalty as well as HP.
  const arcanum = baseArcanum({
    move: {
      name: 'Test Move',
      text: 'Move text.',
      follower: {
        name: 'The Andalau of the Flute',
        tags: 'Spirit, tiny',
        hp: 8,
        instinct: 'to play and frolic',
        loyalty: 3,
        cost: 'entertainment',
      },
    },
  });
  const unlocked = { req0: true, req1: true };

  it('renders the Loyalty dots with the saved value marked', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={unlocked}
        followerLoyalty={2}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    const dots = within(screen.getByRole('group', { name: 'Loyalty' })).getAllByRole('button');
    expect(dots.map((d) => d.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false']);
  });

  it('reports the clicked Loyalty count', () => {
    const onFollowerLoyaltyChange = vi.fn();
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={unlocked}
        followerLoyalty={0}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={onFollowerLoyaltyChange}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    within(screen.getByRole('group', { name: 'Loyalty' })).getAllByRole('button')[0].click();
    expect(onFollowerLoyaltyChange).toHaveBeenCalledWith(1);
  });
});

describe('MinorArcanaCard requirementRepeats', () => {
  // Modeled on id 58 ("A mummified hand"): the third requirement is one string but three
  // independently-checkable nights.
  const arcanum = baseArcanum({
    requirements: [
      '…learn the name.',
      '…learn the words of power.',
      '…on three separate nights, soak a crystal in blood.',
    ],
    requirementRepeats: { 2: 3 },
  });

  it('renders three checkboxes for the repeated requirement, one text label', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{}}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    // 1 + 1 + 3 repeated slots = 5 checkboxes total, but the requirement text appears once.
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(
      screen.getAllByText('…on three separate nights, soak a crystal in blood.'),
    ).toHaveLength(1);
  });

  it('stays locked until all repeated slots are checked, not just one', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ req0: true, req1: true, 'req2-0': true, 'req2-1': true }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.queryByText('Test Move')).not.toBeInTheDocument();
  });

  it('unlocks once every repeated slot plus the plain requirements are checked', () => {
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{
          req0: true,
          req1: true,
          'req2-0': true,
          'req2-1': true,
          'req2-2': true,
        }}
        onToggleRequirement={noop}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText('Test Move')).toBeInTheDocument();
  });

  it('toggles the correct repeated-slot key on click, independent of its siblings', () => {
    const onToggleRequirement = vi.fn();
    renderWithProviders(
      <MinorArcanaCard
        arcanum={arcanum}
        requirementsChecked={{ 'req2-0': true }}
        onToggleRequirement={onToggleRequirement}
        onMarksChange={noop}
        onTrackerChange={noop}
        onStatusChange={noop}
        onFollowerHpChange={noop}
        onFollowerLoyaltyChange={noop}
        onNotesChange={noop}
        onRemove={noop}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // req0, req1, req2-0 (checked), req2-1, req2-2 — click the second night's box.
    checkboxes[3].click();
    expect(onToggleRequirement).toHaveBeenCalledWith('req2-1', true);
  });
});
