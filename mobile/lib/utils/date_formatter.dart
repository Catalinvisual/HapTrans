import 'package:intl/intl.dart';

String formatAppDate(String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) return '—';
  try {
    final DateTime dt = DateTime.parse(isoDate);
    return DateFormat('dd/MM/yyyy').format(dt);
  } catch (e) {
    if (isoDate.length >= 10) return isoDate.substring(0, 10);
    return isoDate;
  }
}

String formatAppDateTime(String? isoDate) {
  if (isoDate == null || isoDate.isEmpty) return '—';
  try {
    final DateTime dt = DateTime.parse(isoDate).toLocal();
    return DateFormat('dd/MM/yyyy HH:mm').format(dt);
  } catch (e) {
    if (isoDate.length >= 16) return isoDate.substring(0, 16).replaceAll('T', ' ');
    return isoDate;
  }
}
