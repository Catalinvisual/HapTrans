import type { ImgHTMLAttributes } from 'react';

export default function WeightKgIcon({
  className = 'w-4 h-4',
  alt = 'weight-kg',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="https://img.icons8.com/ios/100/weight-kg.png"
      alt={alt}
      width={100}
      height={100}
      className={`shrink-0 object-contain select-none pointer-events-none inline-block dark:invert ${className}`}
      loading="lazy"
      {...props}
    />
  );
}
