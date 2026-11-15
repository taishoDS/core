// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDebouncer } from './input';

describe('Input — createDebouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispara una sola vez tras una ráfaga de "tipeo", con el último valor', () => {
    const onFire = vi.fn();
    const debouncer = createDebouncer();

    debouncer.schedule('b', 300, onFire);
    vi.advanceTimersByTime(100);
    debouncer.schedule('br', 300, onFire);
    vi.advanceTimersByTime(100);
    debouncer.schedule('bruno', 300, onFire);
    vi.advanceTimersByTime(299);
    expect(onFire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFire).toHaveBeenCalledTimes(1);
    expect(onFire).toHaveBeenCalledWith('bruno');
  });

  it('delay 0 dispara sin esperar', () => {
    const onFire = vi.fn();
    const debouncer = createDebouncer();
    debouncer.schedule('x', 0, onFire);
    expect(onFire).toHaveBeenCalledTimes(1);
    expect(onFire).toHaveBeenCalledWith('x');
  });

  it('flush cancela el timer pendiente y dispara ya mismo', () => {
    const onFire = vi.fn();
    const debouncer = createDebouncer();
    debouncer.schedule('bruno', 300, onFire);
    debouncer.flush('', onFire);
    expect(onFire).toHaveBeenCalledTimes(1);
    expect(onFire).toHaveBeenCalledWith('');

    vi.advanceTimersByTime(300);
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('cancel limpia el timer sin disparar', () => {
    const onFire = vi.fn();
    const debouncer = createDebouncer();
    debouncer.schedule('bruno', 300, onFire);
    debouncer.cancel();
    vi.advanceTimersByTime(300);
    expect(onFire).not.toHaveBeenCalled();
  });
});
