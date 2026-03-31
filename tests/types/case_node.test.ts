import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperCaseNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_CASE', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperCaseNode>();
  expect(node.lhs).toBeDefined();
  expect(node.label.length).toBeGreaterThan(0);
  expect(node.end).toBeGreaterThanOrEqual(node.begin);
});
