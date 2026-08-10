import { describe, it, expect, afterEach, vi } from 'vitest';
import { rollAction, remodeRoll, statModifier, resolveRollStat, bandFor } from '../rollDice';
import type { CharacterData, RollBand } from '@/types';

const BANDS: RollBand[] = [
  { label: '10+', min: 10, max: null },
  { label: '7-9', min: 7, max: 9 },
  { label: '6-', min: 0, max: 6 },
];

afterEach(() => vi.restoreAllMocks());

// Force a fixed sequence of d6 values (Math.random returns [0,1); (v*6|0)+1 gives the face).
const seedDice = (faces: number[]) => {
  const values = faces.map((f) => (f - 1) / 6 + 0.001);
  let i = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % values.length]);
};

describe('rollAction', () => {
  it('normal rolls exactly 2 dice, drops none, total = dice + mod', () => {
    const r = rollAction(2, 'normal');
    expect(r.dice).toHaveLength(2);
    expect(r.dropped).toBeNull();
    expect(r.total).toBe(r.dice[0] + r.dice[1] + 2);
  });

  it('advantage rolls 3 dice and drops the lowest', () => {
    seedDice([2, 5, 3]);
    const r = rollAction(0, 'adv');
    expect(r.dice).toEqual([2, 5, 3]);
    expect(r.dropped).toBe(0); // the 2 is lowest
    expect(r.total).toBe(5 + 3);
  });

  it('disadvantage rolls 3 dice and drops the highest', () => {
    seedDice([2, 5, 3]);
    const r = rollAction(1, 'dis');
    expect(r.dice).toEqual([2, 5, 3]);
    expect(r.dropped).toBe(1); // the 5 is highest
    expect(r.total).toBe(2 + 3 + 1);
  });
});

describe('remodeRoll', () => {
  it('keeps the dice already rolled and adds a third for advantage', () => {
    seedDice([2, 5]);
    const first = rollAction(1, 'normal');
    expect(first.dice).toEqual([2, 5]);

    seedDice([6]);
    const adv = remodeRoll(first, 'adv', null);
    // The original 2 and 5 survive; only the third die is new.
    expect(adv.dice).toEqual([2, 5, 6]);
    expect(adv.dropped).toBe(0); // the 2 is lowest
    expect(adv.total).toBe(5 + 6 + 1);
  });

  it('drops the highest for disadvantage, carrying the same modifier', () => {
    seedDice([2, 5]);
    const first = rollAction(-1, 'normal');

    seedDice([6]);
    const dis = remodeRoll(first, 'dis', null);
    expect(dis.dice).toEqual([2, 5, 6]);
    expect(dis.total).toBe(2 + 5 - 1);
  });

  it('returns the original two dice when switched back to normal', () => {
    seedDice([2, 5, 6]);
    const adv = rollAction(0, 'adv');

    const back = remodeRoll(adv, 'normal', null);
    expect(back.dice).toEqual([2, 5]);
    expect(back.dropped).toBeNull();
    expect(back.total).toBe(2 + 5);
  });

  // Otherwise toggling normal → adv → normal → adv would be a free re-roll of the third die.
  it('reuses the spare die instead of rolling a fresh one', () => {
    seedDice([2, 5, 1]); // a 1 sits next in the sequence for anything that re-rolls
    const first = rollAction(0, 'normal');

    const adv = remodeRoll(first, 'adv', 6);
    // The spare 6 comes back, not the 1 the generator would have handed out.
    expect(adv.dice).toEqual([2, 5, 6]);
  });
});

describe('statModifier', () => {
  it.each([
    ['2', 2],
    ['-1', -1],
    ['0', 0],
    ['-', 0],
    ['', 0],
    [undefined, 0],
  ])('coerces %s → %i', (input, expected) => {
    expect(statModifier(input as string | undefined)).toBe(expected);
  });
});

describe('resolveRollStat', () => {
  it('reads the stat field and its paired debility', () => {
    const data = { statWis: '2', debilityDazed: true } as CharacterData;
    expect(resolveRollStat('WIS', data)).toEqual({ mod: 2, debilityDisadvantage: true });
  });

  it('WIS disadvantage comes from dazed, not weakened/miserable', () => {
    const data = { statWis: '1', debilityWeakened: true, debilityMiserable: true } as CharacterData;
    expect(resolveRollStat('WIS', data).debilityDisadvantage).toBe(false);
  });

  it('nothing has no modifier and never a debility', () => {
    const data = { debilityDazed: true } as CharacterData;
    expect(resolveRollStat('nothing', data)).toEqual({ mod: 0, debilityDisadvantage: false });
  });

  it('defaults cleanly with no data', () => {
    expect(resolveRollStat('CON', undefined)).toEqual({ mod: 0, debilityDisadvantage: false });
  });
});

describe('bandFor', () => {
  it.each([
    [11, '10+'],
    [10, '10+'],
    [9, '7-9'],
    [7, '7-9'],
    [6, '6-'],
    [2, '6-'],
  ])('total %i lands in %s', (total, label) => {
    expect(bandFor(total, BANDS)?.label).toBe(label);
  });

  it('returns null when no band matches', () => {
    expect(bandFor(8, [{ label: '10+', min: 10, max: null }])).toBeNull();
  });
});
