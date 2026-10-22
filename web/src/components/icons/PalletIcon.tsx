import type { ImgHTMLAttributes } from 'react';

export default function PalletIcon({
  className = 'w-4 h-4',
  alt = 'pallet',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="https://img.icons8.com/isometric/100/pallet.png"
      alt={alt}
      width={100}
      height={100}
      className={`shrink-0 object-contain select-none pointer-events-none inline-block ${className}`}
      loading="lazy"
      {...props}
    />
  );
}
