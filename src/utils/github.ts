const NEW_ISSUE_URL = 'https://github.com/chiriapp/chiri/issues/new';
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
 * Remove the generated download footer from GitHub release notes.
 */
export const cleanChangelog = (text: string) =>
  text
    .replace(/---\s*\n+##\s*📥\s*Downloads.*$/s, '')
    .replace(/\n+##\s*📥\s*Downloads.*$/s, '')
    .trim();
