import { useQuery } from '@tanstack/react-query';
import { db } from '$lib/database';
import { queryKeys } from '$lib/query-client';

export const useTaskHistory = (taskUid: string) => {
  return useQuery({
    queryKey: queryKeys.taskHistory.byTask(taskUid),
    queryFn: () => db.getTaskHistory(taskUid),
  });
};
