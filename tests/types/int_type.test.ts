import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperIntType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_INT', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperIntType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
