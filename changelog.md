# Changelog

All notable changes to `@dynamicforms/translatable` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-10-07

### Changed
- The readme states that a library function returning a translated message returns `ComputedRef<string>`, so a
  stored message follows a locale switch.
- The readme states that the package depends only on Vue and works with any function shaped like `t`; vue-i18n is
  used in the examples and tests, and its specifics are listed apart.
- The readme is split into an application part and a library part, each stating what that party does.
- The readme describes the application's part in translating run-time keys, such as its own server's error codes.

## [0.2.0] - 2026-10-06

### Changed
- `translateStrings(t, namespace?)` takes the host application's translation function, shaped like vue-i18n's and
  i18next's `t` (`TranslateFunction`), in place of a callback returning raw templates. Each key is looked up as
  `${namespace}.${key}`, and the function substitutes the placeholders itself; a key it returns unchanged has no
  translation and reads as the English default. Translations follow the reactive state the function reads, so
  vue-i18n's `t` updates every string on a locale switch without another call.

### Added
- `translate(key, params?, defaultValue?)` on the object `createTranslatable` returns: the current translation of
  `key` with `params` substituted, reactive wherever it is read. With a dictionary typed `Record<string, string>` it
  also takes keys that only exist at run time, such as server error codes, falling back to `defaultValue`.

### Removed
- The `strings` dictionary on the object `createTranslatable` returns, and the `translate(strings, key, params)`
  function; `translate(key, params)` replaces both.
- `TranslateStringsCallback`, replaced by `TranslateFunction`.

## [0.1.0] - 2026-09-01

### Added
- `createTranslatable(defaults)`, returning a reactive `strings` dictionary seeded from `defaults` and a
  `translateStrings(cb)` function that replaces every entry with what `cb` returns for it, falling back to the
  English default for a key `cb` returns `null`/`undefined` for.
- `interpolate(template, params)`, replacing every `{name}` placeholder in `template` with the matching entry
  of `params`.
- `translate(strings, key, params)`, a `ComputedRef<string>` over one entry of a `strings` dictionary,
  interpolated with `params` and re-evaluated whenever that entry changes.
