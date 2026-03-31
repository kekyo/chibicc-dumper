import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperStructType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_STRUCT', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperStructType>();
  expect(Array.isArray(dumpedType.members)).toBe(true);
  expect(dumpedType.members.length).toBeGreaterThan(0);
});
