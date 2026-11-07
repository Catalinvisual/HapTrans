import { localizeStopEvent, localizeTripEvent } from './trip-notification-i18n';

const LANGS = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

describe('trip notification localization', () => {
  it.each(LANGS)('localizes arrival without claiming driving (%s)', (lang) => {
    const arrived = localizeStopEvent('arrived', 'arrived', 'delivery', lang);
    expect(arrived.trim().length).toBeGreaterThan(3);
    expect(arrived.toLowerCase()).not.toContain('driving');
    expect(localizeStopEvent('arrived', 'unloading', 'delivery', lang)).not.toBe(arrived);
  });

  it('uses the pickup label for pickup completion and delivery label for POD', () => {
    expect(localizeStopEvent('loading', 'completed', 'pickup', 'en')).toBe('Loading completed');
    expect(localizeStopEvent('unloading', 'completed', 'delivery', 'en')).toBe('Delivery completed (POD)');
  });

  it('falls back to English for an unknown language and never returns a raw key', () => {
    expect(localizeTripEvent('cancelled', 'xx')).toBe('Trip cancelled');
    expect(localizeTripEvent('dispatched', 'ro')).toBe('Cursă nouă asignată');
  });
});