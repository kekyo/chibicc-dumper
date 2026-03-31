import { expect, expectTypeOf, test } from 'vitest';
import type { ChibiccDumperVariableRef } from '../../src/index';
import { getVariableRef } from './shared';

test('ChibiccDumperVariableRef is available through the public interfaces', async () => {
  const sample = await getVariableRef();
  expectTypeOf(sample).toEqualTypeOf<ChibiccDumperVariableRef>();
  expect(sample.typeId).toBeGreaterThan(0);
});
