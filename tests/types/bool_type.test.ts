import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperBooleanType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_BOOL', (dumpedType) => {
  expectTypeOf(dumpedType).toEqualTypeOf<ChibiccDumperBooleanType>();
  expect(dumpedType.size).toBeGreaterThan(0);
});
