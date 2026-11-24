export const sniffXmlEncoding = (buffer: ArrayBuffer): string => {
  // 1. Read the first 100 bytes directly
  const view = new Uint8Array(buffer.slice(0, 100));
  let header = "";

  // Convert to ASCII string (safe for <?xml ... ?> tags)
  for (let i = 0; i < view.length; i++) {
    header += String.fromCharCode(view[i]);
  }

  // 2. Regex to find encoding="..."
  // Supports single or double quotes, case insensitive
  const match = header.match(/encoding=["']([^"']+)["']/i);

  if (match && match[1]) {
    return match[1].toLowerCase();
  }

  // 3. BOM Checks (Byte Order Mark)
  if (view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) return "utf-8";
  if (view[0] === 0xfe && view[1] === 0xff) return "utf-16be";
  if (view[0] === 0xff && view[1] === 0xfe) return "utf-16le";

  // 4. Fallback: Assumption
  // If no declaration, XML spec says UTF-8, but TISS reality often means ISO-8859-1.
  // We return 'unknown' to let the caller decide policy.
  return "unknown";
};
