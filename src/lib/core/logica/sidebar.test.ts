// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, beforeEach } from 'vitest';
import { drawerSobra, readPersisted, SIDEBAR_BREAKPOINT_PX, sidebarDesktopQuery, writePersisted } from './sidebar';

describe('persistencia', () => {
  beforeEach(() => localStorage.clear());

  it('sin clave devuelve null y no escribe', () => {
    expect(readPersisted(undefined)).toBeNull();
    writePersisted(undefined, true);
    expect(localStorage.length).toBe(0);
  });

  it('round-trip de colapsado', () => {
    writePersisted('sb', true);
    expect(readPersisted('sb')).toBe(true);
    writePersisted('sb', false);
    expect(readPersisted('sb')).toBe(false);
  });
});

describe('breakpoint', () => {
  it('los umbrales son los de sm/md/lg y `none` nunca corta', () => {
    expect(SIDEBAR_BREAKPOINT_PX).toEqual({ none: 0, sm: 640, md: 768, lg: 1024 });
    expect(sidebarDesktopQuery(1024)).toBe('(min-width: 1024px)');
  });
});

describe('drawerSobra', () => {
  it('con lugar para la barra fija el Drawer abierto sobra; cerrado, o sin lugar, no', () => {
    expect(drawerSobra(true, true)).toBe(true);
    expect(drawerSobra(true, false)).toBe(false);
    expect(drawerSobra(false, true)).toBe(false);
    expect(drawerSobra(false, false)).toBe(false);
  });
});
