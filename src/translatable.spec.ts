import { computed } from 'vue';

import { createTranslatable, interpolate, translate } from './translatable';

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
});
