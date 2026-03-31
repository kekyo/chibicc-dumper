import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperEndOfFileToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_EOF', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperEndOfFileToken>();
  expect(token.lexeme).toBe('');
});
