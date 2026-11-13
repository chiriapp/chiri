import { useCallback, useEffect, useRef } from 'react';
import { connectionStore } from '$context/connectionContext';
import { type AccountConnectionTestResult, testAccountConnection } from '$lib/caldav/test';
import type { HttpRequestContext } from '$lib/http';
import type { Account } from '$types/account';

interface UseAccountConnectionTestRunnerOptions {
  enforceVapid: boolean;
  operationIdPrefix: string;
}

interface ActiveTest {
  accountId: string;
  controller: AbortController;
  operationId: string;
}

export class AccountConnectionTestCancelledError extends Error {
  constructor() {
    super('Connection test cancelled');
    this.name = 'AccountConnectionTestCancelledError';
  }
}

export const useAccountConnectionTestRunner = ({
  enforceVapid,
  operationIdPrefix,
}: UseAccountConnectionTestRunnerOptions) => {
  const activeTestsRef = useRef(new Map<string, ActiveTest>());

  useEffect(() => {
    return () => {
      for (const { accountId, controller, operationId } of activeTestsRef.current.values()) {
        controller.abort();
        connectionStore.endTesting(accountId, operationId);
      }
      activeTestsRef.current.clear();
    };
  }, []);

  const runTest = useCallback(
    async (account: Account): Promise<AccountConnectionTestResult> => {
      const controller = new AbortController();
      const operationId = `${operationIdPrefix}:${account.id}:${crypto.randomUUID()}`;
      const context: HttpRequestContext = {
        operationId,
        signal: controller.signal,
      };
      const activeTest = { accountId: account.id, controller, operationId };
      activeTestsRef.current.set(account.id, activeTest);

      try {
        return await testAccountConnection(account, enforceVapid, context);
      } catch (error) {
        if (controller.signal.aborted) {
          throw new AccountConnectionTestCancelledError();
        }
        throw error;
      } finally {
        if (activeTestsRef.current.get(account.id) === activeTest) {
          activeTestsRef.current.delete(account.id);
        }
      }
    },
    [enforceVapid, operationIdPrefix],
  );

  return { runTest };
};
