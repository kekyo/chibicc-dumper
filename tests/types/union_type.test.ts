import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperUnionType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_UNION', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperUnionType>();
  expect(Array.isArray(dumpedType.members)).toBe(true);
  expect(dumpedType.members.length).toBeGreaterThan(0);
});
