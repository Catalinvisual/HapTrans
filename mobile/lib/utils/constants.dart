import 'package:flutter/material.dart';

// ─── Colors ───
const kPrimary = Color(0xFFFF7A1A);
const kPrimaryDark = Color(0xFFE86405);
const kPrimaryLight = Color(0xFFFFF0E6);
const kSuccess = Color(0xFF16A34A);
const kError = Color(0xFFDC2626);
const kWarning = Color(0xFFF59E0B);
const kSurface = Color(0xFFF5F7FA);
const kCard = Color(0xFFFFFFFF);
const kText = Color(0xFF1F2933);
const kTextSecondary = Color(0xFF6B7280);
const kBorder = Color(0xFFE5E7EB);

// ─── API ───
const kApiUrl = 'http://192.168.2.7:3001/api'; // Active Wi-Fi IP
const kWsUrl = 'http://192.168.2.7:3001';

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
