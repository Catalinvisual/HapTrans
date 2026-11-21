import { useMemo } from 'react';
import { Globe2 } from 'lucide-react';
import CustomSelect, { type SelectOption } from './CustomSelect';
import CountryFlag from './dashboard/CountryFlag';
import { canonicalCountryCode, countryName, localeFor } from './dashboard/types';

interface CountryFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Raw country values from the rows: ISO2, ISO3, or a country name. */
  countries: Array<string | null | undefined>;
  lang: string;
  allLabel: string;
  allValue?: string;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

/**
 * One country filter for every TMS screen, matching the dashboard filter:
 * a coloured flag and the full country name, with all spellings of a country
 * folded into a single ISO2 option.
 */
export default function CountryFilterSelect({
  value,
  onChange,
  countries,
  lang,
  allLabel,
  allValue = 'all',
  size = 'sm',
  className,
  title,
}: CountryFilterSelectProps) {
  const options = useMemo<SelectOption[]>(() => {
    const codes = Array.from(new Set(
      countries.map(canonicalCountryCode).filter((code): code is string => Boolean(code)),
    )).sort((a, b) => countryName(a, lang).localeCompare(countryName(b, lang), localeFor(lang)));

    return [
      { value: allValue, label: allLabel },
      ...codes.map((code) => ({
        value: code,
        label: (
          <span className="flex items-center gap-2">
            <CountryFlag code={code} />
            <span>{countryName(code, lang)}</span>
          </span>
        ),
      })),
    ];
  }, [countries, lang, allLabel, allValue]);

  return (
    <CustomSelect
      size={size}
      icon={Globe2}
      title={title}
      value={value}
      onChange={onChange}
      options={options}
      className={className}
    />
  );
}
