// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { filterItems, commandKeyAction, type CommandItem } from './command-palette';

const noop = () => {};

const items: CommandItem[] = [
  { id: '1', label: 'Crear proyecto',    group: 'Proyectos', keywords: ['new', 'project'], action: noop },
  { id: '2', label: 'Abrir archivo',     group: 'Archivos',  description: 'Navegar archivos recientes', action: noop },
  { id: '3', label: 'Configuración',     group: 'Sistema',   keywords: ['settings', 'config'], action: noop },
  { id: '4', label: 'Cerrar ventana',    group: 'Sistema',   action: noop },
  { id: '5', label: 'Buscar en proyecto', group: 'Proyectos', action: noop },
];

describe('filterItems', () => {
  it('retorna todos los ítems con query vacía', () => {
    expect(filterItems(items, '')).toHaveLength(items.length);
  });

  it('filtra por label (case-insensitive)', () => {
    const r = filterItems(items, 'crear');
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('1');
  });

  it('filtra por keyword', () => {
    const r = filterItems(items, 'settings');
    expect(r.some((i) => i.id === '3')).toBe(true);
  });

  it('filtra por description', () => {
    const r = filterItems(items, 'recientes');
    expect(r.some((i) => i.id === '2')).toBe(true);
  });

  it('prioriza label sobre keywords sobre description', () => {
    const r = filterItems(items, 'pro');
    expect(r[0].id === '1' || r[0].id === '5').toBe(true);
  });

  it('retorna vacío si no hay coincidencias', () => {
    expect(filterItems(items, 'xyzabc')).toHaveLength(0);
  });

  it('ignora espacios en blanco en la query', () => {
    expect(filterItems(items, '  ')).toHaveLength(items.length);
  });
});

describe('commandKeyAction', () => {
  it('flechas, Enter y Escape tienen acción', () => {
    expect(commandKeyAction('ArrowDown')).toBe('next');
    expect(commandKeyAction('ArrowUp')).toBe('prev');
    expect(commandKeyAction('Enter')).toBe('choose');
    expect(commandKeyAction('Escape')).toBe('close');
  });

  it('Inicio y Fin son del cursor de la entrada: no tienen acción', () => {
    expect(commandKeyAction('Home')).toBeNull();
    expect(commandKeyAction('End')).toBeNull();
    expect(commandKeyAction('a')).toBeNull();
  });
});
