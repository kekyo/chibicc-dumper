import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperVariableObject } from '../../src/index';
import { getVariableObject } from './shared';

test('ChibiccDumperVariableObject is available through the public interfaces', async () => {
  const sample = await getVariableObject();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperVariableObject>();
  expect(sample.isFunction).toBe(false);
});
