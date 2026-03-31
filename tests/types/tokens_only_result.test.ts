import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperTokensOnlyResult } from '../../src/index';
import { getTokensOnlyResult } from './shared';

test('ChibiccDumperTokensOnlyResult is available through the public interfaces', async () => {
  const sample = await getTokensOnlyResult();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperTokensOnlyResult>();
  expect(sample.tokens.length).toBeGreaterThan(0);
  expect('ast' in sample).toBe(false);
});
