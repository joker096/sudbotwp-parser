function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function withLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

function buildUrl(base: string, path: string) {
  return `${trimTrailingSlash(base)}${withLeadingSlash(path)}`;
}

const APP_ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://sud.cvr.name';

const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : APP_ORIGIN)
);

const PARSE_CASE_URL = import.meta.env.VITE_PARSE_CASE_URL || (
  import.meta.env.DEV
    ? 'http://localhost:3007/parse-case'
    : buildUrl(APP_ORIGIN, '/parse-case')
);

const COUNTERPARTY_BASE = trimTrailingSlash(PARSE_CASE_URL).replace(/\/parse-case$/, '');

export const apiConfig = {
  appOrigin: APP_ORIGIN,
  apiBaseUrl: API_BASE_URL,
  parseCaseUrl: PARSE_CASE_URL,
  manualCaseUrl: buildUrl(API_BASE_URL, '/add-case-manual'),
  searchCompanyUrl: buildUrl(API_BASE_URL, '/api/search-company'),
  checkEgrulUrl: buildUrl(COUNTERPARTY_BASE, '/api/check-egrul'),
  checkFsspUrl: buildUrl(COUNTERPARTY_BASE, '/api/check-fssp'),
  checkRosstatUrl: buildUrl(COUNTERPARTY_BASE, '/api/check-rosstat'),
  checkEfrsbUrl: buildUrl(COUNTERPARTY_BASE, '/api/check-efrsb'),
};
