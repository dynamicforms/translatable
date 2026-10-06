import { shallowRef } from 'vue';

/**
 * The host application's translation function, in the shape vue-i18n's and i18next's `t` already have: it returns
 * the translation of `key` for the current locale with `named` substituted into it, or `key` itself, unchanged,
 * when no locale it consults has a translation for it.
 *
 * Reactive state it reads is tracked wherever a translation is read, so a function that reads vue-i18n's current
 * locale updates every string on a locale switch.
 */
export type TranslateFunction = (key: string, named: Record<string, unknown>) => string;

export interface Translatable<T extends Record<string, string>> {
  /**
   * The current translation of `key`, with `params` substituted into it. Without a translation it is the English
   * default with `params` substituted: the declared default for a declared key, otherwise `defaultValue`, otherwise
   * `key`. `key` can be any string when `T` admits arbitrary keys (`createTranslatable<Record<string, string>>`).
   *
   * Reactive when called inside a render, a computed or a watcher, as `t` itself is; `computed(() => translate(...))`
   * keeps it as a ref.
   */
  translate: (key: keyof T & string, params?: Record<string, unknown>, defaultValue?: string) => string;
  /**
   * Makes `t` the source of every translation, each key looked up as `${namespace}.${key}`, or as `key` without a
   * namespace. Every call re-resolves every translation already on screen, with a new function or the same one.
   */
  translateStrings: (t: TranslateFunction, namespace?: string) => void;
}

/**
 * Declares one library's translatable strings under their English defaults. The library reads them through
 * `translate`; the host application supplies its translation function through `translateStrings`.
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
    // A new object every call, so that passing the same function again still re-resolves every translation.
    source.value = { t, prefix: namespace ? `${namespace}.` : '' };
  };

  return { translate, translateStrings };
}

/**
 * Replaces every `{name}` placeholder in `template` with the matching entry of `params`, if given. A host
 * application that keeps its translations outside an i18n library builds its `TranslateFunction` with it.
 */
export function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return Object.keys(params).reduce((acc, key) => acc.replaceAll(`{${key}}`, String(params[key])), template);
}
