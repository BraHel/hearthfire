import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RollAffordance } from '../RollAffordance';
import type { RollBand } from '@/types';

const BANDS: RollBand[] = [
  { label: '10+', min: 10, max: null },
  { label: '7-9', min: 7, max: 9 },
];

// Every d6 comes up 4, so a normal roll is a predictable 8 + mod.
const fixDice = () => vi.spyOn(Math, 'random').mockReturnValue(0.5);

afterEach(() => vi.restoreAllMocks());

describe('RollAffordance modifier stepper', () => {
  it('starts at +0 and adds the dialed amount to the roll', async () => {
    fixDice();
    const onRoll = vi.fn();
    const user = userEvent.setup();
    render(
      <RollAffordance stat="WIS" bands={BANDS} mod={2} debilityDisadvantage={false} onRoll={onRoll} />,
    );

    expect(screen.getByText('+0')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Add 1 to the roll'));
    await user.click(screen.getByLabelText('Add 1 to the roll'));
    expect(screen.getByText('+2')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Roll +WIS'));
    // 4 + 4, +2 WIS, +2 dialed.
    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onRoll.mock.calls[0][0]).toMatchObject({ mod: 4, total: 12, stat: 'WIS' });
  });

  it('subtracts as well, and shows the breakdown against the stat', async () => {
    fixDice();
    const user = userEvent.setup();
    render(<RollAffordance stat="CON" bands={BANDS} mod={1} debilityDisadvantage={false} />);

    await user.click(screen.getByLabelText('Subtract 1 from the roll'));
    await user.click(screen.getByLabelText('Roll +CON'));

    // The dice row separates what the sheet supplied from what the player dialed in.
    expect(screen.getByText('+1 CON -1')).toBeInTheDocument();
    expect(screen.getByText('= 8')).toBeInTheDocument();
  });

  // Dialing the stepper must not consume a roll — it only sets the modifier for the next one.
  it('does not re-roll when the stepper changes', async () => {
    fixDice();
    const onRoll = vi.fn();
    const user = userEvent.setup();
    render(
      <RollAffordance stat="WIS" bands={BANDS} mod={0} debilityDisadvantage={false} onRoll={onRoll} />,
    );

    await user.click(screen.getByLabelText('Roll +WIS'));
    expect(onRoll).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText('Add 1 to the roll'));
    await user.click(screen.getByLabelText('Add 1 to the roll'));
    expect(onRoll).toHaveBeenCalledTimes(1);
    // The panel still describes the roll that was actually made, not the pending modifier.
    expect(screen.getByText('+0 WIS')).toBeInTheDocument();
  });

  // The bound is marked with aria-disabled, not `disabled`: a real disabled button would drop the
  // keyboard focus sitting on it the moment the limit is reached.
  it('clamps at the bounds without dropping focus', async () => {
    const user = userEvent.setup();
    render(<RollAffordance stat="nothing" bands={BANDS} mod={0} debilityDisadvantage={false} />);

    const plus = screen.getByLabelText('Add 1 to the roll');
    for (let i = 0; i < 10; i += 1) await user.click(plus);
    expect(screen.getByText('+9')).toBeInTheDocument();
    expect(plus).toHaveAttribute('aria-disabled', 'true');
    expect(plus).not.toBeDisabled();
    expect(plus).toHaveFocus();
    expect(screen.getByLabelText('Subtract 1 from the roll')).toHaveAttribute('aria-disabled', 'false');
  });

  // "+0" on the button beside a stepper already reading "+0" looks like a duplicate.
  it('gives a bare 2d6 roll no label of its own', () => {
    render(<RollAffordance stat="nothing" bands={BANDS} mod={0} debilityDisadvantage={false} />);
    expect(screen.getByLabelText('Roll')).toBeInTheDocument();
    // The only "+0" on screen is the stepper's.
    expect(screen.getAllByText('+0')).toHaveLength(1);
  });

  it('labels a resource roll by the resource and rolls it from zero', async () => {
    fixDice();
    const onRoll = vi.fn();
    const user = userEvent.setup();
    render(
      <RollAffordance
        stat="nothing"
        resource="Favor"
        bands={BANDS}
        mod={0}
        debilityDisadvantage={false}
        onRoll={onRoll}
      />,
    );

    const trigger = screen.getByLabelText('Roll +Favor');
    expect(trigger).toBeInTheDocument();

    await user.click(screen.getByLabelText('Add 1 to the roll'));
    await user.click(trigger);

    // The resource rides along on the report so the shared log can name it.
    expect(onRoll.mock.calls[0][0]).toMatchObject({ mod: 1, total: 9, stat: 'nothing', resource: 'Favor' });
    // The dialed value reads as the resource it stands in for.
    expect(screen.getByText('+1 Favor')).toBeInTheDocument();
  });
});
