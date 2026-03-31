import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperDumpResult } from '../../src/index';
import { getDumpResult } from './shared';

test('ChibiccDumperDumpResult is available through the public interfaces', async () => {
  const sample = await getDumpResult();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperDumpResult>();
  expect(sample.types.length).toBeGreaterThan(0);
});
