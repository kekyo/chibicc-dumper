import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperVariableLengthArrayType } from '../../src/index';
import { defineTypeKindTest } from './shared';

defineTypeKindTest('TY_VLA', (dumpedType) => {
  expectTypeOf(
    dumpedType
  ).toEqualTypeOf<ChibiccDumperVariableLengthArrayType>();
  expect(dumpedType.baseTypeId).toBeGreaterThan(0);
  expect(typeof dumpedType.vlaLen.kind).toBe('string');
});
