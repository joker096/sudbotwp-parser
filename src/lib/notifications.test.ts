import { describe, it, expect, vi } from 'vitest';
import { formatHearingNotification, formatResultNotification } from './notifications';

describe('notifications', () => {
  describe('formatHearingNotification', () => {
    const event = {
      date: '15.06.2026',
      time: '10:30',
      location: 'Зал 5',
    };

    it('formats hearing notification with all fields', () => {
      const result = formatHearingNotification('2-123/2024', 'АС Москвы', event, 24);
      expect(result).toContain('2-123/2024');
      expect(result).toContain('АС Москвы');
      expect(result).toContain('15.06.2026');
      expect(result).toContain('10:30');
      expect(result).toContain('Зал 5');
      expect(result).toContain('24 час');
    });

    it('formats notification without time', () => {
      const eventNoTime = { date: '15.06.2026' };
      const result = formatHearingNotification('2-123/2024', 'АС Москвы', eventNoTime, 24);
      expect(result).not.toContain('в ');
      expect(result).toContain('15.06.2026');
    });

    it('formats notification without location', () => {
      const eventNoLocation = { date: '15.06.2026', time: '10:30' };
      const result = formatHearingNotification('2-123/2024', 'АС Москвы', eventNoLocation, 24);
      expect(result).not.toContain('Место:');
    });

    it('handles 1 hour notification', () => {
      const result = formatHearingNotification('2-123/2024', 'Суд', event, 1);
      expect(result).toContain('1 час');
    });
  });

  describe('formatResultNotification', () => {
    it('formats result notification', () => {
      const result = formatResultNotification('2-123/2024', 'АС Москвы', 'Иск удовлетворен');
      expect(result).toContain('2-123/2024');
      expect(result).toContain('АС Москвы');
      expect(result).toContain('Иск удовлетворен');
    });

    it('contains HTML bold tags', () => {
      const result = formatResultNotification('2-123/2024', 'АС Москвы', 'Статус');
      expect(result).toContain('<b>');
    });
  });
});
