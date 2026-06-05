import { act } from '@testing-library/react';

export async function flushAsyncEffects(cycles = 3) {
  for (let index = 0; index < cycles; index += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
    });
  }
}
