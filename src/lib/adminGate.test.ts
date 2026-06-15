import { describe, it, expect } from 'vitest';
import { ADMIN_GATE_STORAGE_KEY, isPasscodeCorrect } from './adminGate';

describe('ADMIN_GATE_STORAGE_KEY', () => {
  // The inline gate script and the helper must agree on the sessionStorage key.
  it('is the stable admin-unlocked key', () => {
    expect(ADMIN_GATE_STORAGE_KEY).toBe('admin-unlocked');
  });
});

describe('isPasscodeCorrect', () => {
  // The happy path: an exact match unlocks.
  it('accepts an exact match', () => {
    expect(isPasscodeCorrect('open-sesame', 'open-sesame')).toBe(true);
  });

  // A wrong value is rejected.
  it('rejects a wrong value', () => {
    expect(isPasscodeCorrect('nope', 'open-sesame')).toBe(false);
  });

  // Surrounding whitespace on the input is trimmed before comparing.
  it('trims surrounding whitespace on the input', () => {
    expect(isPasscodeCorrect('  open-sesame  ', 'open-sesame')).toBe(true);
  });

  // Surrounding whitespace on the expected passcode is trimmed too.
  it('trims surrounding whitespace on the expected value', () => {
    expect(isPasscodeCorrect('open-sesame', '  open-sesame  ')).toBe(true);
  });

  // An empty expected passcode never matches — a blank build value must not
  // unlock the dashboard for everyone.
  it('never matches an empty expected passcode', () => {
    expect(isPasscodeCorrect('', '')).toBe(false);
    expect(isPasscodeCorrect('anything', '   ')).toBe(false);
  });

  // The comparison is case-sensitive (a deterrent, but not a careless one).
  it('is case-sensitive', () => {
    expect(isPasscodeCorrect('Open-Sesame', 'open-sesame')).toBe(false);
  });
});
