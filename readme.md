# @dynamicforms/translatable

Reactive string-translation primitives shared by the `@dynamicforms` Vue libraries. A library declares its
user-facing strings under English defaults; it never picks a locale or ships translations itself. The host
application supplies its own translation function, whatever i18n library it already uses.

## Using a `@dynamicforms` library that has translatable strings

Every library that has user-facing strings exports its own `translateStrings` function. Call it once per library
with the application's translation function and the namespace that library's strings live under in the
application's messages:

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

The library then looks each of its keys up as `forms.MinValue` and so on, passing its own values for the
placeholders, so the translation function substitutes them itself. vue-i18n's `t` reads its current locale, so a
locale switch updates every string the libraries show, with no watcher and no further call.

A key the translation function has no translation for - in the current locale or any fallback locale it consults -
reads as the library's English default. A library can therefore be adopted before every one of its strings is
translated. vue-i18n warns about every such key in development unless `missingWarn: false` is set.

### The translation function

`translateStrings` accepts any function shaped like vue-i18n's and i18next's `t`:

```ts
type TranslateFunction = (key: string, named: Record<string, unknown>) => string;
```

It returns the translation of `key` with `named` substituted into it, or `key` itself, unchanged, when there is no
translation. An application that keeps its translations outside an i18n library writes one with `interpolate`,
which substitutes `{name}` placeholders:

```ts
import { interpolate } from '@dynamicforms/translatable';

const t = (key: string, named: Record<string, unknown>) => interpolate(dictionary[key] ?? key, named);
translateFormsStrings(t);
```

Reactive state the function reads is tracked, so a function over a reactive dictionary follows it by itself. Over
non-reactive translations, call `translateStrings` again whenever they change: every call re-resolves every
string, with a new function or the same one.

Each library's own documentation lists the keys it declares and the placeholders (`{minValue}` and similar) that
appear in their default text; a translation uses the same placeholder names.

## Declaring translatable strings in a library

```ts
import { createTranslatable } from '@dynamicforms/translatable';

const { translate, translateStrings } = createTranslatable({
  Required: 'Please enter a value',
  MinValue: 'Value must be at least {minValue}',
});

export { translateStrings };
```

`translate(key, params)` returns the current translation with `params` substituted into it. It is reactive the way
vue-i18n's `t` is: read in a template, a computed or a watcher, it updates on a locale switch.

```vue
<template>
  <span>{{ translate('MinValue', { minValue }) }}</span>
</template>
```

```ts
const message = computed(() => translate('MinValue', { minValue: 5 }));
// message.value === 'Value must be at least 5', in whatever language is currently active
```

Key naming is PascalCase and describes the string's meaning, not its English text (`Required`, not
`PleaseEnterAValue`), so a translation set reads as a list of concepts rather than a list of English sentences to
override. Expose `translateStrings` from the library's own public API (its `install()` options, a named export, or
both) so a consuming application has a single, predictable place to call it from.

### Keys that are not known in advance

Some keys only exist at run time - an error code a server sends, which the application defines alongside its own
backend rather than the library declaring it. A dictionary typed to admit any key takes them through the same
`translate`, with the English text to fall back to as its third argument:

```ts
const { translate, translateStrings } = createTranslatable<Record<string, string>>({
  not_found: 'Item with pk {pk} not found',
});

const message = computed(() => translate(body.detail_code, body.detail_params, body.detail));
```

A declared key falls back to its declared default, any other key to the given text, and without one to the key
itself.
