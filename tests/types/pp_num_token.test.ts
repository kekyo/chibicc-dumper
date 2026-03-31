import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperPreprocessingNumberToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_PP_NUM', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperPreprocessingNumberToken>();
  expect(token.lexeme.length).toBeGreaterThan(0);
});
