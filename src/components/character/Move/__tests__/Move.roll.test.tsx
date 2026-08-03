import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Move } from '../Move';
import { CharacterRollContext } from '../CharacterRollContext';
import type { CharacterData, MoveDefinition } from '@/types';

const rollableMove: MoveDefinition = {
  id: 'test-rollable',
  name: 'Test Rollable',
  body: [
    { kind: 'para', text: 'When you do the thing, roll +WIS.' },
    { kind: 'list', items: ['On a 10+, great.', 'On a 7-9, okay.'] },
  ],
};

const renderInSheet = (ui: ReactElement) =>
  render(
    <CharacterRollContext.Provider
      value={{ data: {} as CharacterData, onRoll: vi.fn() }}
    >
      {ui}
    </CharacterRollContext.Provider>,
  );

const noop = () => {};

describe('Move roll affordance gating', () => {
  // Regression: basic / special / follower moves render with no `selection` prop — they are always
  // the character's — but were treated as "unselected" and lost their roll button entirely.
  it('shows the roll button on a display-only move (no selection control)', () => {
    renderInSheet(<Move title={rollableMove.name} move={rollableMove} />);
    expect(screen.getByLabelText('Roll +WIS')).toBeInTheDocument();
  });

  it('hides the roll button on a selectable move that has not been chosen', () => {
    renderInSheet(
      <Move
        title={rollableMove.name}
        move={rollableMove}
        selection={{
          selected: false,
          onSelectChange: noop,
          takesChecked: 0,
          onTakesChange: noop,
        }}
      />,
    );
    expect(screen.queryByLabelText('Roll +WIS')).not.toBeInTheDocument();
  });

  it('shows the roll button once a selectable move is chosen', () => {
    renderInSheet(
      <Move
        title={rollableMove.name}
        move={rollableMove}
        selection={{
          selected: true,
          onSelectChange: noop,
          takesChecked: 0,
          onTakesChange: noop,
        }}
      />,
    );
    expect(screen.getByLabelText('Roll +WIS')).toBeInTheDocument();
  });

  // An arcana grant whose Consequence threshold isn't met renders display-only (no selection box) with
  // a requirement note — it must stay unrollable even though it has no selection control.
  it('hides the roll button on a display-only move with unmet requirements', () => {
    renderInSheet(
      <Move
        title={rollableMove.name}
        move={rollableMove}
        requirement={['Requires 3 Consequences']}
      />,
    );
    expect(screen.queryByLabelText('Roll +WIS')).not.toBeInTheDocument();
  });

  it('shows no roll button outside a character sheet (no roll context)', () => {
    render(<Move title={rollableMove.name} move={rollableMove} />);
    expect(screen.queryByLabelText('Roll +WIS')).not.toBeInTheDocument();
  });
});
