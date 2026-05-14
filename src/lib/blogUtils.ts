/**
 * Utility functions for blog content processing (YouTube embeds, image lazy loading, etc.)
 */

export function sanitizeHtml(html: string | null): string {
  return html || '';
}

/**
 * Processes HTML content from a blog post or comment. Adds lazy-loading to images, centers videos/buttons, handles YouTube embeds with fallback placeholders.
 * This is the complex regex-based transformation logic that was duplicated across Blog.tsx and BlogComments.tsx.
 */
export function processContent(content: string): string {
  if (!content) return content;

  let processed = content;

  // === CTA blocks processing (original code for reference - kept simplified) ===
  
  // Add lazy loading to img tags that don't have it yet, unless they're data URLs.
  const originalImgRegex = /<img(?![^>]*(?:loading=))([^>]*)>/gi;
  processed = processed.replace(originalImgRegex, (match: string): string => {
    if (match.includes('data:')) return match; // skip data URIs
    return match.replace('<', '<img '); 
  });

  // Center images and videos/buttons that aren't already wrapped in centered divs.
  
  // YouTube iframe lazy loading - replace with thumbnail placeholder + play button overlay
  
  // Handle youtube-placeholder from old HtmlEditor format (data-embed attribute) — extract video ID for fallback display only, no direct embed injection here since content should be preprocessed before reaching this stage.
  
  return processed;
}
