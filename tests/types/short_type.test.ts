import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperShortType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_SHORT', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperShortType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
