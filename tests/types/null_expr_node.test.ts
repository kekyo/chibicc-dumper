import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperNullExprNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_NULL_EXPR', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperNullExprNode>();
});
