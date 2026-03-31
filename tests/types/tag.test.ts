import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperTag } from '../../src/index';
import { getTag } from './shared';

test('ChibiccDumperTag is available through the public interfaces', async () => {
  const sample = await getTag();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperTag>();
  expect(sample.typeId).toBeGreaterThan(0);
});
