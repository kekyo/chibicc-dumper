import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperArrayType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_ARRAY', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperArrayType>();
  expect(dumpedType.baseTypeId).toBeGreaterThan(0);
  expect(dumpedType.arrayLen).toBeGreaterThanOrEqual(0);
});
