import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperDoubleType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_DOUBLE', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperDoubleType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
