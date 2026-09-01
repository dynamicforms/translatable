import { type ComputedRef, computed, reactive } from 'vue';

/**
 * Resolves one entry's translation. Returning null or undefined leaves that entry at `defaultValue` - a
 * translation set that is missing an entry falls back to English rather than rendering nothing.
 */
export type TranslateStringsCallback<T extends Record<string, string>> = (
  key: keyof T,
  defaultValue: string,
) => string | null | undefined;

export interface Translatable<T extends Record<string, string>> {
  /** Reactive dictionary of the current strings; starts out equal to the defaults given to createTranslatable. */
  strings: T;
  /** Replaces every entry of `strings` with what `cb` returns for it, falling back to the English default. */
  translateStrings: (cb: TranslateStringsCallback<T>) => void;
}

/**
 * Declares one library's translatable strings under its own English defaults. `strings` is what the library
 * reads from (directly, or through `translate`); `translateStrings` is what the host application calls, once
 * per locale, to replace its values - `strings` being reactive is what lets a message already on screen pick
 * up the change without the library re-rendering it itself.
 */
export function createTranslatable<T extends Record<string, string>>(defaults: T): Translatable<T> {
  const strings = reactive({ ...defaults }) as T;
  const translateStrings = (cb: TranslateStringsCallback<T>) => {
    (Object.keys(defaults) as (keyof T)[]).forEach((key) => {
      const translated = cb(key, defaults[key]);
      strings[key] = (translated ?? defaults[key]) as T[keyof T];
    });
  };
  return { strings, translateStrings };
}

/** Replaces every `{name}` placeholder in `template` with the matching entry of `params`, if given. */
export function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return Object.keys(params).reduce((acc, key) => acc.replaceAll(`{${key}}`, String(params[key])), template);
}

/**
 * A translated, interpolated entry of `strings` as a computed ref, re-evaluated whenever that entry changes -
 * so a message already on screen, placeholders included, updates the moment translateStrings replaces it.
 */
export function translate<T extends Record<string, string>>(
  strings: T,
  key: keyof T,
  params?: Record<string, unknown>,
): ComputedRef<string> {
  return computed(() => interpolate(strings[key], params));
}
