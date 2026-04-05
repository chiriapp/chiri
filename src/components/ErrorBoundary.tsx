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
  confirmResetPrefs: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      confirmResetPrefs: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      confirmResetPrefs: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleResetPreferences = () => {
    localStorage.removeItem('chiri-settings');
    window.location.reload();
  };

  handleReportIssue = async () => {
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
      const { error, errorInfo, confirmResetPrefs } = this.state;

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
                  <p className="text-red-600 dark:text-red-400 wrap-break-word">{error.message}</p>
                  {errorInfo?.componentStack && import.meta.env.DEV && (
                    <pre className="mt-2 whitespace-pre-wrap wrap-break-word text-xs text-surface-600 dark:text-surface-400">
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
                  className="rounded-md bg-primary-500 text-primary-contrast hover:bg-primary-600 px-4 py-2 text-sm font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  File issue on GitHub
                </button>
              </div>

              <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/30 p-5 shadow-lg space-y-2.5">
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
                  Reset Preferences
                </h2>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Reset all preferences to their defaults and reload. Your accounts and task data
                  will not be affected.
                </p>
                {!confirmResetPrefs ? (
                  <button
                    type="button"
                    onClick={() => this.setState({ confirmResetPrefs: true })}
                    className="rounded-md bg-surface-200 dark:bg-surface-700 px-4 py-2 text-sm font-medium text-surface-800 dark:text-surface-200 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    Reset Preferences
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Are you sure? All preferences will be reset to defaults and the app will
                      reload.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={this.handleResetPreferences}
                        className="rounded-md bg-red-600 dark:bg-red-500 px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-red-700 dark:hover:bg-red-600 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      >
                        Yes, Reset Preferences
                      </button>
                      <button
                        type="button"
                        onClick={() => this.setState({ confirmResetPrefs: false })}
                        className="rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
                    className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-600 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    Continue anyway
                  </button>

                  <button
                    type="button"
                    onClick={this.handleReload}
                    className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-600 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
