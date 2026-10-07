import { vi } from 'vitest';
import { computed, nextTick, ref, watchEffect } from 'vue';
import { createI18n } from 'vue-i18n';

import { createTranslatable, formatParams, interpolate, type TranslateFunction } from './translatable';

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
        forms: { MinValue: 'Vrednost mora biti vsaj {minValue}', Required: 'Obvezno', Expires: 'Velja do {date}' },
        errors: { unknown_setting: 'Neznana nastavitev {name}' },
      },
      fa: {
        forms: { MinValue: 'حداقل {minValue}', ValueInRange: 'بین {minValue} و {maxValue}' },
      },
    },
  });
}

const defaults = {
  MinValue: 'Value must be at least {minValue}',
  Required: 'Please enter a value',
  OnlyEnglish: 'English default',
  Untranslated: 'Nobody translated {what}',
  ValueInRange: 'Value must be between {minValue} and {maxValue}',
  Expires: 'Valid until {date}',
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

    expect(translate('quota_exceeded', {}, 'Quota exceeded.')).toBe('Quota exceeded.');
    expect(translate('quota_exceeded')).toBe('quota_exceeded');
  });

  it('should prefer the declared default over the given one', () => {
    const { translate } = createTranslatable(defaults);

    expect(translate('Required', {}, 'ignored')).toBe('Please enter a value');
  });
});

describe('formatParams', () => {
  function formattedI18n(locale: string) {
    const i18n = i18nWith(locale);
    const { t, n, d } = i18n.global;
    const tf = formatParams(t, (value) => {
      if (typeof value === 'number') return n(value);
      if (value instanceof Date) return d(value);
      return value;
    });
    return { global: i18n.global, tf };
  }

  it("should format a number param with n for the current locale's digits", () => {
    const { tf } = formattedI18n('fa');
    const { translate, translateStrings } = createTranslatable(defaults);

    translateStrings(tf, 'forms');

    expect(translate('ValueInRange', { minValue: 18, maxValue: 100 })).toBe('بین ۱۸ و ۱۰۰');
  });

  it('should format a Date param with d', () => {
    const { global, tf } = formattedI18n('sl');
    const { translate, translateStrings } = createTranslatable(defaults);
    const date = new Date(2026, 9, 7);

    translateStrings(tf, 'forms');

    expect(translate('Expires', { date })).toBe(`Velja do ${global.d(date)}`);
  });

  it('should pass a value format returns as it is to t unchanged', () => {
    const t = vi.fn<TranslateFunction>((key) => key);

    formatParams(t, (value) => value)('Pattern', { pattern: '[a-z]+' });

    expect(t).toHaveBeenCalledWith('Pattern', { pattern: '[a-z]+' });
  });

  it('should not mutate the params it is given', () => {
    const { tf } = formattedI18n('fa');
    const named = { minValue: 18, maxValue: 100 };

    tf('forms.ValueInRange', named);

    expect(named).toEqual({ minValue: 18, maxValue: 100 });
  });

  it("should read a getter param's current value on each call", () => {
    let allowed = 'a, b';
    const named = {
      get allowedAsText() {
        return allowed;
      },
    };
    const tf = formatParams(
      (key, values) => interpolate('One of {allowedAsText}', values),
      (value) => value,
    );

    const first = tf('InAllowedValues', named);
    allowed = 'c';
    const second = tf('InAllowedValues', named);

    expect([first, second]).toEqual(['One of a, b', 'One of c']);
  });

  it('should follow a locale switch in the formatted digits without another translateStrings call', () => {
    const i18n = i18nWith('fa');
    const { global } = i18n;
    const { translate, translateStrings } = createTranslatable(defaults);
    translateStrings(
      formatParams(global.t, (v) => (typeof v === 'number' ? global.n(v) : v)),
      'forms',
    );
    const message = computed(() => translate('MinValue', { minValue: 18 }));

    expect(message.value).toBe('حداقل ۱۸');

    global.locale.value = 'en';
    expect(message.value).toBe('Must be at least 18');
  });

  it('should re-evaluate when reactive state read only by format changes', () => {
    const locale = ref('fa');
    const dictionary: Record<string, string> = { MinValue: 'At least {minValue}' };
    const t: TranslateFunction = (key, named) => interpolate(dictionary[key] ?? key, named);
    const { translate, translateStrings } = createTranslatable(defaults);
    translateStrings(
      formatParams(t, (v) => (typeof v === 'number' ? new Intl.NumberFormat(locale.value).format(v) : v)),
    );
    const message = computed(() => translate('MinValue', { minValue: 18 }));

    expect(message.value).toBe('At least ۱۸');

    locale.value = 'en';
    expect(message.value).toBe('At least 18');
  });

  it('should fall back to the English default with the values unformatted when t has no translation', () => {
    const { tf } = formattedI18n('fa');
    const { translate, translateStrings } = createTranslatable(defaults);

    translateStrings(tf, 'forms');

    expect(translate('Untranslated', { what: 18 })).toBe('Nobody translated 18');
  });

  it('should format over a translation function written with interpolate', () => {
    const dictionary: Record<string, string> = { Total: 'Skupaj {amount}' };
    const t: TranslateFunction = (key, named) => interpolate(dictionary[key] ?? key, named);
    const number = new Intl.NumberFormat('de');
    const tf = formatParams(t, (value) => (typeof value === 'number' ? number.format(value) : value));

    expect(tf('Total', { amount: 1234.5 })).toBe(`Skupaj ${number.format(1234.5)}`);
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
