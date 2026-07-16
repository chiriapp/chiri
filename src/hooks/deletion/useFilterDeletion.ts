import { useCallback } from 'react';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useDeleteFilter, useFilters } from '$hooks/queries/useFilters';

export const useFilterDeletion = () => {
  const { data: filters = [] } = useFilters();
  const deleteFilterMutation = useDeleteFilter();
  const { confirm, close } = useConfirmDialog();

  const deleteFilter = useCallback(
    async (filterId: string) => {
      const filter = filters.find((f) => f.id === filterId);

      const confirmed = await confirm({
        title: 'Delete filter',
        subtitle: filter?.name,
        message: 'Are you sure? Tasks shown by this filter will not be affected.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        destructive: true,
      });
      if (!confirmed) return false;

      deleteFilterMutation.mutate(filterId);
      close();
      return true;
    },
    [close, confirm, deleteFilterMutation, filters],
  );

  return { deleteFilter };
};
