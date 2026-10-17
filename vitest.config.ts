import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node 25+ exposes an unconfigured localStorage that shadows jsdom's implementation
    execArgv: ['--no-experimental-webstorage'],
    setupFiles: ['./src/tests/setup.ts'],
    // split into two projects so tests run in the lightest environment they need
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/tests/**/*.test.ts'],
          exclude: [
            'src/tests/lib/tauri-http.test.ts',
            'src/tests/components/TaskDefaultsSettings.test.tsx',
            'src/tests/components/TaskLayoutSettings.test.tsx',
            'src/tests/components/RepeatModal.test.tsx',
            'src/tests/components/TaskEditorRepeat.test.tsx',
            'src/tests/components/TaskItemRepeatBadge.test.tsx',
            'src/tests/components/SidebarOverlays.test.tsx',
            'src/tests/hooks/system/useNotifications.test.ts',
            'src/tests/hooks/system/useFileDrop.test.ts',
            'src/tests/hooks/ui/useContextMenu.test.ts',
            'src/tests/hooks/ui/useInitialFocusRef.test.ts',
            'src/tests/hooks/ui/usePreserveScrollOnWindowFocus.test.ts',
            'src/tests/utils/color.test.ts',
            'src/tests/hooks/deletion/useTaskDeletion.test.ts',
            'src/tests/integration/**',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: [
            'src/tests/lib/tauri-http.test.ts',
            'src/tests/components/GlobalDragRegion.test.tsx',
            'src/tests/components/MobileConfigImportChooserModal.test.tsx',
            'src/tests/components/MobileConfigImportSkippedWarning.test.tsx',
            'src/tests/components/MobileConfigSignatureWarning.test.tsx',
            'src/tests/components/ToastTitle.test.tsx',
            'src/tests/components/TaskDefaultsSettings.test.tsx',
            'src/tests/components/SyncSettings.test.tsx',
            'src/tests/components/TaskLayoutSettings.test.tsx',
            'src/tests/components/ModalWrapper.test.tsx',
            'src/tests/components/Tooltip.test.tsx',
            'src/tests/components/RepeatModal.test.tsx',
            'src/tests/components/TaskEditorRepeat.test.tsx',
            'src/tests/components/TaskEditorCalendar.test.tsx',
            'src/tests/components/TaskEditorDescription.test.tsx',
            'src/tests/components/TaskEditorSubtaskItem.test.tsx',
            'src/tests/components/TaskEditorSubtasks.test.tsx',
            'src/tests/components/TaskItemBadge.test.tsx',
            'src/tests/components/TaskItemBadges.test.tsx',
            'src/tests/components/TaskItemRepeatBadge.test.tsx',
            'src/tests/components/TaskList.test.tsx',
            'src/tests/hooks/system/useNotifications.test.ts',
            'src/tests/hooks/system/useFileDrop.test.ts',
            'src/tests/hooks/ui/useContextMenu.test.ts',
            'src/tests/hooks/ui/useTaskListSelection.test.tsx',
            'src/tests/hooks/ui/useTaskBatchActions.test.tsx',
            'src/tests/hooks/useSidebarModals.test.tsx',
            'src/tests/hooks/useSidebarActions.test.tsx',
            'src/tests/hooks/useAccountConnectionTestRunner.test.tsx',
            'src/tests/hooks/ui/useDateTimePickerDraft.test.tsx',
            'src/tests/components/DateTimePickerModals.test.tsx',
            'src/tests/components/AccountModal.test.tsx',
            'src/tests/components/ImportModal.test.tsx',
            'src/tests/components/TaskBatchActionsBar.test.tsx',
            'src/tests/components/TaskItemContextMenu.test.tsx',
            'src/tests/components/HeaderViewMenu.test.tsx',
            'src/tests/hooks/ui/useTaskEditorActions.test.tsx',
            'src/tests/lib/toastManager.test.tsx',
            'src/tests/hooks/ui/useInitialFocusRef.test.ts',
            'src/tests/hooks/ui/usePreserveScrollOnWindowFocus.test.ts',
            'src/tests/utils/color.test.ts',
            'src/tests/hooks/deletion/useTaskDeletion.test.ts',
          ],
        },
      },
      // integration project: runs against a real CalDAV server when
      // CHIRI_TEST_CALDAV_* env vars are set. excluded from the default
      // `pnpm test` run via `--project` filtering in the script
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/tests/integration/**/*.test.ts'],
          setupFiles: ['./src/tests/setup.ts', './src/tests/integration/setup-integration.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, './src'),
      $components: resolve(import.meta.dirname, './src/components'),
      $context: resolve(import.meta.dirname, './src/context'),
      $constants: resolve(import.meta.dirname, './src/constants'),
      $hooks: resolve(import.meta.dirname, './src/hooks'),
      $lib: resolve(import.meta.dirname, './src/lib'),
      $providers: resolve(import.meta.dirname, './src/providers'),
      $styles: resolve(import.meta.dirname, './src/styles'),
      $types: resolve(import.meta.dirname, './src/types'),
      $utils: resolve(import.meta.dirname, './src/utils'),
      'lucide-react/icons': resolve(
        import.meta.dirname,
        './node_modules/lucide-react/dist/esm/icons',
      ),
    },
  },
});
