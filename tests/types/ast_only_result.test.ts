import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperAstOnlyResult } from '../../src/index';
import { getAstOnlyResult } from './shared';

test('ChibiccDumperAstOnlyResult is available through the public interfaces', async () => {
  const sample = await getAstOnlyResult();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperAstOnlyResult>();
  expect(sample.ast.kind).toBe('program');
  expect('tokens' in sample).toBe(false);
});
