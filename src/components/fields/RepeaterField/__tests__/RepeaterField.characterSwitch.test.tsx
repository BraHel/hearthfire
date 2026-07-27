import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RepeaterField } from '../RepeaterField';

// Regression test for issue #294: a RepeaterField instance reused across two
// different characters (no remount) keeps its internal `local` state — an
// in-flight edit that hasn't debounce-flushed yet is neither reflected in
// `props.items` nor in the instance's own `lastSavedRef`, so the sync guard
// (RepeaterField.tsx's effect on `props.items`) treats the switch as a no-op:
// both are still `[]`. The stale row then renders under the new character,
// and the pending debounced save later commits it to the NEW character's
// onSave. CharacterPlaybook now forces a remount via `key={character.id}`
// specifically to avoid this; this test guards the underlying mechanism by
// asserting the *same-key* (no remount) case still leaks, and that a fresh
// key (the fix) does not.
describe('RepeaterField — in-flight edit across a character switch', () => {
  it('leaks an unflushed edit into a same-key rerender for a different character', () => {
    const onSaveA = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <RepeaterField
        key="char-a"
        variant="checked-weight"
        items={[]}
        onSave={onSaveA}
        addLabel="Add possession"
        itemLabel="Possession"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add possession' }));
    const inputA = screen.getByLabelText('Possession 1');
    // Type but never blur/flush — this only queues RepeaterField's internal
    // 1500ms debounce; neither `props.items` (still []) nor the instance's
    // `lastSavedRef` (still "[]", nothing has saved yet) reflect this edit.
    fireEvent.change(inputA, { target: { value: "Aldric's Amulet" } });

    // Same component instance (identical key — the pre-fix behavior, since
    // CharacterPlaybook only varies the route's :playbook param, not a key),
    // now showing character B, whose saved possessions are also empty.
    const onSaveB = vi.fn().mockResolvedValue(undefined);
    rerender(
      <RepeaterField
        key="char-a"
        variant="checked-weight"
        items={[]}
        onSave={onSaveB}
        addLabel="Add possession"
        itemLabel="Possession"
      />,
    );

    // Bug: Aldric's unsaved text is still showing under Brynn's sheet.
    expect(screen.getByDisplayValue("Aldric's Amulet")).toBeInTheDocument();
  });

  it('does not leak an unflushed edit when the character switch remounts via a fresh key (the fix)', async () => {
    const onSaveA = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <RepeaterField
        key="char-a"
        variant="checked-weight"
        items={[]}
        onSave={onSaveA}
        addLabel="Add possession"
        itemLabel="Possession"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add possession' }));
    const inputA = screen.getByLabelText('Possession 1');
    fireEvent.change(inputA, { target: { value: "Aldric's Amulet" } });

    const onSaveB = vi.fn().mockResolvedValue(undefined);
    // A different key forces React to unmount the old instance (discarding its
    // pending debounce/local state) and mount a fresh one for character B —
    // this is the CharacterPlaybook fix: key={character.id} on CharacterSheet.
    rerender(
      <RepeaterField
        key="char-b"
        variant="checked-weight"
        items={[]}
        onSave={onSaveB}
        addLabel="Add possession"
        itemLabel="Possession"
      />,
    );

    expect(screen.queryByDisplayValue("Aldric's Amulet")).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Possession 1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add possession' }));
    const inputB = screen.getByLabelText('Possession 1');
    fireEvent.change(inputB, { target: { value: "Brynn's Lockpick" } });
    fireEvent.blur(inputB);

    await waitFor(() => expect(onSaveB).toHaveBeenCalledWith([
      { checked: false, text: "Brynn's Lockpick", weight: 1 },
    ]));
    // The unmounted instance flushes Aldric's pending edit to its OWN onSave
    // (onSaveA) on cleanup — the edit is preserved, not lost, and not misattributed
    // to Brynn. onSaveB only ever receives Brynn's own row.
    expect(onSaveA).toHaveBeenCalledWith([
      { checked: false, text: "Aldric's Amulet", weight: 1 },
    ]);
    expect(onSaveB).not.toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ text: "Aldric's Amulet" }),
    ]));
  });

  it('shows the new character’s own saved possessions after a same-key switch, once a save has committed', async () => {
    const onSaveA = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <RepeaterField
        key="char-a"
        variant="checked-weight"
        items={[]}
        onSave={onSaveA}
        addLabel="Add possession"
        itemLabel="Possession"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add possession' }));
    const inputA = screen.getByLabelText('Possession 1');
    fireEvent.change(inputA, { target: { value: "Aldric's Amulet" } });
    fireEvent.blur(inputA);
    await waitFor(() => expect(onSaveA).toHaveBeenCalledWith([
      { checked: false, text: "Aldric's Amulet", weight: 1 },
    ]));

    // Same instance (identical key), now showing Brynn, who already has her
    // own saved possession.
    const onSaveB = vi.fn().mockResolvedValue(undefined);
    rerender(
      <RepeaterField
        key="char-a"
        variant="checked-weight"
        items={[{ checked: false, text: "Brynn's Lockpick", weight: 1 }]}
        onSave={onSaveB}
        addLabel="Add possession"
        itemLabel="Possession"
      />,
    );

    expect(screen.queryByDisplayValue("Aldric's Amulet")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Brynn's Lockpick")).toBeInTheDocument();
  });
});
