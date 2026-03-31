import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperHeaderComment } from '../../src/index';
import { getHeaderComment } from './shared';

test('ChibiccDumperHeaderComment is available through the public interfaces', async () => {
  const sample = await getHeaderComment();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperHeaderComment>();
  expect(sample.endLine).toBeGreaterThanOrEqual(sample.line);
  expect(sample.tokens.length).toBeGreaterThan(0);
});
