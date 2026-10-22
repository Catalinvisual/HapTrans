import type { ImgHTMLAttributes } from 'react';

export default function PalletIcon({
  className = '',
  alt = 'pallet',
  size = 18,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { size?: number }) {
  return (
    <img
      src="https://img.icons8.com/isometric/100/pallet.png"
      alt={alt}
      width={size}
      height={size}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
      className={`shrink-0 select-none pointer-events-none inline-block ${className}`}
      loading="lazy"
      {...props}
    />
  );
}
