import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperFunctionObject } from '../../src/index';
import { getFunctionObject } from './shared';

test('ChibiccDumperFunctionObject is available through the public interfaces', async () => {
  const sample = await getFunctionObject();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperFunctionObject>();
  expect(sample.isFunction).toBe(true);
  expect(sample.body.kind).toBe('ND_BLOCK');
});
