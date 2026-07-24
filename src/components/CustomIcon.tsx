import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { IconAssetView } from '../lib/iconAssets';

interface Props {
  asset?: IconAssetView;
  fallback: LucideIcon;
  className?: string;
  fallbackClassName?: string;
  style?: CSSProperties;
}

export default function CustomIcon({ asset, fallback: Fallback, className = '', fallbackClassName = '', style }: Props) {
  return (
    <span className={`custom-icon ${className}`} data-testid="custom-icon" aria-hidden="true" style={style}>
      {asset ? (
        <img
          src={asset.url}
          alt=""
          className="custom-icon__image"
          style={{
            objectFit: asset.fit,
            transform: `translate(${asset.offsetX}%, ${asset.offsetY}%) scale(${asset.zoom})`,
          }}
        />
      ) : (
        <Fallback className={fallbackClassName} />
      )}
    </span>
  );
}
