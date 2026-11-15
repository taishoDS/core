// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadLucideAliases } from './lucide-aliases';

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const svg = (name: string, body: string) =>
  `<!-- @license -->\n<svg\n  class="lucide lucide-${name}"\n  viewBox="0 0 24 24"\n>\n  ${body}\n</svg>\n`;

function fakeLucide(icons: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-lucide-'));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'icons'));
  for (const [n, b] of Object.entries(icons)) fs.writeFileSync(path.join(dir, 'icons', `${n}.svg`), svg(n, b));
  return dir;
}

describe('loadLucideAliases — alias → canónico derivado del paquete', () => {
  it('un .svg sin entrada en icon-nodes y con el mismo contenido que un canónico es su alias', () => {
    const dir = fakeLucide({
      trash: '<path d="M3 6h18" />',
      'trash-2': '<path d="M3 6h18" />',
      sun: '<circle cx="12" cy="12" r="4" />',
    });
    expect(loadLucideAliases(dir, { trash: [], sun: [] })).toEqual({ 'trash-2': 'trash' });
  });

  it('un .svg sin canónico equivalente no se inventa como alias', () => {
    const dir = fakeLucide({ trash: '<path d="M3 6h18" />', huerfano: '<path d="M0 0" />' });
    expect(loadLucideAliases(dir, { trash: [] })).toEqual({});
  });

  it('sin carpeta icons/ (lucide-static viejo o ausente) no hay alias', () => {
    expect(loadLucideAliases(os.tmpdir() + '/no-existe-taisho', {})).toEqual({});
  });

  it('contra el lucide-static instalado: trash-2 sigue vivo y resuelve a un canónico real', () => {
    const dir = path.resolve(process.cwd(), 'node_modules/lucide-static');
    const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'icon-nodes.json'), 'utf-8'));
    const aliases = loadLucideAliases(dir, nodes);
    for (const canonical of Object.values(aliases)) expect(nodes[canonical]).toBeDefined();
    for (const alias of Object.keys(aliases)) expect(nodes[alias]).toBeUndefined();
    expect(nodes['trash-2'] ?? nodes[aliases['trash-2']]).toBeDefined();
  });
});
