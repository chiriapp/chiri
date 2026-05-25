import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DismissableLayerContext,
  type DismissableLayerEntry,
  type DismissableLayerRegistration,
} from '$context/dismissableLayerContext';

const getTopEscapeLayer = (layers: DismissableLayerEntry[]) =>
  layers.reduce<DismissableLayerEntry | undefined>((topLayer, layer) => {
    if (layer.escapeBehavior === 'none') return topLayer;
    if (!topLayer) return layer;
    if (layer.priority > topLayer.priority) return layer;
    if (layer.priority === topLayer.priority && layer.order > topLayer.order) return layer;
    return topLayer;
  }, undefined);

export const DismissableLayerProvider = ({ children }: { children: ReactNode }) => {
  const [layers, setLayers] = useState<DismissableLayerEntry[]>([]);
  const layersRef = useRef<DismissableLayerEntry[]>(layers);
  const nextOrderRef = useRef(0);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const registerLayer = useCallback((layer: DismissableLayerRegistration) => {
    const order = nextOrderRef.current;
    nextOrderRef.current += 1;

    setLayers((currentLayers) => [
      ...currentLayers.filter((currentLayer) => currentLayer.id !== layer.id),
      { ...layer, order },
    ]);

    return () => {
      setLayers((currentLayers) =>
        currentLayers.filter((currentLayer) => currentLayer.id !== layer.id),
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      const topLayer = getTopEscapeLayer(layersRef.current);
      if (!topLayer) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (topLayer.escapeBehavior === 'dismiss') {
        topLayer.onEscape?.(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  const value = useMemo(() => {
    const isAnyModalOpen = layers.some(
      (layer) => layer.type === 'modal' || layer.type === 'confirm-dialog',
    );
    const isContextMenuOpen = layers.some(
      (layer) => layer.type === 'context-menu' || layer.type === 'dropdown',
    );

    return {
      isAnyModalOpen,
      isContextMenuOpen,
      registerLayer,
    };
  }, [layers, registerLayer]);

  return (
    <DismissableLayerContext.Provider value={value}>{children}</DismissableLayerContext.Provider>
  );
};
