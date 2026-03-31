import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperBlockNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_BLOCK', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperBlockNode>();
  expect(Array.isArray(node.body)).toBe(true);
});
