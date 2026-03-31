import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperNumberNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_NUM', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperNumberNode>();
  expect(node.value !== undefined || node.fvalue !== undefined).toBe(true);
});
