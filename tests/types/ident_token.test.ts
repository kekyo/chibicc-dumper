import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperIdentifierToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_IDENT', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperIdentifierToken>();
  expect(token.lexeme.length).toBeGreaterThan(0);
});
