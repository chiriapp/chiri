import { vi } from 'vitest';

type UUID = ReturnType<typeof crypto.randomUUID>;

/**
 * pin `crypto.randomUUID` so tests can assert on generated ids
 */
export const stubRandomUUID = (next: string | (() => string)) => {
  const generate = typeof next === 'string' ? () => next : next;
  return vi.spyOn(crypto, 'randomUUID').mockImplementation(generate as () => UUID);
};
