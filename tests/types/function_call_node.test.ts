import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperFunctionCallNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_FUNCALL', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperFunctionCallNode>();
  expect(node.lhs).toBeDefined();
  expect(Array.isArray(node.args)).toBe(true);
  expect(node.funcTypeId).toBeGreaterThan(0);
});
