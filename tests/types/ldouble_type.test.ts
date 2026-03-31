import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLongDoubleType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_LDOUBLE', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperLongDoubleType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
