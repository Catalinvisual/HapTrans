import type { ImgHTMLAttributes } from 'react';

export default function WeightKgIcon({
  className = '',
  alt = 'weight-kg',
  size = 18,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { size?: number }) {
  return (
    <img
      src="https://img.icons8.com/ios/100/weight-kg.png"
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
      className={`shrink-0 select-none pointer-events-none inline-block dark:invert ${className}`}
      loading="lazy"
      {...props}
    />
  );
}
