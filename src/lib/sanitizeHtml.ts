type SanitizeOptions = {
  allowYouTubeIframes?: boolean;
};

const SAFE_URL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export const sanitizeUrl = (value: string): string => {
  const raw = (value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('/') || raw.startsWith('#')) return raw;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (SAFE_URL_SCHEMES.includes(parsed.protocol)) return parsed.href;
  } catch {
    return '';
  }

  return '';
};

const isSafeYouTubeIframe = (el: HTMLIFrameElement): boolean => {
  const src = el.getAttribute('src') || '';
  if (!src) return false;
  try {
    const url = new URL(src, window.location.origin);
    return url.hostname === 'www.youtube.com' && url.pathname.startsWith('/embed/');
  } catch {
    return false;
  }
};

export const sanitizeHtml = (html: string, options: SanitizeOptions = {}): string => {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('script, object, embed, link, meta, style').forEach((el) => el.remove());

  const all = doc.body.querySelectorAll('*');
  all.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'iframe') {
      if (!(options.allowYouTubeIframes && isSafeYouTubeIframe(el as HTMLIFrameElement))) {
        el.remove();
        return;
      }
    }

    const attrs = [...el.attributes];
    attrs.forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === 'href' || name === 'src') {
        const safe = sanitizeUrl(value);
        if (!safe) {
          el.removeAttribute(attr.name);
        } else {
          el.setAttribute(attr.name, safe);
        }
      }
    });
  });

  return doc.body.innerHTML;
};

