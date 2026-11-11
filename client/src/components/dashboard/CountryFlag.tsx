import { canonicalCountryCode } from './types';

/**
 * Local SVG flags from flag-icons. Keeping the image in the bundle means a
 * country never falls back to a blank card because an external CDN was
 * blocked, rate-limited, or still loading.
 */
export default function CountryFlag({
  code,
  className = '',
}: {
  code: string | null | undefined;
  className?: string;
}) {
  const iso = canonicalCountryCode(code);
  if (!iso) return null;

  return (
    <span
      className={`fi fi-${iso.toLowerCase()} inline-block shrink-0 rounded-[3px] bg-slate-100 ring-1 ring-black/10 ${className}`}
      style={{ width: 20, height: 14, backgroundSize: 'cover', backgroundPosition: 'center' }}
      aria-hidden="true"
    />
  );
}
