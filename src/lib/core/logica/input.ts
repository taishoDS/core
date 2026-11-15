// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function showClearButton(hasValue: boolean, disabled: boolean, readonly: boolean): boolean {
  return hasValue && !disabled && !readonly;
}

export interface Debouncer {
  schedule(value: string, delay: number, onFire: (value: string) => void): void;
  flush(value: string, onFire: (value: string) => void): void;
  cancel(): void;
}

export function createDebouncer(): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    schedule(value, delay, onFire) {
      if (timer !== undefined) clearTimeout(timer);
      if (delay <= 0) {
        timer = undefined;
        onFire(value);
        return;
      }
      timer = setTimeout(() => {
        timer = undefined;
        onFire(value);
      }, delay);
    },
    flush(value, onFire) {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      onFire(value);
    },
    cancel() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };
}
