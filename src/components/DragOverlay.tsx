interface DragOverlayProps {
  isUnsupportedFile: boolean;
}

export const DragOverlay = ({ isUnsupportedFile }: DragOverlayProps) => {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-80 flex items-center justify-center backdrop-blur-xs ${
        isUnsupportedFile ? 'bg-semantic-error/10' : 'bg-primary-500/10'
      }`}
    >
      <div
        className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg border ${
          isUnsupportedFile
            ? 'bg-surface-100/90 dark:bg-surface-800/90 text-semantic-error border-semantic-error/30'
            : 'bg-white/90 dark:bg-surface-800/90 text-surface-800 dark:text-surface-200 border-primary-500/30'
        }`}
      >
        {isUnsupportedFile
          ? 'Unsupported file format. Only .ics, .json, and .mobileconfig files are supported.'
          : 'Drop .ics or .json files to import tasks, or .mobileconfig to add an account'}
      </div>
    </div>
  );
};
