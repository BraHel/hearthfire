import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toastModuleMock, addToastSpy } from '@/test/toastMock';

vi.mock('@/components/app', () => toastModuleMock());

import { useTrackedField } from '../useTrackedField';
import type { PlaybookFeatures } from '@/types';

type SaveDebounced = (patch: Partial<PlaybookFeatures>, onError?: (err: unknown) => void) => void;
type FlushDebounce = (patch: Partial<PlaybookFeatures>) => Promise<void>;

const typeInto = (value: string) => ({ target: { value } }) as React.ChangeEvent<HTMLInputElement>;

// This hook owns no timers of its own — the debounce lives in useCrewSave — so
// real timers are safe here.
afterEach(() => { vi.clearAllMocks(); });

describe('useTrackedField', () => {
  it('hands useCrewSave an onError callback that toasts', () => {
    const saveDebounced = vi.fn<SaveDebounced>();
    const flushDebounce = vi.fn<FlushDebounce>().mockResolvedValue(undefined);
    const { result } = renderHook(() => useTrackedField('', 'animalHp', saveDebounced, flushDebounce));

    act(() => { result.current.handleChange(typeInto('12')); });
    expect(result.current.value).toBe('12');
    expect(saveDebounced).toHaveBeenCalledWith({ animalHp: '12' }, expect.any(Function));

    // useCrewSave invokes this when the write rejects. Without it a failed crew or
    // companion save looked exactly like a successful one, and the player's number
    // quietly reverted on the next reload.
    act(() => { saveDebounced.mock.calls[0][1]?.(new Error('offline')); });
    expect(addToastSpy).toHaveBeenCalledWith('Failed to save.', 'error');
  });

  it('toasts when the blur flush rejects', async () => {
    const saveDebounced = vi.fn<SaveDebounced>();
    const flushDebounce = vi.fn<FlushDebounce>().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTrackedField('', 'animalHp', saveDebounced, flushDebounce));

    act(() => { result.current.handleChange(typeInto('9')); });
    await act(async () => { result.current.handleBlur(); });

    expect(flushDebounce).toHaveBeenCalledWith({ animalHp: '9' });
    expect(addToastSpy).toHaveBeenCalledWith('Failed to save.', 'error');
  });

  it('flushes the latest typed value on blur, not the one the field started with', async () => {
    const saveDebounced = vi.fn<SaveDebounced>();
    const flushDebounce = vi.fn<FlushDebounce>().mockResolvedValue(undefined);
    const { result } = renderHook(() => useTrackedField('3', 'animalArmor', saveDebounced, flushDebounce));

    act(() => { result.current.handleChange(typeInto('4')); });
    act(() => { result.current.handleChange(typeInto('5')); });
    await act(async () => { result.current.handleBlur(); });

    expect(flushDebounce).toHaveBeenCalledWith({ animalArmor: '5' });
    expect(addToastSpy).not.toHaveBeenCalled();
  });

  it('uses the caller-supplied error message', () => {
    const saveDebounced = vi.fn<SaveDebounced>();
    const flushDebounce = vi.fn<FlushDebounce>().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useTrackedField('', 'animalName', saveDebounced, flushDebounce, "Couldn't save the companion's name."),
    );

    act(() => { result.current.handleChange(typeInto('x')); });
    act(() => { saveDebounced.mock.calls[0][1]?.(new Error('offline')); });
    expect(addToastSpy).toHaveBeenCalledWith("Couldn't save the companion's name.", 'error');
  });
});
