import { openUrl } from '@tauri-apps/plugin-opener';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import ExternalLink from 'lucide-react/icons/external-link';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LoadingSpinner } from '$components/LoadingSpinner';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';

interface ThirdPartyLicense {
  ecosystem: 'cargo' | 'npm';
  direct: boolean;
  name: string;
  version: string;
  license: string;
  url: string;
  licenseTextId?: string;
}

interface ThirdPartyLicensesManifest {
  entries: ThirdPartyLicense[];
  licenseTexts: Record<string, string>;
}

interface ThirdPartyLicensesModalProps {
  onClose: () => void;
}

export const ThirdPartyLicensesModal = ({ onClose }: ThirdPartyLicensesModalProps) => {
  const [manifest, setManifest] = useState<ThirdPartyLicensesManifest | null>(null);
  const [onlyDirect, setOnlyDirect] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLicense, setSelectedLicense] = useState<ThirdPartyLicense | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listScrollTopRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    fetch('/licenses.generated.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load license manifest: ${response.status}`);
        return response.json() as Promise<ThirdPartyLicensesManifest>;
      })
      .then((loadedManifest) => {
        if (isMounted) setManifest(loadedManifest);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const licenses = manifest?.entries ?? [];
  const directLicenses = useMemo(() => licenses.filter(({ direct }) => direct), [licenses]);
  const visibleLicenses = onlyDirect ? directLicenses : licenses;
  const filteredLicenses = useMemo(
    () =>
      visibleLicenses.filter(
        ({ ecosystem, name, version, license }) =>
          !normalizedQuery ||
          name.toLowerCase().includes(normalizedQuery) ||
          version.toLowerCase().includes(normalizedQuery) ||
          license.toLowerCase().includes(normalizedQuery) ||
          ecosystem.includes(normalizedQuery),
      ),
    [normalizedQuery, visibleLicenses],
  );

  const selectedLicenseText = selectedLicense?.licenseTextId
    ? manifest?.licenseTexts[selectedLicense.licenseTextId]
    : undefined;

  // the modal content element is shared between both views, and collapses to scrollTop 0
  // when the detail view replaces the list, so save and restore it across navigation
  useLayoutEffect(() => {
    if (selectedLicense || !contentRef.current) return;
    contentRef.current.scrollTop = listScrollTopRef.current;
  }, [selectedLicense]);

  const footerLeft = (
    <ModalButton
      variant="secondary"
      onClick={() => setSelectedLicense(null)}
      className={`h-9 ${selectedLicense ? '' : 'pointer-events-none invisible'}`}
      aria-hidden={!selectedLicense}
      tabIndex={selectedLicense ? undefined : -1}
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </ModalButton>
  );

  return (
    <ModalWrapper
      onClose={onClose}
      title="Third-party licenses"
      className="h-[80vh] max-h-[80vh] max-w-2xl"
      contentOverflow={selectedLicense ? 'hidden' : 'auto'}
      contentRef={contentRef}
      footerLeft={footerLeft}
      footer={<ModalButton onClick={onClose}>Close</ModalButton>}
    >
      {selectedLicense ? (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono font-semibold text-lg text-surface-900 dark:text-surface-100">
                  {selectedLicense.name}
                </h3>
                <span className="text-surface-500 text-xs dark:text-surface-400">
                  ({selectedLicense.ecosystem})
                </span>
              </div>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                v{selectedLicense.version} · {selectedLicense.license}
              </p>
            </div>
            <ModalButton
              variant="secondary"
              onClick={() => openUrl(selectedLicense.url)}
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              Open library
            </ModalButton>
          </div>

          {selectedLicenseText ? (
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-100 p-4 font-mono text-surface-700 text-xs dark:bg-surface-900 dark:text-surface-300">
              {selectedLicenseText}
            </pre>
          ) : (
            <p className="rounded-lg bg-surface-100 p-4 text-sm text-surface-600 dark:bg-surface-900 dark:text-surface-400">
              This package declares {selectedLicense.license}, but does not include the full license
              text. Open the upstream project for its license and notices.
            </p>
          )}
        </div>
      ) : !manifest ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-surface-500 dark:text-surface-400">
          <LoadingSpinner className="h-4 w-4" />
          Loading license manifest…
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-surface-500 dark:text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search dependencies..."
              aria-label="Search dependencies"
              className="w-full rounded-lg border border-transparent bg-surface-100 py-2 pr-9 pl-9 text-sm text-surface-800 transition-colors focus:border-primary-ink focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm p-0.5 text-surface-500 transition-colors hover:text-surface-600 dark:text-surface-400 dark:hover:text-surface-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
            <input
              type="checkbox"
              checked={onlyDirect}
              onChange={(event) => setOnlyDirect(event.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-primary-ink focus:ring-primary-ink dark:border-surface-600"
            />
            Show direct dependencies only
          </label>

          <div className="divide-y divide-surface-100 overflow-hidden rounded-lg border border-surface-300 dark:divide-surface-700 dark:border-surface-700">
            {filteredLicenses.length > 0 ? (
              filteredLicenses.map((license) => (
                <button
                  type="button"
                  key={`${license.ecosystem}:${license.name}:${license.version}`}
                  onClick={() => {
                    listScrollTopRef.current = contentRef.current?.scrollTop ?? 0;
                    setSelectedLicense(license);
                  }}
                  className="group flex w-full items-center gap-2 px-4 py-3 text-left outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:hover:bg-surface-700/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <p className="truncate font-mono text-sm text-surface-800 dark:text-surface-200">
                        {license.name}
                      </p>
                      <span className="shrink-0 text-surface-500 text-xs dark:text-surface-400">
                        ({license.ecosystem})
                      </span>
                    </div>
                    <p className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">
                      v{license.version} · {license.license}
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400"
                  />
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-surface-500 dark:text-surface-400">
                No dependencies match “{searchQuery}”.
              </p>
            )}
          </div>
        </>
      )}
    </ModalWrapper>
  );
};
