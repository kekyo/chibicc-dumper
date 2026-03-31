import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperFunctionType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_FUNC', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperFunctionType>();
  expect(dumpedType.returnTypeId).toBeGreaterThan(0);
  expect(Array.isArray(dumpedType.paramTypeIds)).toBe(true);
});
