// Augmenta los matchers de `expect` de Vitest con jest-dom (toBeInTheDocument…)
// y vitest-axe (toHaveNoViolations). vitest-axe@0.1 augmenta el namespace global
// `Vi` (estilo viejo); acá lo declaramos contra el módulo `vitest` que usa v4.
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { AxeMatchers } from 'vitest-axe';

declare module 'vitest' {
  interface Assertion<T = unknown>
    extends TestingLibraryMatchers<unknown, T>,
      AxeMatchers {}
  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<unknown, unknown>,
      AxeMatchers {}
}
