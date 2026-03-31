import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperAsmNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_ASM', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperAsmNode>();
  expect(node.asm.length).toBeGreaterThan(0);
});
