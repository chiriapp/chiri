import { openUrl } from '@tauri-apps/plugin-opener';
import { arch, exeExtension, locale, platform, version } from '@tauri-apps/plugin-os';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { loggers } from '$lib/logger';
import { createErrorReportIssueUrl, getAppInfo } from '$utils/meta';
import { formatPlatformName } from '$utils/platform';

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
    // update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // log the error to the logger
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
      const displayPlatform = formatPlatformName(currentPlatform);

      const errorTitle = `Runtime error on ${displayPlatform} ${currentVersion}`;
      const systemInformation = `- App Version: ${getAppInfo().version}
- OS: ${displayPlatform}
- Version: ${currentVersion}
- Architecture: ${currentArch}
- App Extension: ${currentExtension || 'Unknown'}
- System Locale: ${currentLocale}`;

      const issueUrl = createErrorReportIssueUrl({
        title: errorTitle,
        steps: '<!-- Describe what you were doing when this happened -->',
        errorMessage: error.message,
        stackTrace: error.stack || 'No stack trace available',
        componentStack: errorInfo?.componentStack || 'No component stack available',
        systemInformation,
      });
      await openUrl(issueUrl);
    } catch (err) {
      log.error('Failed to open issue report:', err);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo, confirmResetPrefs } = this.state;

      return (
        <div className="flex min-h-screen items-center justify-center bg-white p-8 dark:bg-surface-900">
          <div className="w-full max-w-2xl space-y-6 rounded-lg border border-surface-200 bg-white p-6 shadow-lg dark:border-surface-700 dark:bg-surface-800">
            <div className="space-y-2">
              <h1 className="font-bold text-3xl text-surface-900 dark:text-surface-50">
                Something went wrong :(
              </h1>
              <p className="text-surface-600 dark:text-surface-400">
                The application encountered an unexpected error.
              </p>
            </div>

            {error && (
              <div className="space-y-2">
                <h2 className="font-semibold text-lg text-surface-900 dark:text-surface-50">
                  Error details:
                </h2>
                <div className="max-h-48 overflow-y-auto overflow-x-hidden rounded-md border border-surface-200 bg-surface-100 p-4 font-mono text-sm dark:border-surface-700 dark:bg-surface-900">
                  <p className="wrap-break-word text-semantic-error">{error.message}</p>
                  {errorInfo?.componentStack && import.meta.env.DEV && (
                    <pre className="wrap-break-word mt-2 whitespace-pre-wrap text-surface-600 text-xs dark:text-surface-400">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2.5 rounded-lg border border-surface-200 bg-white p-5 shadow-lg dark:border-surface-700 dark:bg-surface-900/30">
                <h2 className="font-semibold text-surface-900 text-xl dark:text-surface-50">
                  Report Issue
                </h2>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Help us fix this issue by submitting a bug report on GitHub.
                </p>
                <button
                  type="button"
                  onClick={this.handleReportIssue}
                  className="rounded-md bg-primary-500 px-4 py-2 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  File issue on GitHub
                </button>
              </div>

              <div className="space-y-2.5 rounded-lg border border-surface-200 bg-white p-5 shadow-lg dark:border-surface-700 dark:bg-surface-900/30">
                <h2 className="font-semibold text-surface-900 text-xl dark:text-surface-50">
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
                    className="rounded-md bg-surface-200 px-4 py-2 font-medium text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
                  >
                    Reset Preferences
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="font-semibold text-semantic-error text-sm">
                      Are you sure? All preferences will be reset to defaults and the app will
                      reload.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={this.handleResetPreferences}
                        className="rounded-md bg-semantic-error px-4 py-2 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-offset-2"
                      >
                        Yes, Reset Preferences
                      </button>
                      <button
                        type="button"
                        onClick={() => this.setState({ confirmResetPrefs: false })}
                        className="rounded-md border border-surface-200 bg-white px-4 py-2 font-medium text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 rounded-lg border border-surface-200 bg-white p-5 shadow-lg dark:border-surface-700 dark:bg-surface-900/30">
                <h2 className="font-semibold text-surface-900 text-xl dark:text-surface-50">
                  Recovery Options
                </h2>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  You can try to continue using the app, or reload to attempt a fresh start.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="rounded-md bg-primary-500 px-4 py-2 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    Continue anyway
                  </button>

                  <button
                    type="button"
                    onClick={this.handleReload}
                    className="rounded-md bg-primary-500 px-4 py-2 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
