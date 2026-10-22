import type { ImgHTMLAttributes } from 'react';

export default function ExcelIcon({
  className = 'w-8 h-8',
  alt = 'ms-excel',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="https://img.icons8.com/color/96/ms-excel.png"
      alt={alt}
      width={96}
      height={96}
      className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
      loading="lazy"
      {...props}
    />
  );
}
