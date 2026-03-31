import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperKeywordToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_KEYWORD', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperKeywordToken>();
  expect(token.lexeme).toBe('return');
});
