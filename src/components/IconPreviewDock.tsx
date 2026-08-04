import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, MessageSquareQuote, Sparkles, Target, ThumbsUp } from '../icons/koboyo';
import type { LucideIcon } from 'lucide-react';
import type { UIStrings } from '../lib/languages';
import type { ActiveIconAssets, IconAssetRecord, IconSlot } from '../lib/iconAssets';
import type { UiPreferencesV1 } from '../lib/uiPreferences';
import CustomIcon from './CustomIcon';

interface Props {
  settings: UiPreferencesV1;
  records: IconAssetRecord[];
  strings: UIStrings;
}

interface PreviewItem {
  slot: IconSlot;
  label: string;
  fallback: LucideIcon;
}

export default function IconPreviewDock({ settings, records, strings }: Props) {
  const [assets, setAssets] = useState<ActiveIconAssets>({});
  const profileName = settings.iconProfiles.find(
    profile => profile.id === settings.activeIconProfileId,
  )?.name;

  useEffect(() => {
    const urls: string[] = [];
    const next: ActiveIconAssets = {};
    for (const record of records) {
      if (record.profileId !== settings.activeIconProfileId) continue;
      const url = URL.createObjectURL(record.blob);
      urls.push(url);
      next[record.slot] = {
        url,
        fit: record.fit,
        zoom: record.zoom,
        offsetX: record.offsetX,
        offsetY: record.offsetY,
      };
    }
    setAssets(next);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [records, settings.activeIconProfileId]);

  const modes: PreviewItem[] = [
    { slot: 'vocab', label: strings.modeVocab, fallback: BookOpen },
    { slot: 'phrase', label: strings.modePhrase, fallback: MessageSquareQuote },
  ];
  const stats: PreviewItem[] = [
    { slot: 'practiced', label: strings.todayPracticed, fallback: Target },
    { slot: 'hard', label: strings.hard, fallback: AlertTriangle },
    { slot: 'good', label: strings.good, fallback: ThumbsUp },
    { slot: 'easy', label: strings.easy, fallback: Sparkles },
  ];

  const renderIcon = ({ slot, label, fallback }: PreviewItem) => (
    <div className="icon-dock-item" data-testid={`icon-dock-${slot}`} key={slot}>
      <CustomIcon
        asset={assets[slot]}
        fallback={fallback}
        className="icon-dock-item__icon"
        fallbackClassName="icon-dock-item__fallback"
      />
      <span>{label}</span>
    </div>
  );

  return (
    <section className="icon-preview-dock" data-testid="icon-preview-dock" aria-label={profileName}>
      <div className="icon-preview-dock__modes">{modes.map(renderIcon)}</div>
      <div className="icon-preview-dock__stats">{stats.map(renderIcon)}</div>
    </section>
  );
}
