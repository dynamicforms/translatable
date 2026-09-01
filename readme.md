# @dynamicforms/translatable

Reactive string-translation primitives shared by the `@dynamicforms` Vue libraries. A library declares its
user-facing strings under English defaults; it never picks a locale or ships translations itself. The host
application supplies them, in whatever way it already manages translations.

## Using a `@dynamicforms` library that has translatable strings

Every library that has user-facing strings exports its own `translateStrings` function alongside its own
reactive `strings` dictionary. Call `translateStrings` once to apply a locale, and again whenever the locale
changes - the dictionary is reactive, so anything already on screen (including an interpolated validation
message) updates in place:

```ts
import { translateStrings as translateFormsStrings } from '@dynamicforms/vue-forms';
import { translateStrings as translateGridStrings } from '@dynamicforms/vue-grid';
import { translateStrings as translateInputsStrings } from '@dynamicforms/vuetify-inputs';

function applyLocale(locale: string) {
  const dictionary = translations[locale]; // however the application keeps its translations
  const t = (key: string, defaultValue: string) => dictionary[key] ?? defaultValue;

  translateFormsStrings(t);
  translateGridStrings(t);
  translateInputsStrings(t);
}

applyLocale(currentLocale.value);
watch(currentLocale, applyLocale);
```

The callback receives the string's key and its English default, and returns the translation for the current
locale - or `null`/`undefined` when the current translation set has nothing for that key, which leaves the
English default in place rather than showing nothing. This also means a library can be adopted before every
one of its strings is translated: whatever is missing just reads in English.

Wiring an existing i18n setup in is the same shape - the callback is free to call into it directly:

```ts
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
translateFormsStrings((key, defaultValue) => t(`forms.${key}`, defaultValue));
```

Each library's own documentation lists the keys it declares and the placeholders (`{minValue}` and similar)
that appear in their default text; a translation should keep those placeholders as they are; the library
substitutes them after translation.

## Declaring translatable strings in a library

```ts
import { createTranslatable, translate } from '@dynamicforms/translatable';

const { strings, translateStrings } = createTranslatable({
  Required: 'Please enter a value',
  MinValue: 'Value must be at least {minValue}',
});

export { strings, translateStrings };
```

`strings` is a reactive dictionary: an entry with no placeholders can be read directly (`strings.Required`, or
`{{ strings.Required }}` in a template) and stays current on its own. An entry with placeholders goes through
`translate`, which interpolates it and returns a `ComputedRef<string>` that re-evaluates whenever the
translated text changes, re-applying the same params:

```ts
const message = translate(strings, 'MinValue', { minValue: 5 });
// message.value === 'Value must be at least 5', in whatever language is currently active
```

Key naming is PascalCase and describes the string's meaning, not its English text (`Required`, not
`PleaseEnterAValue`), so a translation set reads as a list of concepts rather than a list of English
sentences to override. Expose `translateStrings` from the library's own public API (its `install()` options,
a named export, or both) so a consuming application has a single, predictable place to call it from.
