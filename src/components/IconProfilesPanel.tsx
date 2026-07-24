import IconImageEditor from './IconImageEditor';
import {
  ICON_SLOTS,
  type IconAssetRecord,
  type IconSlot,
} from '../lib/iconAssets';
import {
  renameIconProfile,
  selectIconProfile,
  type UiPreferencesV1,
} from '../lib/uiPreferences';
import type { UIStrings } from '../lib/languages';
import type { PersonalizationStrings } from '../lib/personalizationStrings';

interface Props {
  settings: UiPreferencesV1;
  records: IconAssetRecord[];
  strings: UIStrings;
  copy: PersonalizationStrings;
  onSettingsChange: (settings: UiPreferencesV1) => void;
  onRecordsChange: (records: IconAssetRecord[]) => void;
}

export default function IconProfilesPanel({
  settings,
  records,
  strings,
  copy,
  onSettingsChange,
  onRecordsChange,
}: Props) {
  const activeProfile = settings.iconProfiles.find(profile => profile.id === settings.activeIconProfileId)!;
  const slotLabels: Record<IconSlot, string> = {
    vocab: strings.modeVocab,
    phrase: strings.modePhrase,
    practiced: strings.todayPracticed,
    hard: strings.hard,
    good: strings.good,
    easy: strings.easy,
  };

  const recordFor = (slot: IconSlot) => records.find(record => (
    record.profileId === settings.activeIconProfileId && record.slot === slot
  ));

  return (
    <section aria-labelledby="icon-profiles-heading" className="settings-section">
      <h3 id="icon-profiles-heading" className="text-sm font-bold mb-3">{copy.iconProfiles}</h3>
      <div className="icon-profile-tabs" role="group" aria-label={copy.iconProfiles}>
        {settings.iconProfiles.map(profile => (
          <button
            key={profile.id}
            type="button"
            data-testid={`icon-profile-${profile.id.slice(-1)}`}
            aria-pressed={settings.activeIconProfileId === profile.id}
            className="icon-profile-button"
            onClick={() => onSettingsChange(selectIconProfile(settings, profile.id))}
          >
            {profile.name}
          </button>
        ))}
      </div>

      <label className="block text-sm font-semibold mt-4 mb-2" htmlFor="icon-profile-name">{copy.profileName}</label>
      <input
        id="icon-profile-name"
        data-testid="icon-profile-name"
        className="input"
        maxLength={24}
        value={activeProfile.name}
        onChange={event => onSettingsChange(renameIconProfile(settings, activeProfile.id, event.target.value))}
      />

      <div className="icon-editor-grid mt-5">
        {ICON_SLOTS.map(slot => (
          <IconImageEditor
            key={`${settings.activeIconProfileId}:${slot}`}
            profileId={settings.activeIconProfileId}
            slot={slot}
            label={slotLabels[slot]}
            record={recordFor(slot)}
            copy={copy}
            onChange={next => onRecordsChange([
              ...records.filter(record => record.id !== next.id),
              next,
            ])}
            onRemove={() => onRecordsChange(records.filter(record => (
              record.id !== `${settings.activeIconProfileId}:${slot}`
            )))}
          />
        ))}
      </div>
    </section>
  );
}

