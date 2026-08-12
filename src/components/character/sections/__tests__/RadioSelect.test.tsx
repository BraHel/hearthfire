import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioSelect } from '../RadioSelect';
import type { CharacterData, RadioOption } from '@/types';

const OPTIONS: RadioOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
];

// A sheet where the player has typed their own Instinct rather than picking one.
const DATA: CharacterData = { instinct: '__custom__', instinctCustom: 'To guard the old road' };

// Same custom text, but with nothing selected yet — a chosen option collapses the
// section down to itself, which would hide the radios these tests need to click.
const UNPICKED: CharacterData = { instinct: '', instinctCustom: 'To guard the old road' };

const radio = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

afterEach(() => { vi.clearAllMocks(); });

describe('RadioSelect — which CharacterData keys a pick writes', () => {
  it('writes only dataKey when the caller names no custom key', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <RadioSelect
        playbookKey="ranger"
        title="Place of Origin"
        options={OPTIONS}
        data={DATA}
        onSave={onSave}
        dataKey="placeOfOrigin"
        noCustom
      />,
    );

    await user.click(radio('Alpha'));
    // Place of Origin has no custom field of its own. This used to also send
    // instinctCustom: '' — every origin the player chose silently erased the
    // Instinct they had written by hand.
    expect(onSave).toHaveBeenCalledWith({ placeOfOrigin: 'a' });
  });

  it('clears the custom text when the caller does name a custom key', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <RadioSelect playbookKey="ranger" options={OPTIONS} data={UNPICKED} onSave={onSave} customKey="instinctCustom" />,
    );

    await user.click(radio('Bravo'));
    // Here clearing is the point: picking a listed Instinct means abandoning the
    // custom one, so both halves of the pair move together.
    expect(onSave).toHaveBeenCalledWith({ instinct: 'b', instinctCustom: '' });
  });

  it('reads the custom text back through customKey', () => {
    render(
      <RadioSelect playbookKey="ranger" options={OPTIONS} data={DATA} onSave={vi.fn()} customKey="instinctCustom" />,
    );

    expect((screen.getByLabelText('Custom instinct') as HTMLTextAreaElement).value).toBe('To guard the old road');
  });
});
