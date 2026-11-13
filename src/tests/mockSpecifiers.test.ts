import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../../vitest.config';

// vi.mock() silently registers a mock that never matches when its specifier doesn't resolve
const MOCK_CALL = /vi\.(?:do)?mock\(\s*(['"])([^'"]+)\1/g;

const aliases = config.resolve?.alias as Record<string, string>;
const root = resolve(import.meta.dirname, '../..');
const testsRoot = join(root, 'src/tests');
const extensions = ['', '.ts', '.tsx', '.d.ts', '/index.ts', '/index.tsx'];

const testFiles = readdirSync(testsRoot, { recursive: true, encoding: 'utf8' })
  .filter((entry) => /\.test\.tsx?$/u.test(entry))
  .map((entry) => join(testsRoot, entry));

const resolves = (path: string) =>
  extensions.some((extension) => existsSync(`${path}${extension}`));

const resolveAlias = (specifier: string): string | null => {
  const match = Object.keys(aliases)
    .filter((alias) => specifier === alias || specifier.startsWith(`${alias}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (!match) return null;
  return aliases[match] + specifier.slice(match.length);
};

const unresolved = testFiles.flatMap((file) => {
  const source = readFileSync(file, 'utf8');

  return [...source.matchAll(MOCK_CALL)].flatMap(([, , specifier]) => {
    if (specifier.startsWith('.')) {
      return resolves(resolve(dirname(file), specifier)) ? [] : [`${specifier} (in ${file})`];
    }

    const path = resolveAlias(specifier);
    if (path === null) return [];

    return resolves(path) ? [] : [`${specifier} (in ${file})`];
  });
});

describe('mock specifiers', () => {
  it('all resolve to modules that exist', () => {
    expect(unresolved).toEqual([]);
  });
});
