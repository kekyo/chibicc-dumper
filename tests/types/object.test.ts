import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperObject } from '../../src/index';
import { getObject } from './shared';

test('ChibiccDumperObject is available through the public interfaces', async () => {
  const sample = await getObject();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperObject>();
  expect(sample.typeId).toBeGreaterThan(0);
});
