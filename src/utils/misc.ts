export const generateUUID = () => {
  return crypto.randomUUID();
};

export const isVikunjaServer = (calendarHome: string) => {
  return calendarHome.includes('/dav/projects');
};

/**
 * Check if there are any open modal elements in the DOM
 */
export const hasOpenModalElements = () => {
  const fixedInsetElements = document.querySelectorAll('.fixed.inset-0');

  return Array.from(fixedInsetElements).some((el) => {
    const classList = el.classList;
    return ['z-50', 'z-60', 'z-70'].some((zClass) => classList.contains(zClass));
  });
};

/**
 * Pluralize a word based on count
 */
export const pluralize = (count: number, singular: string, plural?: string) => {
  return count === 1 ? singular : (plural ?? `${singular}s`);
};

/**
 * Clamp a position to the viewport bounds
 */
export const clampToViewport = (
  x: number,
  y: number,
  menuWidth = 240,
  menuHeight = 260,
  padding = 8,
) => {
  const maxX = Math.max(padding, window.innerWidth - menuWidth - padding);
  const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);

  return {
    x: Math.min(Math.max(x, padding), maxX),
    y: Math.min(Math.max(y, padding), maxY),
  };
};

/**
 * Download a file to the user's computer
 */
export const downloadFile = (
  content: string,
  fileName: string,
  mimeType: string = 'text/plain',
) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = fileName;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
};
