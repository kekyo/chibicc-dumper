import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperVoidType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_VOID', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperVoidType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
