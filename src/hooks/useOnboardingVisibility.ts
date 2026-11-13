import { useCallback, useEffect, useState } from 'react';
import type { Account } from '$types/account';
import type { Task } from '$types/task/model';

interface ShouldShowOnboardingInput {
  onboardingCompleted: boolean;
  onboardingSessionActive?: boolean;
  accountsPending: boolean;
  tasksPending: boolean;
  accounts: Account[];
  tasks: Task[];
}

export const shouldShowOnboarding = ({
  onboardingCompleted,
  onboardingSessionActive = false,
  accountsPending,
  tasksPending,
  accounts,
  tasks,
}: ShouldShowOnboardingInput) => {
  if (onboardingCompleted) return false;
  if (onboardingSessionActive) return true;
  if (accountsPending || tasksPending) return false;

  const hasCalDAVAccount = accounts.some((account) => account.caldav !== null);
  const hasUserTasks = tasks.length > 0;

  return !hasCalDAVAccount && !hasUserTasks;
};

interface UseOnboardingVisibilityOptions {
  onboardingCompleted: boolean;
  accountsPending: boolean;
  tasksPending: boolean;
  accounts: Account[];
  tasks: Task[];
}

export const useOnboardingVisibility = ({
  onboardingCompleted,
  accountsPending,
  tasksPending,
  accounts,
  tasks,
}: UseOnboardingVisibilityOptions) => {
  const [onboardingSessionActive, setOnboardingSessionActive] = useState(false);

  const showOnboarding = shouldShowOnboarding({
    onboardingCompleted,
    onboardingSessionActive,
    accountsPending,
    tasksPending,
    accounts,
    tasks,
  });

  useEffect(() => {
    if (onboardingCompleted) {
      setOnboardingSessionActive(false);
      return;
    }

    if (showOnboarding && !onboardingSessionActive) {
      setOnboardingSessionActive(true);
    }
  }, [onboardingCompleted, onboardingSessionActive, showOnboarding]);

  const requestOnboarding = useCallback(() => {
    setOnboardingSessionActive(true);
  }, []);

  return { showOnboarding, requestOnboarding };
};
