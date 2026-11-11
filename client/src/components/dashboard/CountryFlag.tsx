import { useEffect, useState } from 'react';
import { canonicalCountryCode } from './types';

const primaryFlag = (iso: string) => `https://flagcdn.com/w80/${iso.toLowerCase()}.png`;
const fallbackFlag = (iso: string) => `https://flagsapi.com/${iso}/flat/24.png`;

/** A real colour flag, with a second source and a code fallback. */
export default function CountryFlag({
  code,
  className = '',
}: {
  code: string | null | undefined;
  className?: string;
}) {
  const iso = canonicalCountryCode(code);
  const [src, setSrc] = useState(() => (iso ? primaryFlag(iso) : ''));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!iso) return;
    setSrc(primaryFlag(iso));
    setFailed(false);
  }, [iso]);

  if (!iso) return null;
  if (failed) {
    return (
      <span
        className={`inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-primary/10 text-[7px] font-black uppercase text-primary ${className}`}
        aria-hidden="true"
      >
        {iso}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== fallbackFlag(iso)) {
          setSrc(fallbackFlag(iso));
        } else {
          setFailed(true);
        }
      }}
      className={`inline-block h-3.5 w-5 shrink-0 rounded-[3px] bg-slate-100 object-cover ring-1 ring-black/10 dark:bg-slate-800 ${className}`}
    />
  );
}
