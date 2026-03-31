import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperNumberToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_NUM', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperNumberToken>();
  expect(token.value !== undefined || token.fvalue !== undefined).toBe(true);
});
