import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperScope } from '../../src/index';
import { getScope } from './shared';

test('ChibiccDumperScope is available through the public interfaces', async () => {
  const sample = await getScope();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperScope>();
  expect(sample.id).toBeGreaterThan(0);
});
