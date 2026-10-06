import { computed, ref, toRef } from 'vue';

import { createTranslatable, interpolate, translate } from './translatable';

/**
 * A stand-in for vue-i18n's composer: `locale` is a ref, and `tm` returns the raw message for the current locale,
 * then for `en` as the fallback locale, or an empty object when neither has it.
 */
function fakeI18n(messages: Record<string, Record<string, string>>) {
  const locale = ref('en');
  const tm = (key: string): unknown => messages[locale.value][key] ?? messages.en[key] ?? {};
  return { locale, tm };
}

/** The callback the readme recommends for vue-i18n. */
function rawMessages(i18n: ReturnType<typeof fakeI18n>, namespace?: string) {
  return (key: string) => {
    const message = i18n.tm(namespace ? `${namespace}.${key}` : key);
    return typeof message === 'string' ? message : null;
  };
}

describe('createTranslatable', () => {
  it('should start out equal to the given defaults', () => {
    const { strings } = createTranslatable({ Hello: 'Hello', Bye: 'Bye' });

    expect(strings.Hello).toBe('Hello');
    expect(strings.Bye).toBe('Bye');
  });

  it('should replace entries with what the callback returns for them', () => {
    const { strings, translateStrings } = createTranslatable({ Hello: 'Hello', Bye: 'Bye' });

    translateStrings((key) => ({ Hello: 'Živjo', Bye: 'Adijo' })[key]);

    expect(strings.Hello).toBe('Živjo');
    expect(strings.Bye).toBe('Adijo');
  });

  it('should fall back to the English default when the callback returns null or undefined', () => {
    const { strings, translateStrings } = createTranslatable({ Hello: 'Hello', Bye: 'Bye' });
    const partial: Partial<Record<'Hello' | 'Bye', string>> = { Hello: 'Živjo' };

    translateStrings((key) => partial[key]);

    expect(strings.Hello).toBe('Živjo');
    expect(strings.Bye).toBe('Bye');
  });

  it('should let a later translateStrings call revert an entry the callback no longer covers', () => {
    const { strings, translateStrings } = createTranslatable({ Hello: 'Hello' });

    translateStrings(() => 'Živjo');
    expect(strings.Hello).toBe('Živjo');

    translateStrings(() => undefined);
    expect(strings.Hello).toBe('Hello');
  });

  it('should update a computed built over strings when translateStrings replaces an entry', () => {
    const { strings, translateStrings } = createTranslatable({ Hello: 'Hello' });
    const greeting = computed(() => strings.Hello);

    translateStrings(() => 'Živjo');

    expect(greeting.value).toBe('Živjo');
  });

  it('should follow the reactive state the callback reads without another translateStrings call', () => {
    const i18n = fakeI18n({ en: { 'grid.Loading': 'Loading' }, sl: { 'grid.Loading': 'Nalagam' } });
    const { strings, translateStrings } = createTranslatable({ Loading: 'Loading...' });
    const label = computed(() => strings.Loading);

    translateStrings(rawMessages(i18n, 'grid'));
    expect(label.value).toBe('Loading');

    i18n.locale.value = 'sl';
    expect(strings.Loading).toBe('Nalagam');
    expect(label.value).toBe('Nalagam');
  });

  it('should keep a ref made by toRef over an entry current after a locale switch', () => {
    const i18n = fakeI18n({ en: { Required: 'Required' }, sl: { Required: 'Obvezno' } });
    const { strings, translateStrings } = createTranslatable({ Required: 'Please enter a value' });
    const required = toRef(strings, 'Required');

    translateStrings(rawMessages(i18n));
    i18n.locale.value = 'sl';

    expect(required.value).toBe('Obvezno');
  });

  it('should re-resolve every entry when the same callback is passed again', () => {
    const dictionary: Record<string, string> = { Hello: 'Hello' };
    const { strings, translateStrings } = createTranslatable({ Hello: 'Hello' });
    const cb = (key: string) => dictionary[key];

    translateStrings(cb);
    expect(strings.Hello).toBe('Hello');

    dictionary.Hello = 'Živjo';
    translateStrings(cb);
    expect(strings.Hello).toBe('Živjo');
  });

  it('should keep the placeholders of a raw translation for the reader to substitute', () => {
    const i18n = fakeI18n({ en: {}, sl: { 'grid.FilterColumn': 'Filtriraj stolpec {column}' } });
    const { strings, translateStrings } = createTranslatable({ FilterColumn: 'Filter column {column}' });
    i18n.locale.value = 'sl';

    translateStrings(rawMessages(i18n, 'grid'));

    expect(strings.FilterColumn).toBe('Filtriraj stolpec {column}');
    expect(interpolate(strings.FilterColumn, { column: 'Ime' })).toBe('Filtriraj stolpec Ime');
  });

  it("should take the fallback locale's translation over the library default", () => {
    const i18n = fakeI18n({ en: { 'grid.NoData': 'Nothing here' }, sl: {} });
    const { strings, translateStrings } = createTranslatable({ NoData: 'No data', Loading: 'Loading...' });
    i18n.locale.value = 'sl';

    translateStrings(rawMessages(i18n, 'grid'));

    expect(strings.NoData).toBe('Nothing here');
    expect(strings.Loading).toBe('Loading...');
  });
});

