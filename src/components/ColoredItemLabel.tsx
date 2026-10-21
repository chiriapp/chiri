import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';

interface ColoredItemLabelProps {
  name: string;
  icon?: string;
  emoji?: string;
  color?: string;
  defaultIcon: string;
  useAccentColor?: boolean;
}

export const ColoredItemLabel = ({
  name,
  icon,
  emoji,
  color,
  defaultIcon,
  useAccentColor = true,
}: ColoredItemLabelProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const itemColor = useAccentColor
    ? color
      ? resolveAccent(color)
      : resolvedAccentColor
    : undefined;
  const ItemIcon = getIconByName(icon ?? defaultIcon);

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 align-middle">
      {emoji ? (
        <span
          className="shrink-0 text-xs leading-none"
          style={itemColor ? { color: itemColor } : undefined}
          aria-hidden="true"
        >
          {emoji}
        </span>
      ) : (
        <ItemIcon
          className="h-4 w-4 shrink-0"
          style={itemColor ? { color: itemColor } : undefined}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
};
