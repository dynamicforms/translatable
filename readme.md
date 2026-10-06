# @dynamicforms/translatable

Reactive string-translation primitives shared by the `@dynamicforms` Vue libraries. A library declares its
user-facing strings under English defaults; it never picks a locale or ships translations itself. The host
application supplies them, in whatever way it already manages translations.

## Using a `@dynamicforms` library that has translatable strings

Every library that has user-facing strings exports its own `translateStrings` function alongside its own
reactive `strings` dictionary. `translateStrings` takes a callback that receives a string's key and its English
default, and returns the translation for the current locale - or `null`/`undefined` when the current translation
set has nothing for that key, which leaves the English default in place rather than showing nothing. A library can
therefore be adopted before every one of its strings is translated: whatever is missing just reads in English.

The callback returns the raw template, placeholders included (`'Vrednost mora biti vsaj {minValue}'`); the
library substitutes them. It is not a one-off: every entry of `strings` is re-resolved through it whenever reactive
state the callback reads changes. A callback built on vue-i18n reads its current locale, so one call at startup is
all it takes - a later locale switch updates every string, including one already on screen:

```ts
import { translateStrings as translateFormsStrings } from '@dynamicforms/vue-forms';
import { translateStrings as translateGridStrings } from '@dynamicforms/vue-grid';
import { translateStrings as translateInputsStrings } from '@dynamicforms/vuetify-inputs';

function translationsFor(namespace: string) {
  return (key: string) => {
    const message = i18n.global.tm(`${namespace}.${key}`);
    return typeof message === 'string' ? message : null;
  };
}

translateFormsStrings(translationsFor('forms'));
translateGridStrings(translationsFor('grid'));
translateInputsStrings(translationsFor('inputs'));
```

`tm()` returns the raw message for the current locale, or for the fallback locale when the current one lacks it,
and an empty object when neither has it. `t()` does not fit here: it substitutes placeholders itself, with empty
strings for the params it is not given, so `t('forms.MinValue')` returns `'Value must be at least '`.

Messages compiled at build time (`@intlify/unplugin-vue-i18n`) exist at run time only as compiled functions, with
no raw text for `tm()` to return; the callback above then returns `null` for every key, and every string stays at
its English default. The messages these libraries use have to be loaded uncompiled, as JSON.

A callback over translations the application keeps outside Vue's reactivity has to be passed again whenever they
change - every call re-resolves every entry, with a new callback or the same one:

```ts
function applyLocale(locale: string) {
  const dictionary = translations[locale]; // however the application keeps its translations
  const t = (key: string) => dictionary[key];

  translateFormsStrings(t);
  translateGridStrings(t);
  translateInputsStrings(t);
}

applyLocale(currentLocale);
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

`strings` is a reactive, read-only dictionary: an entry with no placeholders can be read directly
(`strings.Required`, or `{{ strings.Required }}` in a template) and stays current on its own. An entry with
placeholders goes through `translate`, which interpolates it and returns a `ComputedRef<string>` that re-evaluates
whenever the translated text changes, re-applying the same params:

```ts
const message = translate(strings, 'MinValue', { minValue: 5 });
// message.value === 'Value must be at least 5', in whatever language is currently active
```

Key naming is PascalCase and describes the string's meaning, not its English text (`Required`, not
`PleaseEnterAValue`), so a translation set reads as a list of concepts rather than a list of English
sentences to override. Expose `translateStrings` from the library's own public API (its `install()` options,
a named export, or both) so a consuming application has a single, predictable place to call it from.

### Keys that are not known in advance

Some keys only exist at run time - an error code a server sends, which the application defines alongside its own
backend rather than the library declaring it. A dictionary typed to admit any key accepts them through `lookup`,
which sends the key through the same callback as every declared one:

```ts
const { strings, translateStrings, lookup } = createTranslatable<Record<string, string>>({
  not_found: 'Item with pk {pk} not found',
});

const message = computed(() => lookup(body.code, body.detail, body.params));
```

`lookup(key, defaultValue, params)` returns the current translation of `key`, interpolated with `params`. A
declared key falls back to its declared default and any other key to `defaultValue`. Called inside a computed, a
watcher or a render, it follows a locale switch the same way `strings` does.
