import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperTypedef } from '../../src/index';
import { getTypedef } from './shared';

test('ChibiccDumperTypedef is available through the public interfaces', async () => {
  const sample = await getTypedef();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperTypedef>();
  expect(sample.typeId).toBeGreaterThan(0);
});
