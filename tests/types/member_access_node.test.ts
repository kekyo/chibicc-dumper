import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperMemberAccessNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_MEMBER', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperMemberAccessNode>();
  expect(node.lhs).toBeDefined();
  expect(node.member.typeId).toBeGreaterThan(0);
});
