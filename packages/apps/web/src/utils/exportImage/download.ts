function imageFilename(title: string): string {
  const safeTitle = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 80);
  return `${safeTitle || 'poem-export'}.png`;
}

export function downloadImageDataUrl(dataUrl: string, title = ''): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = imageFilename(title);
  link.click();
}
