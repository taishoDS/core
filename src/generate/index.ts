// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * @taishods/core/generate — API pública del motor de generación.
 * Se usa desde el `taisho.config.ts` del proyecto: define su `TaishoConfig` (temas propios,
 * fuentes, grids) y llama a `orchestrate` para compilar su CSS, o a `compile` (puro: config +
 * archivos de contenido -> CSS plano, sin tocar disco).
 */
export { orchestrate, deriveThemeVocabulary, DEFAULT_CUSTOM_ICONS_DIR } from './orchestrate';
export type { TaishoConfig, OrchestrationOptions, ThemeVocabulary } from './orchestrate';
export type { ThemeDef, FontFaceDef } from '../config/taisho.types';
export { compile } from './compile';
export type { CompileOptions, CompileResult, ContentFile, CompileCache } from './compile';
export type { EngineWarning, WarningData, WarningCode, WarningParams } from './avisos-tipos';
export { warningLine, warningText } from '../generate-cli/mensajes-avisos';
export type { Lang } from '../generate-cli/mensajes';
export { ConfigError } from './errores-config';
export type { ConfigKeyError, ConfigErrorData, ConfigErrorCode, ConfigErrorParams } from './errores-config';
export { configErrorLine } from './mensajes-errores';
export { defineExtension, validateExtension } from './extension';
export type { TaishoExtension, ExtensionComponent, TaishoExtensions, ThemeToValidate } from './extension';
export { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
export { buildFontsCSS } from './emit-fonts';
export { pruneTheme, varsInContent, CORE_JS_THEME_VARS } from './podar-tema';
