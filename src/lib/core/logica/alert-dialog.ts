// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function confirmTextMatches(typed: string, confirmText: string): boolean {
  return confirmText !== '' && typed === confirmText;
}
