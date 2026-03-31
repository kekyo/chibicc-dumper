import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperFloatType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_FLOAT', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperFloatType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
