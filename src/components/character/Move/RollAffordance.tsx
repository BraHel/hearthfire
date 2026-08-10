import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Text } from '@/components/ui';
import type { RollBand, RollStat } from '@/types';
import { bandFor, rollAction, type RollMode, type RollResult } from '@/lib/rollDice';
import styles from './RollAffordance.module.css';

// The subset of a completed roll a parent needs to log. Kept structural so Move doesn't depend on the
// session type; Moves.tsx maps it onto a LoggedRoll.
export interface RollReport {
  stat: RollStat;
  // The non-stat resource this rolled against, when there was one — the log has no other way to say
  // what the modifier stood for.
  resource?: string;
  dice: number[];
  mod: number;
  total: number;
  mode: RollMode;
  band: string | null;
}

interface RollAffordanceProps {
  stat: RollStat;
  bands: RollBand[];
  mod: number;
  // A marked debility on this stat's group pre-selects Disadvantage (still user-overridable).
  debilityDisadvantage: boolean;
  // Set when the move rolls against something the sheet can't read (+Favor, +Fortunes, +STAT, …). The
  // roll starts at 0 and the player dials the value in on the adjustment stepper.
  resource?: string;
  onRoll?: (report: RollReport) => void;
}

// How long the dice "tumble" before settling on their rolled faces.
const TUMBLE_MS = 550;

// Bounds on the hand-dialed adjustment. Wide enough for any modifier the book asks for, tight enough
// that the value stays one glyph plus a sign.
const ADJUST_MIN = -9;
const ADJUST_MAX = 9;

const MODES: { value: RollMode; label: string; title: string }[] = [
  { value: 'adv', label: 'Adv', title: 'Advantage — roll 3 dice, drop the lowest' },
  { value: 'normal', label: '—', title: 'Normal — roll 2 dice' },
  { value: 'dis', label: 'Dis', title: 'Disadvantage — roll 3 dice, drop the highest' },
];

// The trigger button's visible label: the stat it rolls (`+WIS`) or the resource it rolls against
// (`+Favor`). A bare 2d6 (`roll +nothing`) gets no label at all — a "+0" there would sit right beside the
// stepper's own "+0" and read as a duplicate.
const rollLabel = (stat: RollStat, resource: string | undefined): string => {
  if (resource) return `+${resource}`;
  return stat === 'nothing' ? '' : `+${stat}`;
};

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

