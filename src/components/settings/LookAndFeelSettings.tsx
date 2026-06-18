import AlignJustify from 'lucide-react/icons/align-justify';
import LayoutList from 'lucide-react/icons/layout-list';
import type { ReactNode } from 'react';
import { ColorSchemeSelect } from '$components/ColorSchemeSelect';
import { ColorSwatchPicker } from '$components/ColorSwatchPicker';
import { TaskListDensityPreview } from '$components/settings/TaskListDensityPreview';
import { useSettingsStore } from '$context/settingsContext';
import type { TaskListDensity } from '$types/settings';
import {
  getAppearanceColorState,
  getColorSchemeSelection,
  shouldResetAccentForFlavor,
  THEME_OPTIONS,
} from '$utils/color/scheme';

const DENSITY_OPTIONS: { value: TaskListDensity; label: string; icon: ReactNode }[] = [
  { value: 'comfortable', label: 'Comfortable', icon: <LayoutList className="h-4 w-4" /> },
  { value: 'compact', label: 'Compact', icon: <AlignJustify className="h-4 w-4" /> },
];

const SWITCHER_CLASS =
  'flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
const SWITCHER_ACTIVE =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';
const SWITCHER_INACTIVE =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

export const LookAndFeelSettings = () => {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    colorScheme,
    colorSchemeFlavor,
    setColorScheme,
    setColorSchemeFlavor,
    useAccentColorForCheckboxes,
    setUseAccentColorForCheckboxes,
    showCursorPointers,
    setShowCursorPointers,
    taskListDensity,
    setTaskListDensity,
  } = useSettingsStore();

  const {
    effectiveMode,
    activeScheme,
    availableFlavors,
    activeFlavor,
    resolvedAccentColor,
    schemeOptions,
    flavorOptions,
    accentOptions,
  } = getAppearanceColorState({ theme, accentColor, colorScheme, colorSchemeFlavor });

  const handleSchemeChange = (schemeId: string) => {
    const selection = getColorSchemeSelection(schemeId, effectiveMode);
    if (!selection) return;

    if (selection.theme) {
      setTheme(selection.theme);
    }

    setColorScheme(selection.colorScheme, selection.colorSchemeFlavor, selection.accentColor);
  };

  const handleFlavorChange = (flavorId: string) => {
    const flavor = activeScheme.flavors.find((f) => f.id === flavorId);
    if (!flavor) return;

    setColorSchemeFlavor(flavorId);

    if (shouldResetAccentForFlavor(accentColor, flavor)) {
      setAccentColor(flavor.defaultAccent);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Look & feel
      </h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">Theme</p>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`${SWITCHER_CLASS} ${theme === option.value ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Color scheme
          </p>
          <ColorSchemeSelect
            label="Color scheme"
            value={colorScheme}
            options={schemeOptions}
            onChange={handleSchemeChange}
          />

          {availableFlavors.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
                Flavor
              </p>
              <ColorSchemeSelect
                label="Flavor"
                value={activeFlavor.id}
                options={flavorOptions}
                onChange={handleFlavorChange}
              />
            </div>
          )}
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Accent color
          </p>

          <ColorSwatchPicker
            options={accentOptions}
            value={accentColor}
            colorInputValue={resolvedAccentColor}
            onSelect={setAccentColor}
            onCustomChange={setAccentColor}
            selectedVariant="border"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Task list density
          </p>
          <div className="flex gap-2">
            {DENSITY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setTaskListDensity(option.value)}
                className={`${SWITCHER_CLASS} ${taskListDensity === option.value ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
          <TaskListDensityPreview density={taskListDensity} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Use accent color for completed checkboxes
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Completed tasks use your selected accent
            </p>
          </div>
          <input
            type="checkbox"
            checked={useAccentColorForCheckboxes}
            onChange={(e) => setUseAccentColorForCheckboxes(e.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Show pointer cursor on interactive controls
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Buttons, links, menus, and toggles use the hand cursor
            </p>
          </div>
          <input
            type="checkbox"
            checked={showCursorPointers}
            onChange={(e) => setShowCursorPointers(e.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>
      </div>
    </div>
  );
};
