import { computed, nextTick, watchEffect } from 'vue';
import { createI18n } from 'vue-i18n';

import { createTranslatable, interpolate, type TranslateFunction } from './translatable';

function i18nWith(locale: string) {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: {
      en: {
        forms: { MinValue: 'Must be at least {minValue}', OnlyEnglish: 'Only in English' },
        errors: { unknown_setting: 'Unknown setting {name}' },
      },
      sl: {
        forms: { MinValue: 'Vrednost mora biti vsaj {minValue}', Required: 'Obvezno' },
        errors: { unknown_setting: 'Neznana nastavitev {name}' },
      },
    },
  });
}

const defaults = {
  MinValue: 'Value must be at least {minValue}',
  Required: 'Please enter a value',
  OnlyEnglish: 'English default',
  Untranslated: 'Nobody translated {what}',
};

describe('translate', () => {
  it('should give the English default with params substituted before translateStrings is called', () => {
    const { translate } = createTranslatable(defaults);

    expect(translate('MinValue', { minValue: 5 })).toBe('Value must be at least 5');
    expect(translate('Required')).toBe('Please enter a value');
  });

  it('should take the translation from t, with t substituting the params', () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable(defaults);

    translateStrings(global.t, 'forms');

    expect(translate('MinValue', { minValue: 5 })).toBe('Vrednost mora biti vsaj 5');
    expect(translate('Required')).toBe('Obvezno');
  });

  it("should take the fallback locale's translation when the current locale has none", () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable(defaults);

    translateStrings(global.t, 'forms');

    expect(translate('OnlyEnglish')).toBe('Only in English');
  });

  it('should fall back to the English default, params substituted, when no locale has a translation', () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable(defaults);

    translateStrings(global.t, 'forms');

    expect(translate('Untranslated', { what: 'this' })).toBe('Nobody translated this');
  });

  it('should look a key up without a prefix when no namespace is given', () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable<Record<string, string>>({});

    translateStrings(global.t);

    expect(translate('forms.Required')).toBe('Obvezno');
  });

  it('should follow a locale switch without another translateStrings call', () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable(defaults);
    translateStrings(global.t, 'forms');
    const message = computed(() => translate('MinValue', { minValue: 5 }));
    const required = computed(() => translate('Required'));

    expect(message.value).toBe('Vrednost mora biti vsaj 5');
    expect(required.value).toBe('Obvezno');

    global.locale.value = 'en';
    expect(message.value).toBe('Must be at least 5');
    expect(required.value).toBe('Please enter a value');
  });

  it('should re-run an effect that read a translation, as a render does, on a locale switch', async () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable(defaults);
    translateStrings(global.t, 'forms');
    const rendered: string[] = [];
    const stop = watchEffect(() => rendered.push(translate('MinValue', { minValue: 5 })));

    global.locale.value = 'en';
    await nextTick();
    stop();

    expect(rendered).toEqual(['Vrednost mora biti vsaj 5', 'Must be at least 5']);
  });

  it('should re-resolve a translation already read when translateStrings is called', () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable(defaults);
    const required = computed(() => translate('Required'));

    expect(required.value).toBe('Please enter a value');

    translateStrings(global.t, 'forms');
    expect(required.value).toBe('Obvezno');
  });

  it('should re-resolve when the same function is passed again over changed non-reactive translations', () => {
    const dictionary: Record<string, string> = {};
    const t: TranslateFunction = (key, named) => interpolate(dictionary[key] ?? key, named);
    const { translate, translateStrings } = createTranslatable(defaults);
    translateStrings(t);
    const required = computed(() => translate('Required'));

    expect(required.value).toBe('Please enter a value');

    dictionary.Required = 'Obvezno';
    translateStrings(t);
    expect(required.value).toBe('Obvezno');
  });

  it('should send an undeclared key through t when the dictionary admits arbitrary keys', () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable<Record<string, string>>({});

    translateStrings(global.t, 'errors');

    expect(translate('unknown_setting', { name: 'barva' }, 'Unknown setting: colour')).toBe('Neznana nastavitev barva');
  });

  it('should fall back to the given default, then to the key, for an undeclared key without a translation', () => {
    const { global } = i18nWith('sl');
    const { translate, translateStrings } = createTranslatable<Record<string, string>>({});

    translateStrings(global.t, 'errors');

    expect(translate('no_club', {}, 'No club selected.')).toBe('No club selected.');
    expect(translate('no_club')).toBe('no_club');
  });

  it('should prefer the declared default over the given one', () => {
    const { translate } = createTranslatable(defaults);

    expect(translate('Required', {}, 'ignored')).toBe('Please enter a value');
  });
});

describe('interpolate', () => {
  it('should return the template unchanged when no params are given', () => {
    expect(interpolate('Value must be at least {minValue}')).toBe('Value must be at least {minValue}');
  });

  it('should replace every named placeholder with the matching param', () => {
    const result = interpolate('Value must be between {minValue} and {maxValue}', { minValue: 1, maxValue: 10 });

    expect(result).toBe('Value must be between 1 and 10');
  });

  it('should replace every occurrence of a repeated placeholder', () => {
    expect(interpolate('{name} met {name}', { name: 'Ana' })).toBe('Ana met Ana');
  });

  it('should leave a placeholder untouched when no matching param is given', () => {
    expect(interpolate('Value must be at least {minValue}', { other: 1 })).toBe('Value must be at least {minValue}');
  });
});
