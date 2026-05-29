import type { Account, Task } from '$types';

interface ShouldShowOnboardingInput {
  onboardingCompleted: boolean;
  accountsPending: boolean;
  tasksPending: boolean;
  accounts: Account[];
  tasks: Task[];
}

export const shouldShowOnboarding = ({
  onboardingCompleted,
  accountsPending,
  tasksPending,
  accounts,
  tasks,
}: ShouldShowOnboardingInput) => {
  if (onboardingCompleted || accountsPending || tasksPending) return false;

  const hasCalDAVAccount = accounts.some((account) => account.caldav !== null);
  const hasUserTasks = tasks.length > 0;

  return !hasCalDAVAccount && !hasUserTasks;
};
