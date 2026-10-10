import 'package:intl/intl.dart';

const _supportedLocales = ['ro', 'nl', 'de', 'fr', 'en', 'es', 'pl'];

final Map<String, NumberFormat> _fmtCache = {};

NumberFormat _numberFormat(String lang, int decimals) {
  final locale = _supportedLocales.contains(lang) ? lang : 'en';
  final key = '$locale|$decimals';
  return _fmtCache.putIfAbsent(key, () {
    final fmt = NumberFormat.decimalPattern(locale);
    fmt.minimumFractionDigits = decimals;
    fmt.maximumFractionDigits = decimals;
    return fmt;
  });
}

String fmtNum(num? v, String lang, {int decimals = 0}) {
  if (v == null) return '—';
  return _numberFormat(lang, decimals).format(v);
}

String fmtMoney(num? v, String lang, {String symbol = '€', int decimals = 2}) {
  if (v == null) return '—';
  final formatted = _numberFormat(lang, decimals).format(v);
  switch (lang) {
    case 'fr':
      return '$formatted\u00A0$symbol';
    case 'en':
      return '$symbol$formatted';
    default:
      return '$symbol $formatted';
  }
}
