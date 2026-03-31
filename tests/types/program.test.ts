import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperProgram } from '../../src/index';
import { getProgram } from './shared';

test('ChibiccDumperProgram is available through the public interfaces', async () => {
  const sample = await getProgram();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperProgram>();
  expect(sample.kind).toBe('program');
  expect(sample.globals.length).toBeGreaterThan(0);
});
