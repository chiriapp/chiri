import { openUrl } from '@tauri-apps/plugin-opener';
import { arch, exeExtension, locale, platform, version } from '@tauri-apps/plugin-os';
import { version as AppVersion } from '../../package.json';
import { deleteDatabase } from './bootstrap';
import { loggers } from './logger';

const log = loggers.bootstrap;

export const createBootstrapErrorUI = async (error: unknown): Promise<void> => {
  const [currentPlatform, currentArch, currentVersion, currentExtension, currentLocale] =
    await Promise.all([platform(), arch(), version(), exeExtension(), locale()]);

  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = '';

  const container = document.createElement('div');
  container.className =
    'flex min-h-screen items-center justify-center bg-white dark:bg-surface-900/50 p-6';

  const content = document.createElement('div');
  content.className =
    'w-full max-w-2xl space-y-6 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 shadow-lg';

  const header = document.createElement('div');
  header.className = 'space-y-2';

  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold text-surface-900 dark:text-surface-50';
  title.textContent = 'Something went wrong :(';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-surface-600 dark:text-surface-400';
  subtitle.textContent = 'The application encountered a critical error during startup.';

  header.appendChild(title);
  header.appendChild(subtitle);

  const errorSection = document.createElement('div');
  errorSection.className = 'space-y-2';

  const errorTitle = document.createElement('h2');
  errorTitle.className = 'text-lg font-semibold text-surface-900 dark:text-surface-50';
  errorTitle.textContent = 'Error details:';

  const errorBox = document.createElement('div');
  errorBox.className =
    'max-h-48 overflow-auto rounded-md bg-muted/80 p-4 font-mono text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900';

  const errorText = document.createElement('p');
  errorText.className = 'text-red-600 dark:text-red-400 whitespace-pre-line selectable';
  errorText.textContent = `${String(error)}`;

  errorBox.appendChild(errorText);
  errorSection.appendChild(errorTitle);
  errorSection.appendChild(errorBox);

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'space-y-4';

  const reportCard = createActionCard(
    'Report Issue',
    'Help us fix this issue by submitting a bug report on GitHub.',
    'File issue on GitHub',
    'border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/30',
    'bg-primary-500 text-primary-contrast hover:bg-primary-600 focus:ring-primary-500',
    async () => {
      const errorTitle = `Critical startup error on ${currentPlatform} ${currentVersion}`;
      const errorBody = `**System Information:**
\`\`\`
App Version: ${AppVersion}
OS: ${currentPlatform}
Version: ${currentVersion}
Architecture: ${currentArch}
App Extension: ${currentExtension || 'Unknown'}
System Locale: ${currentLocale}
\`\`\`

**Error Message:**
\`\`\`
${error}

Stack Trace:
${error instanceof Error && error.stack ? error.stack : 'No stack trace available'}
\`\`\`

**Steps to reproduce:**
<!-- Describe what you were doing when this happened -->

**Additional context:**
<!-- Any other relevant information -->`;

      const issueUrl = `https://github.com/SapphoSys/caldav-tasks/issues/new?title=${encodeURIComponent(errorTitle)}&body=${encodeURIComponent(errorBody)}`;
      await openUrl(issueUrl);
    },
  );

  const resetCardDescription = `As a last resort, you can try resetting the local database. This will attempt to clear any corrupted data that might be causing the issue.

This won't delete any data on your CalDAV servers, however local data will be lost and accounts will need to be set up again.`;

  const resetCard = createActionCard(
    'Reset Database',
    resetCardDescription,
    'Reset Database and Reload',
    'border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/30',
    'bg-red-600 dark:bg-red-500 text-primary-contrast hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500',
    () => {},
  );

  const resetTitle = resetCard.querySelector('h2');
  if (resetTitle) {
    resetTitle.className = 'text-xl font-semibold';
  }

  const resetBtn = resetCard.querySelector('button');
  if (!resetBtn) throw new Error('Reset button not found');
  resetBtn.id = 'resetBtn';

  const confirmSection = document.createElement('div');
  confirmSection.id = 'resetConfirmSection';
  confirmSection.className = 'hidden space-y-3';

  const confirmText = document.createElement('p');
  confirmText.className = 'text-sm text-red-600 dark:text-red-400 font-semibold';
  confirmText.textContent = 'Are you sure? This action cannot be undone.';

  const confirmButtons = document.createElement('div');
  confirmButtons.className = 'flex gap-3';

  const confirmBtn = document.createElement('button');
  confirmBtn.id = 'resetConfirmBtn';
  confirmBtn.className =
    'flex-1 rounded-md bg-red-600 dark:bg-red-500 px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-red-700 dark:hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2';
  confirmBtn.textContent = 'Yes, Reset Database';

  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'resetCancelBtn';
  cancelBtn.className =
    'flex-1 rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
  cancelBtn.textContent = 'Cancel';

  confirmButtons.appendChild(confirmBtn);
  confirmButtons.appendChild(cancelBtn);
  confirmSection.appendChild(confirmText);
  confirmSection.appendChild(confirmButtons);

  resetBtn.parentElement?.insertBefore(confirmSection, resetBtn);

  resetBtn.addEventListener('click', () => {
    resetBtn.classList.add('hidden');
    confirmSection.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    confirmSection.classList.add('hidden');
    resetBtn.classList.remove('hidden');
  });

  confirmBtn.addEventListener('click', async () => {
    confirmBtn.textContent = 'Resetting...';
    confirmBtn.setAttribute('disabled', 'true');

    try {
      await deleteDatabase();
    } catch (err) {
      confirmBtn.textContent = 'Reset Failed';
      alert(`Failed to reset database: ${err}`);
      log.error('Failed to reset database:', err);
    }
  });

  actionsContainer.appendChild(reportCard);
  actionsContainer.appendChild(resetCard);

  content.appendChild(header);
  content.appendChild(errorSection);
  content.appendChild(actionsContainer);

  container.appendChild(content);
  root.appendChild(container);
};

const createActionCard = (
  title: string,
  description: string,
  buttonText: string,
  cardClasses: string,
  buttonClasses: string,
  onButtonClick: () => void | Promise<void>,
): HTMLDivElement => {
  const card = document.createElement('div');
  card.className = `rounded-lg ${cardClasses} p-5 shadow-lg space-y-2.5`;

  const cardTitle = document.createElement('h2');
  cardTitle.className = 'text-xl font-semibold text-surface-900 dark:text-surface-50';
  cardTitle.textContent = title;

  const cardDesc = document.createElement('p');
  cardDesc.className = 'text-sm text-surface-600 dark:text-surface-400 whitespace-pre-line';
  cardDesc.textContent = description;

  const button = document.createElement('button');
  button.className = `rounded-md ${buttonClasses} px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`;
  button.textContent = buttonText;
  button.addEventListener('click', onButtonClick);

  card.appendChild(cardTitle);
  card.appendChild(cardDesc);
  card.appendChild(button);

  return card;
};
