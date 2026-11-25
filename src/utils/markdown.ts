import { invoke } from '@tauri-apps/api/core';
import { cleanChangelog } from '$utils/meta';

/**
 * github release notes to sanitized html. callers resolve this before opening a
 * changelog modal, so the modal is never painted with an empty body first
 */
export const renderChangelogHtml = (markdown: string) =>
  invoke<string>('parse_and_sanitize_markdown', { markdown: cleanChangelog(markdown) });
