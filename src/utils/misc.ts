export const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Check if there are any open modal elements in the DOM
 */
export const hasOpenModalElements = () => {
  const fixedInsetElements = document.querySelectorAll('.fixed.inset-0');

  return Array.from(fixedInsetElements).some((el) => {
    const classList = el.classList;
    return ['z-50', 'z-[60]', 'z-[70]'].some((zClass) => classList.contains(zClass));
  });
};

/**
 * Check if a CalDAV server is a Vikunja server
 */
export const isVikunjaServer = (calendarHome: string): boolean => {
  return calendarHome.includes('/dav/projects');
};
