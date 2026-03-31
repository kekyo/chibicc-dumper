import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperCommentToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_COMMENT', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperCommentToken>();
  expect(token.commentStyle === 'line' || token.commentStyle === 'block').toBe(
    true
  );
  expect(token.endLine).toBeGreaterThanOrEqual(token.line);
  expect(token.text.length).toBeGreaterThan(0);
});
