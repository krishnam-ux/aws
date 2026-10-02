/**
 * Security utilities: SVG Sanitization, PDF Magic Byte validation, and Safe Upload checks
 */

/**
 * Validates PDF magic bytes (%PDF-) to prevent malicious file disguised as PDF
 */
export function isValidPdfBuffer(buffer: Buffer | Uint8Array): boolean {
  if (!buffer || buffer.length < 5) return false;
  // %PDF- magic bytes: 0x25, 0x50, 0x44, 0x46, 0x2D
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

/**
 * Sanitizes SVG content by stripping dangerous tags, script injections, and event handlers
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') return '';

  return (
    svgContent
      // Remove <script> tags and their contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove <foreignObject> tags and their contents
      .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
      // Remove <iframe, <object, <embed, <link tags
      .replace(/<(?:iframe|object|embed|link|base)\b[^>]*\/?>/gi, '')
      // Remove inline event handlers like onload, onerror, onclick, onmouseover, etc.
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      // Remove javascript: URLs in href or xlink:href
      .replace(/(?:href|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, 'href="#"')
  );
}

/**
 * Validates if an SVG contains potentially malicious executable content
 */
export function isDangerousSvg(svgContent: string): boolean {
  if (!svgContent || typeof svgContent !== 'string') return false;
  const dangerousPatterns = [
    /<script\b/i,
    /<foreignObject\b/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /\son\w+\s*=/i,
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i
  ];
  return dangerousPatterns.some((pattern) => pattern.test(svgContent));
}
