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
