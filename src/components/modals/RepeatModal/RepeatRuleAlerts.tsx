import AlertTriangle from 'lucide-react/icons/triangle-alert';

interface RepeatRuleAlertsProps {
  preservedKeys: string[];
  invalidParts: string[];
  validationError: string | null;
}

export const RepeatRuleAlerts = ({
  preservedKeys,
  invalidParts,
  validationError,
}: RepeatRuleAlertsProps) => (
  <>
    {preservedKeys.length > 0 && (
      <div className="flex items-start gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-semantic-warning" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-semantic-warning">Preserved recurrence options</p>
          <p className="text-xs">
            Chiri will keep {preservedKeys.join(', ')} unchanged. Interval and ending options can
            still be edited safely.
          </p>
        </div>
      </div>
    )}
    {invalidParts.length > 0 && (
      <div className="flex items-start gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-semantic-error" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-semantic-error">Unsafe imported recurrence</p>
          <p className="text-xs">
            Chiri cannot safely edit {invalidParts.join(', ')}. The original rule will remain
            unchanged unless it is cleared.
          </p>
        </div>
      </div>
    )}
    {validationError && (
      <p role="alert" className="text-semantic-error text-xs">
        {validationError}
      </p>
    )}
  </>
);