export const RollAffordance = ({
  stat,
  bands,
  mod,
  debilityDisadvantage,
  resource,
  onRoll,
}: RollAffordanceProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RollMode>(debilityDisadvantage ? 'dis' : 'normal');
  const [result, setResult] = useState<RollResult | null>(null);
  const [tumbling, setTumbling] = useState(false);
  // A hand-dialed flat modifier: the resource value for a `+Favor` roll, or the "add +1 for this,
  // -1 for that" adjustments the prose asks for on top of a stat.
  const [adjust, setAdjust] = useState(0);
  const tumbleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(tumbleTimer.current), []);

  const doRoll = useCallback(
    (rollMode: RollMode) => {
      const next = rollAction(mod + adjust, rollMode);
      const band = bandFor(next.total, bands);
      setResult(next);
      setTumbling(true);
      clearTimeout(tumbleTimer.current);
      // The result is decided immediately; only the display tumbles, then settles.
      tumbleTimer.current = setTimeout(() => setTumbling(false), TUMBLE_MS);
      onRoll?.({
        stat,
        resource,
        dice: next.dice,
        mod: next.mod,
        total: next.total,
        mode: next.mode,
        band: band?.label ?? null,
      });
    },
    [mod, adjust, bands, onRoll, stat, resource],
  );

  // First tap opens the panel and rolls; the button becomes the re-roll control once open.
  const handleButton = useCallback(() => {
    if (!open) setOpen(true);
    doRoll(mode);
  }, [open, mode, doRoll]);

  const handleMode = useCallback(
    (next: RollMode) => {
      setMode(next);
      if (open) doRoll(next);
    },
    [open, doRoll],
  );

  // Tapping the stepper never re-rolls — it sets the modifier for the *next* roll, so a multi-click
  // adjustment doesn't burn a handful of rolls (or log them) on its way to the number you wanted.
  const handleAdjust = useCallback(
    (delta: number) => setAdjust((a) => Math.min(ADJUST_MAX, Math.max(ADJUST_MIN, a + delta))),
    [],
  );

  const hitBand = result && !tumbling ? bandFor(result.total, bands) : null;
  const label = rollLabel(stat, resource);
  const triggerCx = clsx(styles.trigger, open && styles.rerollIcon);
  // Marked rather than truly `disabled` at the bounds: a disabled button drops the keyboard focus that
  // is sitting on it, and the clamp in handleAdjust already makes the extra press a no-op.
  const atMin = adjust <= ADJUST_MIN;
  const atMax = adjust >= ADJUST_MAX;

  // What the settled roll actually added, read back off the result so the row keeps describing the roll
  // that was made even after the stepper has been dialed to something else for the next one.
  const modText = (rolled: RollResult): string => {
    const rolledAdjust = rolled.mod - mod;
    if (resource) return `${signed(rolled.mod)} ${resource}`;
    if (stat === 'nothing') return signed(rolled.mod);
    return `${signed(mod)} ${stat}${rolledAdjust === 0 ? '' : ` ${signed(rolledAdjust)}`}`;
  };

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <Button
          variant="ghost"
          size="sm"
          icon="dice"
          className={triggerCx}
          onClick={handleButton}
          aria-label={open ? 'Re-roll' : `Roll ${label}`.trim()}
          title={open ? 'Re-roll' : undefined}
        >
          {label && (
            <Text as="span" size="xs" font="sans" weight="semibold">
              {label}
            </Text>
          )}
        </Button>

        <div className={styles.adjust} role="group" aria-label="Roll modifier">
          <Button
            variant="ghost"
            size="sm"
            icon="minus"
            onClick={() => handleAdjust(-1)}
            aria-disabled={atMin}
            aria-label="Subtract 1 from the roll"
          />
          {/* aria-live so the value is announced as the buttons change it — the buttons' own names are
              fixed, so nothing else would speak the new number. */}
          <span className={styles.adjustValue} aria-live="polite" aria-atomic="true">
            {signed(adjust)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon="plus"
            onClick={() => handleAdjust(1)}
            aria-disabled={atMax}
            aria-label="Add 1 to the roll"
          />
        </div>
      </div>

      {open && result && (
        <div className={styles.result} role="status" aria-live="polite">
          <div className={styles.diceRow}>
            {result.dice.map((face, i) => (
              <span
                key={`die-${i}-${face}`}
                className={clsx(
                  styles.die,
                  tumbling && styles.dieTumbling,
                  !tumbling && result.dropped === i && styles.dieDropped,
                )}
                style={{ '--die-delay': `${i * 80}ms` } as React.CSSProperties}
              >
                {face}
              </span>
            ))}
            <Text as="span" size="xs" color="muted" className={styles.modText}>
              {modText(result)}
            </Text>
            <span className={clsx(styles.total, !tumbling && styles.totalSettled)}>
              = {result.total}
            </span>
            <div className={styles.modeToggle} role="group" aria-label="Advantage / disadvantage">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={clsx(styles.modeButton, mode === m.value && styles.modeButtonActive)}
                  aria-pressed={mode === m.value}
                  // Only the em-dash button needs an accessible name — its visible label is punctuation.
                  // The Adv/Dis buttons are named by their visible text; overriding it with aria-label
                  // would break "click Adv" voice control (Label in Name).
                  aria-label={m.value === 'normal' ? m.title : undefined}
                  title={m.title}
                  onClick={() => handleMode(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {hitBand && (
            <Text as="span" size="xs" weight="semibold" color="accent" className={styles.band}>
              ▸ {hitBand.label}
            </Text>
          )}
        </div>
      )}
    </div>
  );
};
