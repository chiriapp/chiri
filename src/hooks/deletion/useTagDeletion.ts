import { createElement, useCallback } from 'react';
import { ColoredItemLabel } from '$components/ColoredItemLabel';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useDeleteTag } from '$hooks/queries/useTags';
import type { Tag } from '$types/tag';

export const useTagDeletion = () => {
  const deleteTagMutation = useDeleteTag();
  const { confirm, close } = useConfirmDialog();

  const deleteTag = useCallback(
    async (tagId: string, tags: Tag[]) => {
      const tag = tags.find((t) => t.id === tagId);

      const confirmed = await confirm({
        title: 'Delete tag',
        subtitle: tag
          ? createElement(ColoredItemLabel, {
              name: tag.name,
              icon: tag.icon,
              emoji: tag.emoji,
              color: tag.color,
              defaultIcon: 'tag',
            })
          : undefined,
        message: 'Are you sure? Tasks with this tag will not be affected.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        destructive: true,
      });
      if (!confirmed) return false;

      deleteTagMutation.mutate(tagId);
      close();
      return true;
    },
    [close, confirm, deleteTagMutation],
  );

  return { deleteTag };
};
