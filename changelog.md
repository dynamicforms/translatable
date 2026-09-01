# Changelog

All notable changes to `@dynamicforms/translatable` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-01

### Added
- `createTranslatable(defaults)`, returning a reactive `strings` dictionary seeded from `defaults` and a
  `translateStrings(cb)` function that replaces every entry with what `cb` returns for it, falling back to the
  English default for a key `cb` returns `null`/`undefined` for.
- `interpolate(template, params)`, replacing every `{name}` placeholder in `template` with the matching entry
  of `params`.
- `translate(strings, key, params)`, a `ComputedRef<string>` over one entry of a `strings` dictionary,
  interpolated with `params` and re-evaluated whenever that entry changes.
