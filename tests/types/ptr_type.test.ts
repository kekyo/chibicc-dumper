import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperPointerType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_PTR', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperPointerType>();
  expect(dumpedType.baseTypeId).toBeGreaterThan(0);
});
