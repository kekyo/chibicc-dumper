import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperCharType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_CHAR', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperCharType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
