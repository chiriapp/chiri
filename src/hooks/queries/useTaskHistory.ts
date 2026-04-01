import { useQuery } from '@tanstack/react-query';
import { db } from '$lib/database';

export const useTaskHistory = (taskUid: string) => {
  return useQuery({
    queryKey: ['taskHistory', taskUid],
    queryFn: () => db.getTaskHistory(taskUid),
  });
};
