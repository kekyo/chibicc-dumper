import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperStringToken } from '../../src/index';
import { defineTokenKindTest } from './shared';

defineTokenKindTest('TK_STR', (token) => {
  expectTypeOf(token).toEqualTypeOf<ChibiccDumperStringToken>();
  expect(token.stringBytes.length).toBeGreaterThan(0);
});
