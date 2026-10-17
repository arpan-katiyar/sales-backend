import { describe, expect, it } from 'vitest';

import { toPaisa, toRupee } from '../src/common/utils/money.js';

describe('money', () => {
  it('converts rupees to paisa with half-up rounding', () => {
    expect(toPaisa('10.005')).toBe(1001n);
    expect(toPaisa('10.004')).toBe(1000n);
    expect(toPaisa(10.5)).toBe(1050n);
    expect(toPaisa(null)).toBe(0n);
  });

  it('converts paisa back to rupees', () => {
    expect(toRupee(1001n)).toBe('10.01');
    expect(toRupee(null)).toBeNull();
  });
});
