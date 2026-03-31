import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperLongType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_LONG', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperLongType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
