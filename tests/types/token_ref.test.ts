import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperTokenRef } from '../../src/index';
import { getTokenRef } from './shared';

test('ChibiccDumperTokenRef is available through the public interfaces', async () => {
  const sample = await getTokenRef();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperTokenRef>();
  expect(sample.file.endsWith('.c')).toBe(true);
  expect(sample.line).toBeGreaterThan(0);
  expect(sample.lexeme.length).toBeGreaterThan(0);
});
