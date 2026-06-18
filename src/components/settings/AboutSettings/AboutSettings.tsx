import { openUrl } from '@tauri-apps/plugin-opener';
import Bug from 'lucide-react/icons/bug';
import CircleDollarSign from 'lucide-react/icons/circle-dollar-sign';
import Code from 'lucide-react/icons/code';
import ExternalLink from 'lucide-react/icons/external-link';
import Globe from 'lucide-react/icons/globe';
import HandHeart from 'lucide-react/icons/hand-heart';
import Heart from 'lucide-react/icons/heart';
import HeartHandshake from 'lucide-react/icons/heart-handshake';
import Mail from 'lucide-react/icons/mail';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import ScrollText from 'lucide-react/icons/scroll-text';
import Sparkles from 'lucide-react/icons/sparkles';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { AboutSettingsLinkRow } from '$components/settings/AboutSettings/AboutSettingsLinkRow';
import { AboutSettingsSection } from '$components/settings/AboutSettings/AboutSettingsSection';
import { useChangelog } from '$hooks/useChangelog';
import { getAppInfo } from '$utils/version';

const GITHUB_URL = 'https://github.com/chiriapp/chiri';
const NEW_ISSUE_URL = 'https://github.com/chiriapp/chiri/issues/new';
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
            className="h-16 w-16 select-none rounded-2xl shadow-md"
            draggable={false}
          />
          <div className="text-center">
            <h1 className="mb-1 font-bold text-2xl text-surface-800 dark:text-surface-200">
              {name}
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">Version {version}</p>
            <p className="mt-2 max-w-xs text-surface-400 text-xs dark:text-surface-500">
              {description}
            </p>
          </div>
        </div>

        <AboutSettingsSection title="Updates">
          <AboutSettingsLinkRow
            icon={<ScrollText className="h-5 w-5" />}
            label="What's New"
            description={`See what changed in v${version}`}
            variant="internal"
            loading={isFetchingChangelog}
            onClick={() => openChangelog(version)}
          />
          {onNavigateToUpdates && (
            <AboutSettingsLinkRow
              icon={<RefreshCw className="h-5 w-5" />}
              label="Check for updates"
              description="See if a newer version is available"
              variant="internal"
              onClick={onNavigateToUpdates}
            />
          )}
        </AboutSettingsSection>

        <AboutSettingsSection title="Support">
          <AboutSettingsLinkRow
            icon={<Bug className="h-5 w-5" />}
            label="Report a bug"
            description="Open a new issue on GitHub"
            onClick={link(NEW_ISSUE_URL)}
          />

          <AboutSettingsLinkRow
            icon={<Mail className="h-5 w-5" />}
            label="Contact developer"
            description={CONTACT_EMAIL}
            onClick={link(`mailto:${CONTACT_EMAIL}`)}
          />

          <AboutSettingsLinkRow
            icon={<Globe className="h-5 w-5" />}
            label="Find us elsewhere"
            description="Follow or contact us elsewhere through our website"
            onClick={link(FIND_US_ELSEWHERE)}
          />
        </AboutSettingsSection>

        <AboutSettingsSection title="Donate">
          <AboutSettingsLinkRow
            icon={<HeartHandshake className="h-5 w-5" />}
            label="GitHub Sponsors"
            description="github.com/sponsors/chiriapp"
            onClick={link('https://github.com/sponsors/chiriapp')}
          />

          <AboutSettingsLinkRow
            icon={<HandHeart className="h-5 w-5" />}
            label="Liberapay"
            description="liberapay.com/chloe"
            onClick={link('https://liberapay.com/chloe')}
          />

          <AboutSettingsLinkRow
            icon={<CircleDollarSign className="h-5 w-5" />}
            label="Open Collective"
            description="opencollective.com/chiri"
            onClick={link('https://opencollective.com/chiri')}
          />

          <AboutSettingsLinkRow
            icon={<Heart className="h-5 w-5" />}
            label="Patreon"
            description="patreon.com/c/chiriapp"
            onClick={link('https://www.patreon.com/c/chiriapp')}
          />
        </AboutSettingsSection>

        <AboutSettingsSection title="Open Source">
          <AboutSettingsLinkRow
            icon={<Code className="h-5 w-5" />}
            label="Source code"
            description="Licensed under the zlib/libpng license"
            onClick={link(GITHUB_URL)}
          />
        </AboutSettingsSection>

        <AboutSettingsSection title="Credits">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0 text-surface-400 dark:text-surface-500">
              <Sparkles className="h-5 w-5 text-[#2196F2]" />
            </span>
            <p className="text-sm text-surface-800 dark:text-surface-200">
              Special thanks to{' '}
              <button
                type="button"
                onClick={link('https://github.com/abaker')}
                className="font-medium outline-hidden hover:underline focus-visible:underline"
              >
                Alex Baker
              </button>{' '}
              for {''}
              <button
                type="button"
                onClick={link('https://tasks.org')}
                className="font-medium outline-hidden hover:underline focus-visible:underline"
              >
                Tasks.org
              </button>
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0 text-surface-400 dark:text-surface-500">
              <Heart className="h-5 w-5 text-[#F5C2E7]" />
            </span>
            <p className="text-sm text-surface-800 dark:text-surface-200">
              Made with love by{' '}
              <button
                type="button"
                onClick={link('https://sapphic.moe')}
                className="font-medium outline-hidden hover:underline focus-visible:underline"
              >
                {author}
              </button>
            </p>
          </div>

          <div className="space-y-2 px-4 py-3">
            <p className="text-surface-500 text-xs dark:text-surface-400">Built with</p>
            <div className="flex flex-wrap gap-1.5">
              {LIBRARIES.map(({ name: libName, url }) => (
                <button
                  key={libName}
                  type="button"
                  onClick={link(url)}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-100 px-2 py-1 text-surface-600 text-xs outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
                >
                  {libName}
                  <ExternalLink className="h-2.5 w-2.5 opacity-50" />
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
          date={changelogData.date}
          onClose={closeChangelog}
        />
      )}
    </>
  );
};
