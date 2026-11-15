// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { parseSvgIcon, lucideToEntry, suggestClosest, levenshtein, parseIconAnnotations, parseIconSlots } from './icon-utils';

describe('parseSvgIcon', () => {
  it('SVG estilo lucide (fill=none, stroke=currentColor) → stroke:true, viewBox y body', () => {
    const raw = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/></svg>`;
    const e = parseSvgIcon(raw);
    expect(e.viewBox).toBe('0 0 24 24');
    expect(e.stroke).toBe(true);
    expect(e.body).toBe('<path d="M5 12h14"/>');
  });

  it('SVG con rellenos propios → stroke:false, preserva viewBox propio', () => {
    const raw = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#ff0000"/></svg>`;
    const e = parseSvgIcon(raw);
    expect(e.viewBox).toBe('0 0 48 48');
    expect(e.stroke).toBe(false);
    expect(e.body).toContain('fill="#ff0000"');
  });

  it('sin viewBox → default 0 0 24 24', () => {
    expect(parseSvgIcon('<svg fill="none"><path/></svg>').viewBox).toBe('0 0 24 24');
  });
});

describe('lucideToEntry', () => {
  it('serializa nodos a markup con stroke y viewBox 24', () => {
    const e = lucideToEntry([['path', { d: 'M5 12h14' }], ['circle', { cx: 12, cy: 12, r: 3 }]]);
    expect(e.stroke).toBe(true);
    expect(e.viewBox).toBe('0 0 24 24');
    expect(e.body).toBe('<path d="M5 12h14" /><circle cx="12" cy="12" r="3" />');
  });
});

describe('suggestClosest', () => {
  it('sugiere el nombre más parecido ante un typo', () => {
    expect(suggestClosest('circle-chek', ['circle-check', 'circle-alert', 'square'])).toBe('circle-check');
  });
  it('no sugiere nada si no hay nada razonablemente cercano', () => {
    expect(suggestClosest('xyz', ['completely-different-icon'])).toBeNull();
  });
  it('levenshtein básico', () => {
    expect(levenshtein('check', 'chek')).toBe(1);
  });
});

describe('parseIconAnnotations', () => {
  it('lee una lista simple', () => {
    expect(parseIconAnnotations('// @taisho-icons: sun, moon')).toEqual(['sun', 'moon']);
  });

  it('REGRESIÓN: el último ícono no se come la línea siguiente', () => {
    const code = [
      '  // @taisho-icons: square-stack, database',
      "  const navItems = [{ icon: 'square-stack' }];",
    ].join('\n');
    expect(parseIconAnnotations(code)).toEqual(['square-stack', 'database']);
  });

  it('acepta la forma comentario HTML y varias anotaciones en un archivo', () => {
    const code = '<!-- @taisho-icons: house -->\n// @taisho-icons: bell, star\nlet x = 1;';
    expect(parseIconAnnotations(code)).toEqual(['house', 'bell', 'star']);
  });

  it('tolera espacios extra y no devuelve entradas vacías', () => {
    expect(parseIconAnnotations('// @taisho-icons:   sun ,  moon ,')).toEqual(['sun', 'moon']);
  });

  it('sin anotaciones devuelve lista vacía', () => {
    expect(parseIconAnnotations('const a = 1; // nada acá')).toEqual([]);
  });
});

describe('parseIconSlots', () => {
  it('detecta la forma de ATRIBUTO', () => {
    expect(parseIconSlots('<Note hintIcon="info" /> <Foo icon="x" />')).toEqual(['info', 'x']);
  });

  it('detecta la forma de PROPIEDAD (API data-driven de Sidebar/Menu)', () => {
    const code = `const items = [{ label: 'Uno', icon: 'square-stack' }, { label: 'Dos', icon: 'database' }];`;
    expect(parseIconSlots(code)).toEqual(['square-stack', 'database']);
  });

  it('no confunde props que terminan en "icon"', () => {
    expect(parseIconSlots('<Foo showIcon="true" customIcon="bar" />')).toEqual([]);
  });

  it('tolera espacios alrededor del separador', () => {
    expect(parseIconSlots("{ icon : 'house' }")).toEqual(['house']);
  });

  it('sin slots devuelve lista vacía', () => {
    expect(parseIconSlots('const a = 1;')).toEqual([]);
  });
});
