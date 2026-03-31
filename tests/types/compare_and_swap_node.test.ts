import { expect, expectTypeOf } from 'vitest';
import type { ChibiccDumperCompareAndSwapNode } from '../../src/index';
import { defineNodeKindTest } from './shared';

defineNodeKindTest('ND_CAS', (node) => {
  expectTypeOf(node).toEqualTypeOf<ChibiccDumperCompareAndSwapNode>();
  expect(node.casAddr).toBeDefined();
  expect(node.casOld).toBeDefined();
  expect(node.casNew).toBeDefined();
});
