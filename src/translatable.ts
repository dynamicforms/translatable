import { shallowRef } from 'vue';

/**
 * Translation function with the signature of vue-i18n's and i18next's `t`. Returns the translation of `key` with
 * `named` substituted, or `key` unchanged if there is no translation.
 */
export type TranslateFunction = (key: string, named: Record<string, unknown>) => string;

export interface Translatable<T extends Record<string, string>> {
  /**
   * Returns the translation of `key` with `params` substituted. Resolution order: `t`, the declared default,
   * `defaultValue`, `key`. Accepts any string key when `T` is `Record<string, string>`.
   *
   * Calls `t` on every read, so a render, computed or watcher tracks the reactive state `t` reads (the locale).
   */
  translate: (key: keyof T & string, params?: Record<string, unknown>, defaultValue?: string) => string;
  /**
   * Sets `t` as the translation source. Keys are looked up as `${namespace}.${key}`, or as `key` without a
   * namespace. Each call re-evaluates all translations.
   */
  translateStrings: (t: TranslateFunction, namespace?: string) => void;
}

/**
 * Creates a library's translatable strings with English defaults. The library reads them with `translate`; the
 * application sets the translation function with `translateStrings`.
 */
export function createTranslatable<T extends Record<string, string>>(defaults: T): Translatable<T> {
  const source = shallowRef<{ t: TranslateFunction; prefix: string }>();

  const translate = (key: keyof T & string, params: Record<string, unknown> = {}, defaultValue?: string): string => {
    const current = source.value;
    if (current) {
      const path = `${current.prefix}${key}`;
      const translated = current.t(path, params);
      if (translated !== path) return translated;
    }
    const fallback = Object.hasOwn(defaults, key) ? defaults[key] : (defaultValue ?? key);
    return interpolate(fallback, params);
  };

  const translateStrings = (t: TranslateFunction, namespace?: string) => {
    // A new object on every call, so passing the same function again also triggers re-evaluation.
    source.value = { t, prefix: namespace ? `${namespace}.` : '' };
  };

  return { translate, translateStrings };
}

/**
 * Returns a translation function that formats each placeholder value with `format` before `t` substitutes it.
 * Values are read and formatted on every call, so a getter's current value is used and reactive state `format`
 * reads is tracked. The result of `t` is returned unchanged.
 */
export function formatParams(t: TranslateFunction, format: (value: unknown) => unknown): TranslateFunction {
  return (key, named) => {
    const formatted: Record<string, unknown> = {};
    for (const name of Object.keys(named)) formatted[name] = format(named[name]);
    return t(key, formatted);
  };
}

/**
 * Replaces each `{name}` placeholder in `template` with `params[name]`. Placeholders without a matching param stay
 * unchanged.
 */
export function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return Object.keys(params).reduce((acc, key) => acc.replaceAll(`{${key}}`, String(params[key])), template);
}
