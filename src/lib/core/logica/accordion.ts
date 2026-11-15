// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function toggleOpen(
  current: string[],
  value: string,
  multiple: boolean
): string[] {
  const isOpen = current.includes(value);
  if (multiple) {
    return isOpen ? current.filter(v => v !== value) : [...current, value];
  }
  return isOpen ? [] : [value];
}
