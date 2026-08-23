function parseCompanyWebsite(website?: string | null) {
  const value = website?.trim();
  if (!value) return null;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  if (hasScheme && !/^https?:\/\//i.test(value)) return null;

  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function getCompanyIconSources(website?: string | null) {
  const url = parseCompanyWebsite(website);
  if (!url) return [];

  return [
    `${url.origin}/favicon.ico`,
    `${url.origin}/apple-touch-icon.png`,
  ];
}

export function getCompanyWebsiteHostname(website?: string | null) {
  const url = parseCompanyWebsite(website);
  return url?.hostname.replace(/^www\./i, '') ?? '';
}
