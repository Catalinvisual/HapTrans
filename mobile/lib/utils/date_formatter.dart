import 'package:intl/intl.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// The zone the server converts appointment wall clocks in.
///
/// Every timestamp the API returns is a UTC instant and the TMS prints it in
/// this operational zone. Formatting in the phone's own zone made each time one
/// hour early for a driver in the Netherlands, so the app now uses the same
/// clock as the order it was dispatched from.
const operationalTimeZone = 'Europe/Bucharest';

bool _timeZonesInitialized = false;

/// The instant rendered on the operational clock, whatever the phone is set to.
DateTime _operationalDateTime(DateTime value) {
  if (!_timeZonesInitialized) {
    tzdata.initializeTimeZones();
    _timeZonesInitialized = true;
  }
  return tz.TZDateTime.from(value.toUtc(), tz.getLocation(operationalTimeZone));
}

String formatAppDate(String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) return '—';
  try {
    final DateTime dt = _operationalDateTime(DateTime.parse(isoDate));
    return DateFormat('dd/MM/yyyy').format(dt);
  } catch (e) {
    if (isoDate.length >= 10) return isoDate.substring(0, 10);
    return isoDate;
  }
}

String formatAppTime(String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) return '—';
  try {
    final DateTime dt = _operationalDateTime(DateTime.parse(isoDate));
    return DateFormat('HH:mm').format(dt);
  } catch (e) {
    return '—';
  }
}

String formatAppDateTime(String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) return '—';
  try {
    final DateTime dt = _operationalDateTime(DateTime.parse(isoDate));
    return DateFormat('dd/MM/yyyy HH:mm').format(dt);
  } catch (e) {
    if (isoDate.length >= 16) return isoDate.substring(0, 16).replaceAll('T', ' ');
    return isoDate;
  }
}