describe('lookup', () => {
  it('should resolve a declared key against its declared default, ignoring the given one', () => {
    const { lookup, translateStrings } = createTranslatable({ NotFound: 'Item {pk} not found' });

    expect(lookup('NotFound', 'ignored', { pk: 42 })).toBe('Item 42 not found');

    translateStrings(() => 'Element {pk} ne obstaja');
    expect(lookup('NotFound', 'ignored', { pk: 42 })).toBe('Element 42 ne obstaja');
  });

  it('should send an undeclared key through the callback when the dictionary admits arbitrary keys', () => {
    const i18n = fakeI18n({
      en: {},
      sl: { 'errors.insufficient_balance': 'Na voljo {available}, potrebno {required}' },
    });
    const { lookup, translateStrings } = createTranslatable<Record<string, string>>({ not_found: 'Not found' });
    i18n.locale.value = 'sl';

    translateStrings(rawMessages(i18n, 'errors'));

    const message = lookup('insufficient_balance', 'balance 5 is short of 10', { required: 10, available: 5 });
    expect(message).toBe('Na voljo 5, potrebno 10');
  });

  it('should fall back to the given default for an undeclared key the callback does not cover', () => {
    const { lookup, translateStrings } = createTranslatable<Record<string, string>>({});

    expect(lookup('unknown_setting', 'Unknown setting: colour')).toBe('Unknown setting: colour');

    translateStrings(() => undefined);
    expect(lookup('unknown_setting', 'Unknown setting: colour')).toBe('Unknown setting: colour');
  });

  it('should update a computed built over it on a locale switch', () => {
    const i18n = fakeI18n({ en: { session_expired: 'Session expired' }, sl: { session_expired: 'Seja je potekla' } });
    const { lookup, translateStrings } = createTranslatable<Record<string, string>>({});
    translateStrings(rawMessages(i18n));
    const message = computed(() => lookup('session_expired', 'Session expired or invalid'));

    expect(message.value).toBe('Session expired');

    i18n.locale.value = 'sl';
    expect(message.value).toBe('Seja je potekla');
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

describe('translate', () => {
  it('should interpolate the current value of the given entry', () => {
    const { strings } = createTranslatable({ MinValue: 'Value must be at least {minValue}' });

    const message = translate(strings, 'MinValue', { minValue: 5 });

    expect(message.value).toBe('Value must be at least 5');
  });

  it('should re-interpolate the same params against a translated entry', () => {
    const { strings, translateStrings } = createTranslatable({ MinValue: 'Value must be at least {minValue}' });
    const message = translate(strings, 'MinValue', { minValue: 5 });

    translateStrings(() => 'Vrednost mora biti vsaj {minValue}');

    expect(message.value).toBe('Vrednost mora biti vsaj 5');
  });

  it('should re-interpolate against the new translation on a locale switch', () => {
    const i18n = fakeI18n({ en: {}, sl: { MinValue: 'Vrednost mora biti vsaj {minValue}' } });
    const { strings, translateStrings } = createTranslatable({ MinValue: 'Value must be at least {minValue}' });
    translateStrings(rawMessages(i18n));
    const message = translate(strings, 'MinValue', { minValue: 5 });

    expect(message.value).toBe('Value must be at least 5');

    i18n.locale.value = 'sl';
    expect(message.value).toBe('Vrednost mora biti vsaj 5');
  });
});
