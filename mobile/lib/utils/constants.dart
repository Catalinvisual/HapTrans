import 'package:flutter/material.dart';

// ─── Colors ───
const kPrimary = Color(0xFFFF5A00);
const kPrimaryDark = Color(0xFFE04D00);
const kPrimaryLight = Color(0xFFFFF0E6);
const kSuccess = Color(0xFF16A34A);
const kError = Color(0xFFDC2626);
const kWarning = Color(0xFFF59E0B);
const kSurface = Color(0xFFF2F4F7);
const kCard = Color(0xFFFFFFFF);
const kText = Color(0xFF0D1B2A);
const kTextSecondary = Color(0xFF6B7280);
const kBorder = Color(0xFFE5E7EB);

// ─── App Version ───
const int kAppVersionCode = 6;

// ─── API ───
const kApiUrl = 'https://haptrans-production.up.railway.app/api';
const kWsUrl = 'https://haptrans-production.up.railway.app';

class AppTheme {
  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: kPrimary,
      primary: kPrimary,
      secondary: kPrimaryDark,
      surface: kSurface,
      error: kError,
    ),
    fontFamily: 'Roboto',
    scaffoldBackgroundColor: kSurface,
    cardColor: kCard,
    appBarTheme: const AppBarTheme(
      backgroundColor: kCard,
      foregroundColor: kText,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(color: kText, fontSize: 17, fontWeight: FontWeight.w600),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kBorder)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kBorder)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kPrimary, width: 2)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      labelStyle: const TextStyle(color: kTextSecondary, fontSize: 14),
    ),
  );
}

void showTopSnackBar(BuildContext context, SnackBar snackBar) {
  final overlay = Overlay.of(context);
  late OverlayEntry overlayEntry;
  overlayEntry = OverlayEntry(
    builder: (context) => Positioned(
      top: MediaQuery.of(context).padding.top + kToolbarHeight + 16,
      left: 16,
      right: 16,
      child: Material(
        color: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: snackBar.backgroundColor ?? Colors.grey[800],
            borderRadius: BorderRadius.circular(8),
            boxShadow: const [
              BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2))
            ],
          ),
          child: snackBar.content,
        ),
      ),
    ),
  );
  overlay.insert(overlayEntry);
  Future.delayed(const Duration(seconds: 3), () {
    overlayEntry.remove();
  });
}
