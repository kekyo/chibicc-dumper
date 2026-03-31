import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperMember } from '../../src/index';
import { getMember } from './shared';

test('ChibiccDumperMember is available through the public interfaces', async () => {
  const sample = await getMember();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperMember>();
  expect(sample.typeId).toBeGreaterThan(0);
});
