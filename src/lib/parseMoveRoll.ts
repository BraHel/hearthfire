import type { MoveDefinition, MoveRoll, RollBand, RollStat } from '@/types';
import { STAT_ABBRS } from './constants';

// Whatever the prose says to roll against: one of the six PC stats, `nothing` (a bare 2d6), or a
// resource the character sheet doesn't hold (+Favor, +Population, +Defenses, +STAT, …). The sheet can't
// resolve that last group, so those roll from 0 and the player dials the value in on the affordance's
// adjustment stepper — which is also how "add +1 for this, -1 for that" prose gets applied.
const ROLL_TARGET_RE = /\broll \+([a-z]+)\b/i;

// The stat alternation is derived from the shared STATS table so it can't drift from the rest of the app.
const STAT_TARGETS = new Set<string>(STAT_ABBRS);

// Outcome bands as written in the prose, with or without the surrounding `**` bold markers (blessed.ts
// bolds them, special.ts does not). Ordered specific-before-general so "7-9" wins over the bare "7-".
const BAND_RANGE_RE = /on a (\d+)-(\d+)/gi; // e.g. "7-9"
const BAND_PLUS_RE = /on a (\d+)\+/gi; // e.g. "10+", "7+", "12+"
const BAND_MISS_RE = /on a (\d+)-(?!\d)/gi; // e.g. "6-" (a trailing dash, not a range)

// Flatten a move's body into one string of its textual blocks. Bands and the roll trigger can live in
// different blocks (a `para` naming the roll, a following `list` of outcomes), so we scan the whole body.
const bodyText = (move: MoveDefinition): string =>
  (move.body ?? [])
    .map((block) => {
      if (block.kind === 'para') return block.text;
      if (block.kind === 'list') return block.items.join(' ');
      return '';
    })
    .join(' ');

// Collect distinct bands from the text, sorted by threshold descending (10+ before 7-9 before 6-), so
// the affordance can present them best-first and highlight the one the total lands in.
const parseBands = (text: string): RollBand[] => {
  const byLabel = new Map<string, RollBand>();
  const add = (band: RollBand) => {
    if (!byLabel.has(band.label)) byLabel.set(band.label, band);
  };

  for (const [, lo, hi] of text.matchAll(BAND_RANGE_RE)) {
    const min = Number(lo);
    add({ label: `${lo}-${hi}`, min, max: Number(hi) });
  }
  for (const [, lo] of text.matchAll(BAND_PLUS_RE)) {
    const min = Number(lo);
    add({ label: `${lo}+`, min, max: null });
  }
  for (const [, hi] of text.matchAll(BAND_MISS_RE)) {
    const max = Number(hi);
    // A "6-" miss band: everything at or below the threshold.
    add({ label: `${hi}-`, min: 0, max });
  }

  return [...byLabel.values()].sort((a, b) => b.min - a.min);
};

// Parse a move for a rollable action. Returns null (→ no roll button) unless the prose says "roll +"
// something. Only the first `roll +X` is used; the handful of multi-roll moves in the book roll their
// first target in v1 (a documented limitation).
export const parseMoveRoll = (move: MoveDefinition): MoveRoll | null => {
  const text = bodyText(move);
  const match = text.match(ROLL_TARGET_RE);
  if (!match) return null;

  const target = match[1].toUpperCase();
  const bands = parseBands(text);

  if (STAT_TARGETS.has(target)) return { stat: target as RollStat, bands };
  if (target === 'NOTHING') return { stat: 'nothing', bands };

  // A resource roll: nothing on the sheet to read, so it starts at 0 and keeps the prose's own wording
  // for the button label ('+Favor', '+STAT') so the player can see what they're dialing in.
  return { stat: 'nothing', bands, resource: match[1] };
};
