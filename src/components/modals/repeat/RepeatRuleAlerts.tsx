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
      <div className="rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2.5 text-xs">
        <p className="font-medium text-semantic-warning">Preserved recurrence options</p>
        <p className="mt-1 text-surface-600 dark:text-surface-300">
          Chiri will keep {preservedKeys.join(', ')} unchanged. Interval and ending options can
          still be edited safely.
        </p>
      </div>
    )}
    {invalidParts.length > 0 && (
      <div className="rounded-lg border border-semantic-error/30 bg-semantic-error/10 px-3 py-2.5 text-xs">
        <p className="font-medium text-semantic-error">Unsafe imported recurrence</p>
        <p className="mt-1 text-surface-600 dark:text-surface-300">
          Chiri cannot safely edit {invalidParts.join(', ')}. The original rule will remain
          unchanged unless it is cleared.
        </p>
      </div>
    )}
    {validationError && (
      <p role="alert" className="text-semantic-error text-xs">
        {validationError}
      </p>
    )}
  </>
);
