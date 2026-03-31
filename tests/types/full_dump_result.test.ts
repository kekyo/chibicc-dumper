import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperFullDumpResult } from '../../src/index';
import { getFullResult } from './shared';

test('ChibiccDumperFullDumpResult is available through the public interfaces', async () => {
  const sample = await getFullResult();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperFullDumpResult>();
  expect(sample.tokens.length).toBeGreaterThan(0);
  expect(sample.ast.kind).toBe('program');
});
