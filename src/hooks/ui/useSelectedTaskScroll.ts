import type { Virtualizer } from '@tanstack/react-virtual';
import { type RefObject, useLayoutEffect, useRef } from 'react';

interface UseSelectedTaskScrollOptions {
  taskId: string | null;
  rowIndex: number | undefined;
  lastRowIndex: number;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollElementRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
}

/**
 * keeps the selected or highlighted task in view, scrolling to it in the same
 * commit as the selection: a scroll that lands one paint later reads as the list
 * jumping on its own
 */
export const useSelectedTaskScroll = ({
  taskId,
  rowIndex,
  lastRowIndex,
  virtualizer,
  scrollElementRef,
  contentRef,
}: UseSelectedTaskScrollOptions) => {
  const scrolledTaskIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!taskId) {
      scrolledTaskIdRef.current = null;
      return;
    }
    // rows can land after a selection is restored (tasks still loading), so only
    // remember a task once its row exists
    if (rowIndex === undefined || scrolledTaskIdRef.current === taskId) return;
    scrolledTaskIdRef.current = taskId;

    const content = contentRef.current;
    const scrollElement = scrollElementRef.current;
    if (!content || !scrollElement) return;

    // the rows reflow whenever the list narrows and the virtualizer only hears
    // about it when the resize observer runs, so its cached sizes (and its total
    // height) are stale here; `measureElement` would answer from that cache
    for (const row of Array.from(content.children)) {
      if (!(row instanceof HTMLElement)) continue;
      const height = row.offsetHeight;
      if (height === 0) continue;
      virtualizer.resizeItem(virtualizer.indexFromElement(row), height);
    }

    virtualizer.scrollToIndex(rowIndex, { align: 'auto' });

    // a half-visible last row reads as a card cut in half, so a click on one of the
    // final rows shows the end of the list instead; anything further up has no
    // business moving the list at all
    if (rowIndex < lastRowIndex - 1) return;

    const lastRow = content.lastElementChild;
    if (lastRow?.getAttribute('data-index') !== String(lastRowIndex)) return;

    const viewportRect = scrollElement.getBoundingClientRect();
    const viewportBottom = viewportRect.bottom;
    const lastRowRect = lastRow.getBoundingClientRect();
    if (lastRowRect.top >= viewportBottom || lastRowRect.bottom <= viewportBottom) return;

    // only tidy a card that is mostly on screen: one that merely peeks past the fold
    // is how a scrollable list is supposed to look, and snapping for it would move
    // the list further than the card is worth
    const visibleHeight = viewportBottom - lastRowRect.top;
    if (visibleHeight <= lastRowRect.bottom - viewportBottom) return;

    virtualizer.scrollToIndex(lastRowIndex, { align: 'end' });
  }, [contentRef, lastRowIndex, rowIndex, scrollElementRef, taskId, virtualizer]);
};
