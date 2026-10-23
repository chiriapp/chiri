import { openUrl } from '@tauri-apps/plugin-opener';
import Bug from 'lucide-react/icons/bug';
import Code from 'lucide-react/icons/code';
import HandHeart from 'lucide-react/icons/hand-heart';
import Heart from 'lucide-react/icons/heart';
import HeartHandshake from 'lucide-react/icons/heart-handshake';
import Mail from 'lucide-react/icons/mail';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import ScrollText from 'lucide-react/icons/scroll-text';
import Sparkles from 'lucide-react/icons/sparkles';
import { useState } from 'react';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { ThirdPartyLicensesModal } from '$components/modals/ThirdPartyLicensesModal';
import { AboutSettingsLinkRow } from '$components/settings/AboutSettings/AboutSettingsLinkRow';
import { AboutSettingsSection } from '$components/settings/AboutSettings/AboutSettingsSection';
import { useChangelog } from '$hooks/useChangelog';
import { getAppInfo } from '$utils/meta';

const GITHUB_URL = 'https://github.com/chiriapp/chiri';
const NEW_ISSUE_URL = 'https://github.com/chiriapp/chiri/issues/new';
const CONTACT_EMAIL = 'contact@sapphic.moe';

const link = (url: string) => () => openUrl(url);

interface AboutSettingsProps {
  onNavigateToUpdates?: () => void;
}

export const AboutSettings = ({ onNavigateToUpdates }: AboutSettingsProps) => {
  const [showThirdPartyLicenses, setShowThirdPartyLicenses] = useState(false);
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
            <p className="mt-2 max-w-xs text-surface-500 text-xs dark:text-surface-400">
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

        <AboutSettingsSection title="Donate">
          <AboutSettingsLinkRow
            icon={<HandHeart className="h-5 w-5" />}
            label="Liberapay"
            description="liberapay.com/chloe"
            onClick={link('https://liberapay.com/chloe')}
          />
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
        </AboutSettingsSection>

        <AboutSettingsSection title="Open Source">
          <AboutSettingsLinkRow
            icon={<Code className="h-5 w-5" />}
            label="Source code"
            description="Licensed under the zlib/libpng license"
            onClick={link(GITHUB_URL)}
          />
          <AboutSettingsLinkRow
            icon={<ScrollText className="h-5 w-5" />}
            label="Third-party licenses"
            description="View licenses for dependencies shipped with Chiri"
            variant="internal"
            onClick={() => setShowThirdPartyLicenses(true)}
          />
        </AboutSettingsSection>

        <AboutSettingsSection title="Credits">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0 text-surface-500 dark:text-surface-400">
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
            <span className="shrink-0 text-surface-500 dark:text-surface-400">
              <HeartHandshake className="h-5 w-5 text-[#25CCFF]" />
            </span>
            <p className="text-sm text-surface-800 dark:text-surface-200">
              Special thanks to the{' '}
              <button
                type="button"
                onClick={link('https://signpath.org/')}
                className="font-medium outline-hidden hover:underline focus-visible:underline"
              >
                SignPath Foundation
              </button>{' '}
              for Windows code signing
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0 text-surface-500 dark:text-surface-400">
              <Heart className="h-5 w-5 text-[#FF218C]" />
            </span>
            <p className="text-sm text-surface-800 dark:text-surface-200">
              Special thanks to{' '}
              <button
                type="button"
                onClick={link('https://wamwoowam.co.uk')}
                className="font-medium outline-hidden hover:underline focus-visible:underline"
              >
                WamWooWam
              </button>{' '}
              for macOS code signing and notarization
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0 text-surface-500 dark:text-surface-400">
              <Heart className="h-5 w-5 text-[#F5C2E7]" />
            </span>
            <p className="text-sm text-surface-800 dark:text-surface-200">
              Chiri is made with love by{' '}
              <button
                type="button"
                onClick={link('https://sapphic.moe')}
                className="font-medium outline-hidden hover:underline focus-visible:underline"
              >
                {author}
              </button>
            </p>
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

      {showThirdPartyLicenses && (
        <ThirdPartyLicensesModal onClose={() => setShowThirdPartyLicenses(false)} />
      )}
    </>
  );
};
