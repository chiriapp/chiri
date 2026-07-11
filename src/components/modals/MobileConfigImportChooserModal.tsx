import CalendarDays from 'lucide-react/icons/calendar-days';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { MobileConfigSignatureWarning } from '$components/modals/MobileConfigSignatureWarning';
import type { MobileConfigCalDAVSettings, MobileConfigImportProfile } from '$types/mobileconfig';

interface MobileConfigImportChooserModalProps {
  profile: MobileConfigImportProfile;
  onSelect: (settings: MobileConfigCalDAVSettings) => void;
  onClose: () => void;
}

const getCandidateTitle = (candidate: MobileConfigCalDAVSettings, index: number) =>
  candidate.accountName?.trim() || candidate.username?.trim() || `CalDAV Account ${index + 1}`;

const getCandidateKey = (candidate: MobileConfigCalDAVSettings) =>
  candidate.payloadUuid ??
  candidate.payloadIdentifier ??
  [
    candidate.accountName,
    candidate.serverUrl,
    candidate.username,
    candidate.principalUrl,
    candidate.password,
  ]
    .map((value) => value ?? '')
    .join('\u001f');

export const MobileConfigImportChooserModal = ({
  profile,
  onSelect,
  onClose,
}: MobileConfigImportChooserModalProps) => (
  <ModalWrapper
    onClose={onClose}
    title="Choose CalDAV Account"
    description="This configuration profile contains more than one CalDAV account."
    size="md"
    footer={
      <ModalButton variant="ghost" onClick={onClose}>
        Cancel
      </ModalButton>
    }
  >
    <MobileConfigSignatureWarning signature={profile.signature} />

    <div className="space-y-3">
      {profile.candidates.map((candidate, index) => (
        <button
          key={getCandidateKey(candidate)}
          type="button"
          onClick={() => onSelect(candidate)}
          className="group flex w-full items-start gap-3 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-left outline-none transition-colors hover:border-surface-300 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700/50 dark:hover:border-surface-500 dark:hover:bg-surface-700"
        >
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-300">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-surface-800 dark:text-surface-200">
              {getCandidateTitle(candidate, index)}
            </div>
            <div className="mt-1 space-y-0.5 text-surface-500 text-xs dark:text-surface-400">
              <p className="truncate">{candidate.serverUrl}</p>
              {candidate.username && <p className="truncate">{candidate.username}</p>}
            </div>
          </div>
        </button>
      ))}
    </div>
  </ModalWrapper>
);
