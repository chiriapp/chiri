import { createContext, useContext } from 'react';

export type DismissableLayerType =
  | 'panel'
  | 'modal'
  | 'context-menu'
  | 'dropdown'
  | 'confirm-dialog';

export type DismissableLayerEscapeBehavior = 'dismiss' | 'block' | 'none';

const DISMISSABLE_LAYER_PRIORITIES: Record<DismissableLayerType, number> = {
  panel: 10,
  modal: 50,
  'context-menu': 50,
  dropdown: 50,
  'confirm-dialog': 100,
};

export const getDismissableLayerPriority = (type: DismissableLayerType) =>
  DISMISSABLE_LAYER_PRIORITIES[type];

export interface DismissableLayerEntry {
  id: symbol;
  type: DismissableLayerType;
  priority: number;
  order: number;
  escapeBehavior: DismissableLayerEscapeBehavior;
  onEscape?: (event: KeyboardEvent) => void;
}

export interface DismissableLayerRegistration {
  id: symbol;
  type: DismissableLayerType;
  priority: number;
  escapeBehavior: DismissableLayerEscapeBehavior;
  onEscape?: (event: KeyboardEvent) => void;
}

export interface DismissableLayerState {
  isAnyModalOpen: boolean;
  isContextMenuOpen: boolean;
}

interface DismissableLayerContextValue extends DismissableLayerState {
  registerLayer: (layer: DismissableLayerRegistration) => () => void;
}

const fallbackContext: DismissableLayerContextValue = {
  isAnyModalOpen: false,
  isContextMenuOpen: false,
  registerLayer: () => () => {},
};

export const DismissableLayerContext =
  createContext<DismissableLayerContextValue>(fallbackContext);

export const useDismissableLayerContext = () => useContext(DismissableLayerContext);

export const useDismissableLayerState = (): DismissableLayerState => {
  const { isAnyModalOpen, isContextMenuOpen } = useContext(DismissableLayerContext);
  return { isAnyModalOpen, isContextMenuOpen };
};
