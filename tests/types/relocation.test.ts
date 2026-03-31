import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperRelocation } from '../../src/index';
import { getRelocation } from './shared';

test('ChibiccDumperRelocation is available through the public interfaces', async () => {
  const sample = await getRelocation();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperRelocation>();
  expect(sample.offset).toBeGreaterThanOrEqual(0);
});
