import { type ComputedRef, computed, reactive, shallowRef, triggerRef } from 'vue';

/**
 * Resolves one entry's translation. Returning null or undefined leaves that entry at `defaultValue` - a
 * translation set that is missing an entry falls back to English rather than rendering nothing.
 *
 * The returned text is the raw template, `{name}` placeholders included: whoever reads the entry substitutes
 * them. The callback runs whenever an entry is read after something it depends on has changed, and the reactive
 * state it reads is tracked: a callback that reads vue-i18n's current locale updates every entry on a locale
 * switch.
 */
export type TranslateStringsCallback<T extends Record<string, string>> = (
  key: keyof T,
  defaultValue: string,
) => string | null | undefined;

export interface Translatable<T extends Record<string, string>> {
  /**
   * Reactive, read-only dictionary of the current strings; equal to the defaults given to createTranslatable
   * until translateStrings supplies a callback.
   */
  strings: T;
  /**
   * Makes `cb` the source of every entry of `strings`, falling back to the English default. The entries follow
   * the reactive state `cb` reads, so a callback over a reactive locale needs one call at startup. Every call,
   * with a new callback or the same one, re-resolves every entry.
   */
  translateStrings: (cb: TranslateStringsCallback<T>) => void;
  /**
   * The current translation of `key`, interpolated with `params`. A declared key falls back to its declared
   * default and `defaultValue` is ignored. When `T` admits arbitrary keys (`createTranslatable<Record<string,
   * string>>(...)`), an undeclared key goes through the same callback, with `defaultValue` as its fallback.
   * Reactive when called inside a computed, a watcher or a render.
   */
  lookup: (key: keyof T & string, defaultValue: string, params?: Record<string, unknown>) => string;
}

/**
 * Declares one library's translatable strings under its own English defaults. `strings` is what the library
 * reads from (directly, or through `translate`); `translateStrings` is what the host application calls to supply
 * the translations - `strings` being reactive is what lets a message already on screen pick up a locale change
 * without the library re-rendering it itself.
 */
export function createTranslatable<T extends Record<string, string>>(defaults: T): Translatable<T> {
  const callback = shallowRef<TranslateStringsCallback<T>>();

  const resolve = (key: keyof T, defaultValue: string): string => callback.value?.(key, defaultValue) ?? defaultValue;

  const entries = Object.keys(defaults).map((key) => [key, computed(() => resolve(key, defaults[key]))]);
  // reactive() unwraps each computed on read, so an entry reads as a plain string and is tracked like one.
  const strings = reactive(Object.fromEntries(entries)) as unknown as T;

  const translateStrings = (cb: TranslateStringsCallback<T>) => {
    callback.value = cb;
    // A shallowRef assigned the value it already holds triggers nothing; the same callback over changed
    // non-reactive state still has to re-resolve every entry.
    triggerRef(callback);
  };

  const lookup = (key: keyof T & string, defaultValue: string, params?: Record<string, unknown>): string => {
    const template = Object.hasOwn(defaults, key) ? defaults[key] : defaultValue;
    return interpolate(resolve(key, template), params);
  };

  return { strings, translateStrings, lookup };
}

/** Replaces every `{name}` placeholder in `template` with the matching entry of `params`, if given. */
export function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return Object.keys(params).reduce((acc, key) => acc.replaceAll(`{${key}}`, String(params[key])), template);
}

/**
 * A translated, interpolated entry of `strings` as a computed ref, re-evaluated whenever that entry changes -
 * so a message already on screen, placeholders included, updates the moment its translation does.
 */
export function translate<T extends Record<string, string>>(
  strings: T,
  key: keyof T,
  params?: Record<string, unknown>,
): ComputedRef<string> {
  return computed(() => interpolate(strings[key], params));
}
