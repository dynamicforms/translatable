# @dynamicforms/translatable

Translatable strings for the `@dynamicforms` Vue libraries.

Two parties use this package:

- **Library**: a package with user-facing strings, such as `@dynamicforms/vue-forms`. It declares its strings with
  English defaults, reads them with `translate`, and exports `translateStrings`.
- **Application**: the app that uses such libraries. It owns the translations and the locale, and passes its
  translation function to each library's `translateStrings`.

A library ships no translations and does not select a locale. The libraries list this package as a peer
dependency, so the application installs it. The application imports from it only `interpolate` and the
`TranslateFunction` type, to write a translation function without an i18n library.

The package depends only on Vue. The translation function is any function with the signature below. vue-i18n's and
i18next's `t` have it. The examples and the tests use vue-i18n.

## Translation function

```ts
type TranslateFunction = (key: string, named: Record<string, unknown>) => string;
```

Returns the translation of `key` with `named` substituted, or `key` unchanged if there is no translation. The
application provides it; the library calls it.

## Application

### Connecting a library

Call each library's `translateStrings` once, with the translation function and the namespace that holds the
library's keys in the application's translations. With vue-i18n:

```ts
import { translateStrings as translateFormsStrings } from '@dynamicforms/vue-forms';
import { translateStrings as translateGridStrings } from '@dynamicforms/vue-grid';

translateFormsStrings(i18n.global.t, 'forms');
translateGridStrings(i18n.global.t, 'grid');
```

```json
{ "forms": { "MinValue": "Vrednost mora biti vsaj {minValue}" } }
```

With namespace `forms`, the library looks up key `MinValue` as `forms.MinValue`. Without a namespace, as `MinValue`.

Each library's documentation lists its keys and the placeholders in their default text. Translations use the same
placeholder names; the library passes their values and the translation function substitutes them.

Without an i18n library, write the translation function with `interpolate`, which substitutes `{name}`
placeholders:

```ts
import { interpolate } from '@dynamicforms/translatable';

const t = (key: string, named: Record<string, unknown>) => interpolate(dictionary[key] ?? key, named);
translateFormsStrings(t);
```

### Resolution order

For each string, the library uses the first of:

1. The translation function's result for `'<namespace>.<key>'`, unless it is the key unchanged.
2. The library's English default for the key.
3. For a key the library does not declare: the English text the library passes with it, then the key itself.

An application can therefore connect a library before translating all of its keys.

### Run-time keys

Some libraries also translate keys that only exist at run time, such as error codes sent by the application's own
server. The library does not know these keys; the application defines them and translates them under the namespace
it connects for them:

```ts
translateErrorCodes(i18n.global.t, 'errors');
```

```json
{ "errors": { "quota_exceeded": "Kvota je presežena" } }
```

A run-time key without a translation shows the English text the library passes with it (for an error, the message
the server sent), then the key itself. The library's documentation states which function connects run-time keys
and where the keys come from.

### Locale changes

The library calls the translation function on every read, inside the reactive context of the render, computed or
watcher that reads the string. A string updates when reactive state the translation function reads changes.

A translation function over non-reactive translations does not trigger updates. Call `translateStrings` again
after changing them; each call re-evaluates all strings.

### Notes for vue-i18n

- `t` reads the reactive current locale, so all strings follow a locale switch without a `translateStrings` call.
- `t` covers the current locale and the `fallbackLocale` chain in step 1 of the resolution order.
- `t` returns the key for a missing translation by default. A `missing` handler that returns a different value
  disables steps 2 and 3.
- vue-i18n logs a warning for each missing key in development unless `missingWarn: false` is set.

## Library

### Declaring strings

```ts
import { createTranslatable } from '@dynamicforms/translatable';

export const { translate, translateStrings } = createTranslatable({
  Required: 'Please enter a value',
  MinValue: 'Value must be at least {minValue}',
});
```

Keys are PascalCase and name the meaning, not the English text (`Required`, not `PleaseEnterAValue`).

Export `translateStrings` from the library's public API (`install()` options, a named export, or both) and
document every key with its placeholders.

### Reading strings

`translate(key, params?, defaultValue?)` returns the current translation of `key` with `params` substituted. Call
it where the string is displayed, in a template or a computed:

```vue
<template>
  <span>{{ translate('MinValue', { minValue }) }}</span>
</template>
```

```ts
const message = computed(() => translate('MinValue', { minValue: 5 }));
```

### Returning a translated message

A library function that hands a translated message to its caller returns `ComputedRef<string>`, not `string`:

```ts
export function requiredMessage(): ComputedRef<string> {
  return computed(() => translate('Required'));
}
```

A returned `string` holds the translation of the locale active at the time of the call. When the caller stores it,
for example as a field error or a notification, it stays in that locale after a locale switch. A `ComputedRef`
re-evaluates on every read.

### Run-time keys

For keys not known at build time, such as error codes sent by a server, type the dictionary as
`Record<string, string>` and pass the English text as `defaultValue`:

```ts
const { translate, translateStrings } = createTranslatable<Record<string, string>>({
  not_found: 'Item with pk {pk} not found',
});

const message = computed(() => translate(body.detail_code, body.detail_params, body.detail));
```

Without a translation, `message` is the declared default for `not_found`, `body.detail` for any other code, and the
code itself if `body.detail` is empty.

To keep declared keys and run-time keys in separate namespaces, create two instances and export the
`translateStrings` of both.
