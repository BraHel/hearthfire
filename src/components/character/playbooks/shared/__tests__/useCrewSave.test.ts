import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCrewSave } from '../useCrewSave';

// Placeholder keys — the real ones are animal-type ids from the Ranger playbook.
const PATCH = { animalTypeCustom: { 'type-a': 'first' } };
const LATER_PATCH = { animalTypeCustom: { 'type-a': 'second' } };

// useCrewSave owns a 1000ms debounce and mounts no ToastProvider, so fake timers
// are safe here — advance them explicitly instead of polling with waitFor.
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('useCrewSave — how a failed write reaches the caller', () => {
  it('calls onError when the debounced write rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    const onError = vi.fn();
    const { result } = renderHook(() => useCrewSave(undefined, onSave));

    act(() => { result.current.saveDebounced(PATCH, onError); });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onSave).toHaveBeenCalledWith({ playbookFeatures: PATCH });
    expect(onError).toHaveBeenCalled();
  });

  it('drops the failure silently when the caller passes no onError', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCrewSave(undefined, onSave));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    act(() => { result.current.saveDebounced(PATCH); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    process.off('unhandledRejection', unhandled);

    // No crash and no warning — which is exactly why every call site has to pass
    // onError. A field that skips it looks identical whether the write landed or not.
    expect(onSave).toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('rejects the flushDebounce promise so a blur handler can catch it', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCrewSave(undefined, onSave));
    const caught = vi.fn();

    // flushDebounce only writes when a debounce is actually outstanding.
    act(() => { result.current.saveDebounced(PATCH); });
    await act(async () => { await result.current.flushDebounce(LATER_PATCH).catch(caught); });

    // The blur payload wins — it carries whatever the field held at blur time.
    expect(onSave).toHaveBeenCalledWith({ playbookFeatures: LATER_PATCH });
    expect(caught).toHaveBeenCalled();
  });

  it('resolves flushDebounce without writing when nothing is outstanding', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCrewSave(undefined, onSave));

    await act(async () => { await result.current.flushDebounce(PATCH); });
    expect(onSave).not.toHaveBeenCalled();
  });
});
