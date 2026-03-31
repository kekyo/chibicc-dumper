import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperLocalObject } from '../../src/index';
import { getLocalObject } from './shared';

test('ChibiccDumperLocalObject is available through the public interfaces', async () => {
  const sample = await getLocalObject();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperLocalObject>();
  expect(sample.isFunction).toBe(false);
});
