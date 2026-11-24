import type { Ref } from 'react';

interface ChangelogProseProps {
  html: string;
  /** compact type scale for the inline preview in the update modal */
  density?: 'default' | 'compact';
  contentRef?: Ref<HTMLDivElement>;
}

const BASE_CLASSES =
  'changelog-prose [&_a]:text-primary-ink [&_a]:hover:opacity-80 [&_code]:rounded-sm [&_code]:bg-surface-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-surface-800 [&_h2:first-child]:mt-0 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-semibold [&_h2]:text-surface-800 dark:[&_h2]:text-surface-200 [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-surface-700 dark:[&_h3]:text-surface-300 [&_strong]:font-semibold [&_ul]:ml-6 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:space-y-1';

const DENSITY_CLASSES = {
  default:
    '[&_h2]:text-base [&_h3]:mb-2 [&_h3]:text-sm [&_p]:my-2 [&_p]:text-sm [&_p]:text-surface-700 dark:[&_p]:text-surface-300 [&_ul]:my-2 [&_ul]:text-surface-700 dark:[&_ul]:text-surface-300',
  compact:
    'text-sm [&_h2]:text-sm [&_h3]:mb-1.5 [&_h3]:text-xs [&_p]:my-1.5 [&_p]:text-surface-600 dark:[&_p]:text-surface-400 [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ul]:text-surface-600 dark:[&_ul]:text-surface-400',
} as const;

export const ChangelogProse = ({ html, density = 'default', contentRef }: ChangelogProseProps) => (
  <div
    ref={contentRef}
    className={`${BASE_CLASSES} ${DENSITY_CLASSES[density]}`}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by Rust backend
    dangerouslySetInnerHTML={{ __html: html }}
  />
);
