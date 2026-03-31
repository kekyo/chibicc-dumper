import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperPunctuatorToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_PUNCT', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperPunctuatorToken>();
  expect(token.lexeme.length).toBeGreaterThan(0);
});
