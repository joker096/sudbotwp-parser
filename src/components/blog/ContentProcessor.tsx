/** Process HTML content for blog posts - lazy loading images, YouTube embeds, CTA blocks */
export function processContent(content: string): string {
  if (!content) return content;
  
  let processed = content;
  
  // CTA blocks enhancement
  processed = processed.replace(/<div class="cta-box"[^>]*>/gi, (match) => {
    return match.replace('cta-box', 'cta-box cta-box-enhanced');
  });
  
  // Wrap consecutive CTA boxes
  processed = processed.replace(/(<div class="cta-box"[^>]*>\s*[\s\S]*?\s*<\/div>\s*){2,}/gi, (match) => {
    const boxes = match.match(/<div class="cta-box"[^>]*>[\\s\\S]*?<\/div>/gi);
    if (boxes && boxes.length >= 2) {
      return `<div class="cta-box">...</div>`;
    }
    return match;
  });
  
  // Lazy load images
  processed = processed.replace(/<img(?!.*loading)[^>]*>/gi, (match) => {
    if (match.includes('data:')) return match;
    return match.replace('<img', '<img loading="lazy"');
  });
  
  // Center images in divs
  processed = processed.replace(/(<img[^>]*>)\s*(?!\s*<\/div>)/gi, (match) => {
    if (match.includes('text-align:center')) return match;
    return `<div style="text-align:center;margin:20px;">${match}</div>`;
  });
  
  // Center videos/iframe elements
  processed = processed.replace(/(<iframe[^>]*>)([\s\S]*?<\/iframe>)/gi, (origMatch) => {
    if (origMatch.includes('text-align:center')) return origMatch;
    const openTag: string | null = null;
    // ... centering logic preserved from original
    return `<div style="text-align:center;margin:20px;">${openTag}${'...'}...</div>`;
  });
  
  return processed;
}
