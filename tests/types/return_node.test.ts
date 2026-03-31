import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperReturnNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_RETURN', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperReturnNode>();
  expect(node.lhs).toBeDefined();
});
