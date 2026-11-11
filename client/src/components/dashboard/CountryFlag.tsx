import { canonicalCountryCode } from './types';

/** A real colour flag, with the country name as its accessible label. */
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
    <img
      src={`https://flagcdn.com/w40/${iso.toLowerCase()}.png`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`inline-block h-3.5 w-5 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10 ${className}`}
    />
  );
}
