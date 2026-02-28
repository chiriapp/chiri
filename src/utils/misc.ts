export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Check if there are any open modal elements in the DOM
 */
export function hasOpenModalElements(): boolean {
  const fixedInsetElements = document.querySelectorAll('.fixed.inset-0');
  return Array.from(fixedInsetElements).some((el) => {
    const classList = el.classList;
    return (
      classList.contains('z-50') || classList.contains('z-[60]') || classList.contains('z-[70]')
    );
  });
}
