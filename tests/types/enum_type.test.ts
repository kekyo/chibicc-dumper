import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperEnumType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_ENUM', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperEnumType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
