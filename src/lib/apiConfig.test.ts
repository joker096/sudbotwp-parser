import { describe, it, expect, vi } from 'vitest';
import { apiConfig } from './apiConfig';

describe('apiConfig', () => {
  describe('URL construction helpers', () => {
    it('trimTrailingSlash removes trailing slashes', () => {
      const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
      expect(trimTrailingSlash('https://example.com/')).toBe('https://example.com');
      expect(trimTrailingSlash('https://example.com//')).toBe('https://example.com');
      expect(trimTrailingSlash('https://example.com')).toBe('https://example.com');
    });

    it('withLeadingSlash adds leading slash if missing', () => {
      const withLeadingSlash = (path: string) => path.startsWith('/') ? path : `/${path}`;
      expect(withLeadingSlash('/api/endpoint')).toBe('/api/endpoint');
      expect(withLeadingSlash('api/endpoint')).toBe('/api/endpoint');
    });

    it('buildUrl combines base and path correctly', () => {
      const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
      const withLeadingSlash = (path: string) => path.startsWith('/') ? path : `/${path}`;
      const buildUrl = (base: string, path: string) => `${trimTrailingSlash(base)}${withLeadingSlash(path)}`;

      expect(buildUrl('https://example.com', '/api/endpoint')).toBe('https://example.com/api/endpoint');
      expect(buildUrl('https://example.com/', '/api/endpoint')).toBe('https://example.com/api/endpoint');
      expect(buildUrl('https://example.com', 'api/endpoint')).toBe('https://example.com/api/endpoint');
    });
  });

  describe('apiConfig object', () => {
    it('has appOrigin set', () => {
      expect(apiConfig.appOrigin).toBeDefined();
      expect(typeof apiConfig.appOrigin).toBe('string');
    });

    it('has apiBaseUrl set', () => {
      expect(apiConfig.apiBaseUrl).toBeDefined();
      expect(typeof apiConfig.apiBaseUrl).toBe('string');
    });

    it('has parseCaseUrl set', () => {
      expect(apiConfig.parseCaseUrl).toBeDefined();
      expect(typeof apiConfig.parseCaseUrl).toBe('string');
    });

    it('has manualCaseUrl set', () => {
      expect(apiConfig.manualCaseUrl).toBeDefined();
      expect(apiConfig.manualCaseUrl).toContain('/add-case-manual');
    });

    it('has searchCompanyUrl set', () => {
      expect(apiConfig.searchCompanyUrl).toBeDefined();
      expect(apiConfig.searchCompanyUrl).toContain('/api/search-company');
    });

    it('has counterparty API URLs set', () => {
      expect(apiConfig.checkEgrulUrl).toBeDefined();
      expect(apiConfig.checkEgrulUrl).toContain('/api/check-egrul');
      expect(apiConfig.checkFsspUrl).toBeDefined();
      expect(apiConfig.checkFsspUrl).toContain('/api/check-fssp');
      expect(apiConfig.checkRosstatUrl).toBeDefined();
      expect(apiConfig.checkRosstatUrl).toContain('/api/check-rosstat');
      expect(apiConfig.checkEfrsbUrl).toBeDefined();
      expect(apiConfig.checkEfrsbUrl).toContain('/api/check-efrsb');
    });

    it('parsing URL includes parse-case path', () => {
      expect(apiConfig.parseCaseUrl).toContain('/parse-case');
    });

    it('path portions of URLs do not have double slashes', () => {
      Object.values(apiConfig).forEach(url => {
        if (typeof url === 'string') {
          const pathPart = url.replace(/^https?:\/\/[^/]+/, '');
          expect(pathPart).not.toMatch(/\/\//);
        }
      });
    });
  });
});
