import packageJson from '../../package.json';

const GITHUB_REPO = 'chiriapp/chiri';
const NEW_ISSUE_URL = `https://github.com/${GITHUB_REPO}/issues/new`;
const ERROR_REPORT_TEMPLATE = 'error_report.yml';

interface ErrorReportIssueParams {
  title: string;
  steps: string;
  errorMessage: string;
  stackTrace: string;
  systemInformation: string;
  additionalContext?: string;
  componentStack?: string;
}

export const createErrorReportIssueUrl = ({
  title,
  steps,
  errorMessage,
  stackTrace,
  systemInformation,
  additionalContext = '',
  componentStack = '',
}: ErrorReportIssueParams) => {
  const params = new URLSearchParams({
    template: ERROR_REPORT_TEMPLATE,
    title,
    steps,
    error_message: errorMessage,
    stack_trace: stackTrace,
    component_stack: componentStack,
    system_information: systemInformation,
    additional_context: additionalContext,
  });

  return `${NEW_ISSUE_URL}?${params.toString()}`;
};

/**
 * remove the generated download footer from GitHub release notes
 */
export const cleanChangelog = (text: string) =>
  text
    .replace(/---\s*\n+##\s*📥\s*Downloads.*$/s, '')
    .replace(/\n+##\s*📥\s*Downloads.*$/s, '')
    .trim();

const CHANGELOG_PREVIEW_MAX_LINES = 10;
const CHANGELOG_PREVIEW_MAX_CHARS = 900;

export const getChangelogPreview = (text: string) => {
  const normalizedText = text.trim();
  if (!normalizedText) return '';

  const lines = normalizedText.split(/\r?\n/);
  const previewLines: string[] = [];
  let visibleLines = 0;
  let charCount = 0;
  let isInFence = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const countsAsVisibleLine = trimmedLine.length > 0;
    const nextCharCount = charCount + line.length + 1;

    if (
      previewLines.length > 0 &&
      !isInFence &&
      ((countsAsVisibleLine && visibleLines >= CHANGELOG_PREVIEW_MAX_LINES) ||
        nextCharCount > CHANGELOG_PREVIEW_MAX_CHARS)
    ) {
      break;
    }

    previewLines.push(line);
    charCount = nextCharCount;

    if (countsAsVisibleLine) {
      visibleLines += 1;
    }

    if (/^(```|~~~)/.test(trimmedLine)) {
      isInFence = !isInFence;
    }
  }

  if (isInFence) {
    previewLines.push('```');
  }

  return previewLines.join('\n').trim();
};

interface AppInfo {
  version: string;
  description: string;
  author: string;
}

export const fetchReleaseNotes = async (version: string) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/app-v${version}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } },
    );
    if (!response.ok) return { body: '' };
    const release = (await response.json()) as { body?: string; published_at?: string };
    return { body: release.body ?? '', date: release.published_at };
  } catch {
    return { body: '' };
  }
};

/**
 * get application information from package.json
 */
export const getAppInfo = () => {
  const pkg = packageJson satisfies AppInfo;

  return {
    version: pkg.version,
    name: 'Chiri',
    description: pkg.description,
    author: pkg.author,
  } as const;
};
