# Changelog

All notable changes to `@dynamicforms/translatable` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-10-06

### Fixed
- Every entry of `strings` follows the reactive state the `translateStrings` callback reads. A callback over
  vue-i18n's current locale used to be evaluated once, at the call, leaving every string in the locale that was
  active then; the entries now update on a locale switch without the application calling `translateStrings` again.

### Changed
- `translateStrings(cb)` keeps `cb` and resolves an entry through it when the entry is read, instead of calling it
  for every key at once. Calling it again - with a new callback or the same one - still re-resolves every entry.
- `strings` is read-only; an entry changes only through `translateStrings`.

### Added
- The `translateStrings` callback receives a third argument, `placeholders`, mapping every `{name}` placeholder of
  the string to its own text, so that a translation looked up through vue-i18n's `t(key, placeholders)` keeps its
  placeholders instead of having them substituted with empty strings.
- `lookup(key, defaultValue, params)` on the object `createTranslatable` returns: the current translation of any
  key, declared or not, interpolated with `params`, for keys that only exist at run time such as server error
  codes.

## [0.1.0] - 2026-09-01

### Added
- `createTranslatable(defaults)`, returning a reactive `strings` dictionary seeded from `defaults` and a
  `translateStrings(cb)` function that replaces every entry with what `cb` returns for it, falling back to the
  English default for a key `cb` returns `null`/`undefined` for.
- `interpolate(template, params)`, replacing every `{name}` placeholder in `template` with the matching entry
  of `params`.
- `translate(strings, key, params)`, a `ComputedRef<string>` over one entry of a `strings` dictionary,
  interpolated with `params` and re-evaluated whenever that entry changes.
