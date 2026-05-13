import { openUrl } from '@tauri-apps/plugin-opener';
import Bug from 'lucide-react/icons/bug';
import Code from 'lucide-react/icons/code';
import Coffee from 'lucide-react/icons/coffee';
import ExternalLink from 'lucide-react/icons/external-link';
import Globe from 'lucide-react/icons/globe';
import Heart from 'lucide-react/icons/heart';
import Mail from 'lucide-react/icons/mail';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import ScrollText from 'lucide-react/icons/scroll-text';
import Sparkles from 'lucide-react/icons/sparkles';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { AboutSettingsLinkRow } from '$components/settings/AboutSettings/AboutSettingsLinkRow';
import { AboutSettingsSection } from '$components/settings/AboutSettings/AboutSettingsSection';
import { useChangelog } from '$hooks/useChangelog';
import { getAppInfo } from '$utils/version';

const GITHUB_URL = 'https://github.com/SapphoSys/chiri';
const NEW_ISSUE_URL = 'https://github.com/SapphoSys/chiri/issues/new';
const CONTACT_EMAIL = 'contact@sapphic.moe';
const FIND_US_ELSEWHERE = 'https://sapphic.moe/contact';

const link = (url: string) => () => openUrl(url);

const LIBRARIES: { name: string; url: string }[] = [
  { name: 'React', url: 'https://react.dev' },
  { name: 'Tauri', url: 'https://tauri.app' },
  { name: 'TanStack Query', url: 'https://tanstack.com/query' },
  { name: 'date-fns', url: 'https://date-fns.org' },
  { name: 'Lucide', url: 'https://lucide.dev' },
  { name: 'dnd-kit', url: 'https://dndkit.com' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com' },
  { name: 'sonner', url: 'https://sonner.emilkowal.ski' },
  { name: 'frimousse', url: 'https://www.npmjs.com/package/frimousse' },
];

interface AboutSettingsProps {
  onNavigateToUpdates?: () => void;
}

export const AboutSettings = ({ onNavigateToUpdates }: AboutSettingsProps) => {
  const { version, name, description, author } = getAppInfo();
  const {
    openChangelog,
    closeChangelog,
    isLoading: isFetchingChangelog,
    changelogData,
  } = useChangelog();

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 py-4">
          <img
            src="/icon.png"
            alt={name}
            className="w-16 h-16 rounded-2xl shadow-md select-none"
            draggable={false}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-200 mb-1">
              {name}
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">Version {version}</p>
            <p className="text-xs text-surface-400 dark:text-surface-500 mt-2 max-w-xs">
              {description}
            </p>
          </div>
        </div>

        <AboutSettingsSection title="Updates">
          <AboutSettingsLinkRow
            icon={<ScrollText className="w-5 h-5" />}
            label="What's New"
            description={`See what changed in v${version}`}
            variant="internal"
            loading={isFetchingChangelog}
            onClick={() => openChangelog(version)}
          />
          {onNavigateToUpdates && (
            <AboutSettingsLinkRow
              icon={<RefreshCw className="w-5 h-5" />}
              label="Check for updates"
              description="See if a newer version is available"
              variant="internal"
              onClick={onNavigateToUpdates}
            />
          )}
        </AboutSettingsSection>

        <AboutSettingsSection title="Support">
          <AboutSettingsLinkRow
            icon={<Bug className="w-5 h-5" />}
            label="Report a bug"
            description="Open a new issue on GitHub"
            onClick={link(NEW_ISSUE_URL)}
          />

          <AboutSettingsLinkRow
            icon={<Mail className="w-5 h-5" />}
            label="Contact developer"
            description={CONTACT_EMAIL}
            onClick={link(`mailto:${CONTACT_EMAIL}`)}
          />

          <AboutSettingsLinkRow
            icon={<Globe className="w-5 h-5" />}
            label="Find us elsewhere"
            description="Follow or contact us elsewhere through our website"
            onClick={link(FIND_US_ELSEWHERE)}
          />
        </AboutSettingsSection>

        <AboutSettingsSection title="Donate">
          <AboutSettingsLinkRow
            icon={<Coffee className="w-5 h-5" />}
            label="Ko-fi"
            description="ko-fi.com/solelychloe"
            onClick={link('https://ko-fi.com/solelychloe')}
          />

          <AboutSettingsLinkRow
            icon={<Heart className="w-5 h-5" />}
            label="Liberapay"
            description="liberapay.com/chloe"
            onClick={link('https://liberapay.com/chloe')}
          />
        </AboutSettingsSection>

        <AboutSettingsSection title="Open Source">
          <AboutSettingsLinkRow
            icon={<Code className="w-5 h-5" />}
            label="Source code"
            description="Licensed under the zlib/libpng license"
            onClick={link(GITHUB_URL)}
          />
        </AboutSettingsSection>

        <AboutSettingsSection title="Credits">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-surface-400 dark:text-surface-500 shrink-0">
              <Sparkles className="text-[#2196F2] w-5 h-5" />
            </span>
            <p className="text-sm text-surface-800 dark:text-surface-200">
              Special thanks to{' '}
              <button
                type="button"
                onClick={link('https://github.com/abaker')}
                className="font-medium hover:underline outline-hidden focus-visible:underline"
              >
                Alex Baker
              </button>{' '}
              for {''}
              <button
                type="button"
                onClick={link('https://tasks.org')}
                className="font-medium hover:underline outline-hidden focus-visible:underline"
              >
                Tasks.org
              </button>
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-surface-400 dark:text-surface-500 shrink-0">
              <Heart className="text-[#F5C2E7] w-5 h-5" />
            </span>
            <p className="text-sm text-surface-800 dark:text-surface-200">
              Made with love by{' '}
              <button
                type="button"
                onClick={link('https://sapphic.moe')}
                className="font-medium hover:underline outline-hidden focus-visible:underline"
              >
                {author}
              </button>
            </p>
          </div>

          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-surface-500 dark:text-surface-400">Built with</p>
            <div className="flex flex-wrap gap-1.5">
              {LIBRARIES.map(({ name: libName, url }) => (
                <button
                  key={libName}
                  type="button"
                  onClick={link(url)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-300 rounded-md transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {libName}
                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </AboutSettingsSection>
      </div>

      {changelogData && (
        <ChangelogModal
          version={changelogData.version}
          changelog={changelogData.body}
          onClose={closeChangelog}
        />
      )}
    </>
  );
};
