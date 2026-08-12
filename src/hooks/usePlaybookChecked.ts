import { useState, useCallback } from 'react';
import { useLatest } from './useLatest';
import { resolvePlaybookFeatures, featurePatch } from '@/lib/resolvePlaybookFeatures';
import { useOptimisticField } from './useOptimisticField';
import { useDebouncedSave } from './useDebouncedSave';
import { useFirestoreSync } from './useFirestoreSync';
import type { CharacterData, PlaybookFeatures } from '@/types';

// Intentionally broad — callers are responsible for passing the right key type.
// A narrower mapped type resolves to `never` for optional keys in strict mode.
type FeatureKey = keyof PlaybookFeatures;

const SAVE_ERROR = 'Failed to save. Try again.';

// Frozen module-level defaults, not fresh `{}` literals: the seed value and the
// synced remote value must be reference-identical when the feature key is absent,
// or the first sync would re-render with an equal-but-new object every mount.
const EMPTY_CHECKED: Record<string, boolean> = {};
const EMPTY_ANSWERS: Record<string, string> = {};

const featureRecord = <T,>(data: CharacterData | undefined, key: FeatureKey, fallback: T): T =>
  (resolvePlaybookFeatures(data)[key] as T | undefined) ?? fallback;

interface UsePlaybookCheckedReturn {
  checked: Record<string, boolean>;
  handleChange: (id: string, value: boolean) => void;
}

interface UsePlaybookCheckedWithAnswersReturn extends UsePlaybookCheckedReturn {
  answers: Record<string, string>;
  handleAnswer: (key: string, value: string) => void;
  flushAnswers: () => void;
}

// The checkbox half, shared by both exported hooks. Delegates the optimistic
// value, rollback, error toast, and remote-echo gating to useOptimisticField
// rather than re-implementing them — that hook's useFirestoreSync also *defers*
// a remote value that lands mid-save and flushes it on settle, where the
// hand-rolled guard this replaced dropped it outright (#171).
const useCheckedField = (
  data: CharacterData | undefined,
  onSave: (data: Partial<CharacterData>) => Promise<void>,
  checkedKey: FeatureKey,
): UsePlaybookCheckedReturn => {
  const onSaveRef = useLatest(onSave);
  const dataRef = useLatest(data);

  const { value: checked, save } = useOptimisticField(
    featureRecord(data, checkedKey, EMPTY_CHECKED),
    (next) => onSaveRef.current(featurePatch(dataRef.current, { [checkedKey]: next })),
    SAVE_ERROR,
  );

  const handleChange = useCallback((id: string, value: boolean) => {
    // Transform form, so the next value is computed from the freshest committed
    // state — two quick toggles can't clobber each other through a stale closure.
    save((current) => ({ ...current, [id]: value }));
  }, [save]);

  return { checked, handleChange };
};

export const usePlaybookChecked = useCheckedField;

export const usePlaybookCheckedWithAnswers = (
  data: CharacterData | undefined,
  onSave: (data: Partial<CharacterData>) => Promise<void>,
  checkedKey: FeatureKey,
  answersKey: FeatureKey,
): UsePlaybookCheckedWithAnswersReturn => {
  const { checked, handleChange } = useCheckedField(data, onSave, checkedKey);
  const onSaveRef = useLatest(onSave);
  const dataRef = useLatest(data);

  // Answers are free text, so they debounce rather than saving per keystroke.
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => featureRecord(data, answersKey, EMPTY_ANSWERS),
  );
  const answersRef = useLatest(answers);

  const saveAnswers = useCallback(
    (a: Record<string, string>) => onSaveRef.current(featurePatch(dataRef.current, { [answersKey]: a })),
    [answersKey], // eslint-disable-line react-hooks/exhaustive-deps -- onSaveRef/dataRef are stable refs
  );
  const { onChange: debouncedAnswers, flush, isPendingRef } = useDebouncedSave(saveAnswers);

  // Same deferred-flush gate as the checkbox half. useDebouncedSave re-renders on
  // settle (its isPending state), which is what lets the deferred value flush.
  useFirestoreSync(featureRecord(data, answersKey, EMPTY_ANSWERS), setAnswers, isPendingRef);

  const handleAnswer = useCallback((key: string, value: string) => {
    const next = { ...answersRef.current, [key]: value };
    setAnswers(next);
    debouncedAnswers(next);
  }, [debouncedAnswers]); // eslint-disable-line react-hooks/exhaustive-deps -- answersRef is a stable ref

  const handleFlushAnswers = useCallback(() => {
    flush(answersRef.current);
  }, [flush]); // eslint-disable-line react-hooks/exhaustive-deps -- answersRef is a stable ref

  return { checked, handleChange, answers, handleAnswer, flushAnswers: handleFlushAnswers };
};
