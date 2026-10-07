# @dynamicforms/translatable

Translatable strings for the `@dynamicforms` Vue libraries. A library declares its strings with English defaults.
The application supplies a translation function. The library ships no translations and does not select a locale.

The package depends only on Vue. It works with any translation function that has the signature below: vue-i18n's
and i18next's `t` have it, and a function over a plain dictionary can be written with `interpolate`. The examples
and the tests use vue-i18n.

## Translation function

```ts
type TranslateFunction = (key: string, named: Record<string, unknown>) => string;
```

Returns the translation of `key` with `named` substituted, or `key` unchanged if there is no translation.

## Application setup

Each library exports a `translateStrings` function. Call it once per library with the translation function and the
namespace that holds the library's keys. With vue-i18n:

```ts
import { translateStrings as translateFormsStrings } from '@dynamicforms/vue-forms';
import { translateStrings as translateGridStrings } from '@dynamicforms/vue-grid';
import { translateStrings as translateInputsStrings } from '@dynamicforms/vuetify-inputs';

translateFormsStrings(i18n.global.t, 'forms');
translateGridStrings(i18n.global.t, 'grid');
translateInputsStrings(i18n.global.t, 'inputs');
```

```json
{ "forms": { "MinValue": "Vrednost mora biti vsaj {minValue}" } }
```

With namespace `forms`, key `MinValue` is looked up as `forms.MinValue`. The library passes the placeholder values
to the translation function, which substitutes them.

Without an i18n library, with `interpolate`, which substitutes `{name}` placeholders:

```ts
import { interpolate } from '@dynamicforms/translatable';

const t = (key: string, named: Record<string, unknown>) => interpolate(dictionary[key] ?? key, named);
translateFormsStrings(t);
```

Each library's documentation lists its keys and the placeholders in their default text. Translations use the same
placeholder names.

### Resolution order

1. The translation function, called with `'<namespace>.<key>'` and `params`.
2. The library's English default for the key, with `params` substituted.
3. For a key the library does not declare: the `defaultValue` argument of `translate`, then the key itself.

A translation counts as missing when the translation function returns the key unchanged.

### Reactivity

The translation function is called on every read. Strings read in a template, a computed or a watcher re-evaluate
when reactive state the function reads changes. Each `translateStrings` call also re-evaluates all strings; a
function over non-reactive translations needs that call after the translations change.

### Notes for vue-i18n

- `t` reads the current locale, so all strings follow a locale switch without a `translateStrings` call.
- `t` covers the current locale and the `fallbackLocale` chain in step 1 of the resolution order.
- `t` returns the key for a missing translation by default. A `missing` handler that returns a different value
  disables steps 2 and 3.
- vue-i18n logs a warning for each missing key in development unless `missingWarn: false` is set.

## Declaring strings in a library

```ts
import { createTranslatable } from '@dynamicforms/translatable';

const { translate, translateStrings } = createTranslatable({
  Required: 'Please enter a value',
  MinValue: 'Value must be at least {minValue}',
});

export { translateStrings };
```

`translate(key, params?, defaultValue?)` returns the current translation of `key` with `params` substituted:

```vue
<template>
  <span>{{ translate('MinValue', { minValue }) }}</span>
</template>
```

```ts
const message = computed(() => translate('MinValue', { minValue: 5 }));
```

### Returning a message to the caller

A function that returns a translated message to the caller returns `ComputedRef<string>`, not `string`:

```ts
export function requiredMessage(): ComputedRef<string> {
  return computed(() => translate('Required'));
}
```

A `string` holds the translation of the locale active at the time of the call. A caller that stores it, such as a
field error or a notification, shows that locale after a locale switch. A `ComputedRef` re-evaluates on every read.

Keys are PascalCase and name the meaning, not the English text (`Required`, not `PleaseEnterAValue`). Export
`translateStrings` from the library's public API (`install()` options, a named export, or both).

### Run-time keys

For keys not known at build time, such as error codes sent by a server, type the dictionary as
`Record<string, string>` and pass the English text as `defaultValue`:

```ts
const { translate, translateStrings } = createTranslatable<Record<string, string>>({
  not_found: 'Item with pk {pk} not found',
});

const message = computed(() => translate(body.detail_code, body.detail_params, body.detail));
```

Without a translation in any locale, `message` is the declared default for `not_found`, `body.detail` for any other
code, and the code itself if `body.detail` is empty.

A library that keeps declared and run-time keys in separate namespaces creates two instances and exports the
`translateStrings` of both.
