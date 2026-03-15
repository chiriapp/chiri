import { openUrl } from '@tauri-apps/plugin-opener';
import { arch, exeExtension, locale, platform, version } from '@tauri-apps/plugin-os';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { loggers } from '$lib/logger';
import { getAppInfo } from '$utils/version';

const log = loggers.errorBoundary;

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the logger
    log.error('Error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      stack: error.stack,
    });

    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleReportIssue = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    try {
      const [currentPlatform, currentArch, currentVersion, currentExtension, currentLocale] =
        await Promise.all([platform(), arch(), version(), exeExtension(), locale()]);

      const errorTitle = `Runtime error on ${currentPlatform} ${currentVersion}`;
      const errorBody = `**System Information:**
\`\`\`
App Version: ${getAppInfo().version}
OS: ${currentPlatform}
Version: ${currentVersion}
Architecture: ${currentArch}
App Extension: ${currentExtension || 'Unknown'}
System Locale: ${currentLocale}
\`\`\`

**Error Message:**
\`\`\`
${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}
\`\`\`

**Component Stack:**
\`\`\`
${errorInfo?.componentStack || 'No component stack available'}
\`\`\`

**Steps to reproduce:**
<!-- Describe what you were doing when this happened -->

**Additional context:**
<!-- Any other relevant information -->`;

      const issueUrl = `https://github.com/SapphoSys/chiri/issues/new?title=${encodeURIComponent(errorTitle)}&body=${encodeURIComponent(errorBody)}`;
      await openUrl(issueUrl);
    } catch (err) {
      log.error('Failed to open issue report:', err);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      return (
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-surface-900 p-8">
          <div className="w-full max-w-2xl space-y-6 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 shadow-lg">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                Something went wrong :(
              </h1>
              <p className="text-surface-600 dark:text-surface-400">
                The application encountered an unexpected error.
              </p>
            </div>

            {error && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                  Error details:
                </h2>
                <div className="max-h-48 overflow-y-auto overflow-x-hidden rounded-md bg-surface-100 dark:bg-surface-900 p-4 font-mono text-sm border border-surface-200 dark:border-surface-700">
                  <p className="text-red-600 dark:text-red-400 break-words">{error.message}</p>
                  {errorInfo?.componentStack && import.meta.env.DEV && (
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-surface-600 dark:text-surface-400">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/30 p-5 shadow-lg space-y-2.5">
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
                  Report Issue
                </h2>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Help us fix this issue by submitting a bug report on GitHub.
                </p>
                <button
                  type="button"
                  onClick={this.handleReportIssue}
                  className="rounded-md bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                >
                  File issue on GitHub
                </button>
              </div>

              <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/30 p-5 shadow-lg space-y-2.5">
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
                  Recovery Options
                </h2>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  You can try to continue using the app, or reload to attempt a fresh start.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Continue anyway
                  </button>

                  <button
                    type="button"
                    onClick={this.handleReload}
                    className="rounded-md bg-primary-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Reload app
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
