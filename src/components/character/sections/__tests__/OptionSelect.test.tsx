import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toastModuleMock, addToastSpy } from '@/test/toastMock';

vi.mock('@/components/app/Toast/ToastContext', () => toastModuleMock());

import { OptionSelect } from '../OptionSelect';
import type { RadioOption } from '@/types';

const OPTIONS: RadioOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

const radio = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

afterEach(() => { vi.restoreAllMocks(); });

describe('OptionSelect — remote sync', () => {
  it('applies a remote selection that arrived mid-save once the save settles (#171)', async () => {
    const user = userEvent.setup();
    let resolveSave: () => void = () => {};
    const onChange = vi.fn(() => new Promise<void>((r) => { resolveSave = r; }));

    const { rerender } = render(
      <OptionSelect name="test" options={OPTIONS} value="" customValue="" onChange={onChange} />,
    );

    // Local pick — optimistic, save still in flight.
    await user.click(radio('Bravo'));
    expect(onChange).toHaveBeenCalledWith('b', '');
    expect(radio('Bravo').checked).toBe(true);

    // Another device picks Charlie while our save is pending. It must be held,
    // not applied over our optimistic value…
    rerender(<OptionSelect name="test" options={OPTIONS} value="c" customValue="" onChange={onChange} />);
    expect(radio('Bravo').checked).toBe(true);

    // …and must not be lost: once our save settles it flushes through. The
    // hand-rolled pending guard this replaced dropped it outright.
    await act(async () => { resolveSave(); });
    await waitFor(() => expect(radio('Charlie').checked).toBe(true));
  });

  it('applies a remote selection when no save is pending', () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <OptionSelect name="test" options={OPTIONS} value="" customValue="" onChange={onChange} />,
    );

    rerender(<OptionSelect name="test" options={OPTIONS} value="a" customValue="" onChange={onChange} />);
    expect(radio('Alpha').checked).toBe(true);
  });

  it('puts the previous choice back when the save fails', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockRejectedValue(new Error('offline'));

    render(
      <OptionSelect name="test" options={OPTIONS} value="a" customValue="" onChange={onChange} />,
    );
    // A section that already has an answer starts collapsed down to it, which
    // hides the other options — open it back up so there is something to switch to.
    await user.click(screen.getByLabelText('Expand Instinct'));
    expect(radio('Alpha').checked).toBe(true);

    // The pick shows immediately, then the write fails. Leaving Bravo filled in
    // would tell the player their choice stuck when nothing was written; the
    // failure also used to escape as an unhandled rejection.
    await user.click(radio('Bravo'));
    await waitFor(() => expect(radio('Alpha').checked).toBe(true));
    expect(radio('Bravo').checked).toBe(false);
    expect(addToastSpy).toHaveBeenCalledWith('Failed to save.', 'error');
  });

  it('holds local state when the caller has no value yet', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <OptionSelect name="test" options={OPTIONS} onChange={onChange} />,
    );

    await user.click(radio('Alpha'));
    // An undefined value means the document hasn't loaded the key yet — it must
    // not blank the selection the user just made.
    rerender(<OptionSelect name="test" options={OPTIONS} onChange={onChange} />);
    await waitFor(() => expect(radio('Alpha').checked).toBe(true));
  });
});
