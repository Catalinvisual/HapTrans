import type { ImgHTMLAttributes } from 'react';

export default function ImportIcon({
  className = 'w-5 h-5',
  alt = 'import',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="https://img.icons8.com/isometric/100/import.png"
      alt={alt}
      width={100}
      height={100}
      className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
      loading="lazy"
      {...props}
    />
  );
}
