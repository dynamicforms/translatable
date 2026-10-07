# @dynamicforms/translatable

Translatable strings for the `@dynamicforms` Vue libraries. A library declares its strings with English defaults.
The application supplies its translation function (vue-i18n's `t` or any function with the same signature). The
library ships no translations and does not select a locale.

## Application setup

Each library exports a `translateStrings` function. Call it once per library with the translation function and the
namespace that holds the library's keys:

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
to `t`, and `t` substitutes them.

### Resolution order

1. `t('<namespace>.<key>', params)`. In vue-i18n this covers the current locale and the `fallbackLocale` chain.
2. The library's English default for the key, with `params` substituted.
3. For a key the library does not declare: the `defaultValue` argument of `translate`, then the key itself.

A translation counts as missing when `t` returns the key unchanged. vue-i18n does so by default. A vue-i18n
`missing` handler that returns a different value disables steps 2 and 3.

vue-i18n logs a warning for each missing key in development unless `missingWarn: false` is set.

### Reactivity

Strings read in a template, a computed or a watcher update when the locale changes, because `t` reads the current
locale on every call. Each `translateStrings` call re-evaluates all strings.

### Translation function

```ts
type TranslateFunction = (key: string, named: Record<string, unknown>) => string;
```

Returns the translation of `key` with `named` substituted, or `key` unchanged if there is no translation.

Without an i18n library, build one with `interpolate`, which substitutes `{name}` placeholders:

```ts
import { interpolate } from '@dynamicforms/translatable';

const t = (key: string, named: Record<string, unknown>) => interpolate(dictionary[key] ?? key, named);
translateFormsStrings(t);
```

If `dictionary` is reactive, changes to it are tracked. If it is not, call `translateStrings` again after changing
it.

Each library's documentation lists its keys and the placeholders in their default text. Translations use the same
placeholder names.

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
