import 'package:flutter/material.dart';

/// Semantic driver-app palette.
///
/// Operational screens use these tokens instead of raw colours so light and
/// dark mode stay coherent. Accent orange is reserved for actions and selected
/// states; ordinary cards use neutral surfaces.
class AppPalette {
  final Brightness brightness;
  final Color background;
  final Color surface;
  final Color card;
  final Color cardMuted;
  final Color cardElevated;
  final Color text;
  final Color textSecondary;
  final Color textMuted;
  final Color border;
  final Color divider;
  final Color primary;
  final Color primaryStrong;
  final Color primarySoft;
  final Color onPrimary;
  final Color success;
  final Color successSoft;
  final Color error;
  final Color errorSoft;
  final Color warning;
  final Color warningSoft;
  final Color info;
  final Color infoSoft;
  final Color shadow;

  const AppPalette({
    required this.brightness,
    required this.background,
    required this.surface,
    required this.card,
    required this.cardMuted,
    required this.cardElevated,
    required this.text,
    required this.textSecondary,
    required this.textMuted,
    required this.border,
    required this.divider,
    required this.primary,
    required this.primaryStrong,
    required this.primarySoft,
    required this.onPrimary,
    required this.success,
    required this.successSoft,
    required this.error,
    required this.errorSoft,
    required this.warning,
    required this.warningSoft,
    required this.info,
    required this.infoSoft,
    required this.shadow,
  });

  static const light = AppPalette(
    brightness: Brightness.light,
    background: Color(0xFFF4F6F9),
    surface: Color(0xFFF8FAFC),
    card: Color(0xFFFFFFFF),
    cardMuted: Color(0xFFF1F5F9),
    cardElevated: Color(0xFFFFFFFF),
    text: Color(0xFF0F172A),
    textSecondary: Color(0xFF566274),
    textMuted: Color(0xFF7B8798),
    border: Color(0xFFE1E7EF),
    divider: Color(0xFFEBEFF5),
    // Exact HapCargo TMS brand orange (`--color-primary: 255 90 0`).
    primary: Color(0xFFFF5A00),
    primaryStrong: Color(0xFFE04F00),
    primarySoft: Color(0xFFFFF0E6),
    onPrimary: Color(0xFFFFFFFF),
    success: Color(0xFF137A3A),
    successSoft: Color(0xFFE8F7EE),
    error: Color(0xFFB42318),
    errorSoft: Color(0xFFFDECEA),
    warning: Color(0xFF9A5B00),
    warningSoft: Color(0xFFFFF5DE),
    info: Color(0xFF1D4ED8),
    infoSoft: Color(0xFFEAF0FF),
    shadow: Color(0x1A0F172A),
  );

  static const dark = AppPalette(
    brightness: Brightness.dark,
    background: Color(0xFF0D1218),
    surface: Color(0xFF111821),
    card: Color(0xFF17202A),
    cardMuted: Color(0xFF1D2834),
    cardElevated: Color(0xFF202C39),
    text: Color(0xFFF1F5F9),
    textSecondary: Color(0xFFB2BECC),
    textMuted: Color(0xFF8A98AA),
    border: Color(0xFF2B3847),
    divider: Color(0xFF24313F),
    // The same brand token in dark mode; surfaces provide the contrast.
    primary: Color(0xFFFF5A00),
    primaryStrong: Color(0xFFFF7A33),
    primarySoft: Color(0xFF3A2418),
    onPrimary: Color(0xFFFFFFFF),
    success: Color(0xFF4ADE80),
    successSoft: Color(0xFF143324),
    error: Color(0xFFFCA5A5),
    errorSoft: Color(0xFF3A1D1F),
    warning: Color(0xFFFBBF24),
    warningSoft: Color(0xFF3A2D12),
    info: Color(0xFF93C5FD),
    infoSoft: Color(0xFF16283F),
    shadow: Color(0x66000000),
  );
}

/// Central theme definitions plus the resolved palette used by semantic
/// tokens. The active palette is switched by [ThemeProvider] before the
/// MaterialApp rebuilds, so every screen receives the same light/dark tokens.
class AppTheme {
  static AppPalette _active = AppPalette.light;

  static AppPalette get colors => _active;

  static void activate(Brightness brightness) {
    _active =
        brightness == Brightness.dark ? AppPalette.dark : AppPalette.light;
  }

  static ThemeData get light => _build(AppPalette.light);
  static ThemeData get dark => _build(AppPalette.dark);

  static ThemeData _build(AppPalette p) {
    final scheme = ColorScheme.fromSeed(
      seedColor: p.primary,
      brightness: p.brightness,
    ).copyWith(
      primary: p.primary,
      onPrimary: p.onPrimary,
      primaryContainer: p.primarySoft,
      onPrimaryContainer: p.text,
      secondary: p.primary,
      onSecondary: p.onPrimary,
      surface: p.background,
      onSurface: p.text,
      surfaceContainer: p.card,
      surfaceContainerHigh: p.cardElevated,
      surfaceContainerHighest: p.cardMuted,
      error: p.error,
      onError: p.brightness == Brightness.dark
          ? const Color(0xFF2B0C0C)
          : Colors.white,
      outline: p.border,
      outlineVariant: p.divider,
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: p.brightness,
      colorScheme: scheme,
      fontFamily: 'Roboto',
      scaffoldBackgroundColor: p.background,
      canvasColor: p.background,
      cardColor: p.card,
      dividerColor: p.border,
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: p.text,
        displayColor: p.text,
      ),
      primaryTextTheme: base.textTheme.apply(
        bodyColor: p.onPrimary,
        displayColor: p.onPrimary,
      ),
      iconTheme: IconThemeData(color: p.textSecondary),
      appBarTheme: AppBarTheme(
        backgroundColor: p.background,
        foregroundColor: p.text,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: p.text,
          fontSize: 17,
          fontWeight: FontWeight.w700,
          fontFamily: 'Roboto',
        ),
        iconTheme: IconThemeData(color: p.text),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: p.card,
        surfaceTintColor: Colors.transparent,
        indicatorColor: p.primarySoft,
        elevation: 0,
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(
              color: p.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w600),
        ),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
              color: selected ? p.primary : p.textMuted, size: 23);
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: p.primary,
          foregroundColor: p.onPrimary,
          disabledBackgroundColor: p.cardMuted,
          disabledForegroundColor: p.textMuted,
          elevation: 0,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          textStyle: const TextStyle(
            fontFamily: 'Roboto',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: p.primary,
          foregroundColor: p.onPrimary,
          disabledBackgroundColor: p.cardMuted,
          disabledForegroundColor: p.textMuted,
          textStyle: const TextStyle(
            fontFamily: 'Roboto',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: p.primary,
          side: BorderSide(color: p.border),
          textStyle: const TextStyle(
            fontFamily: 'Roboto',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: p.primary,
          textStyle: const TextStyle(
            fontFamily: 'Roboto',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: p.primary,
        foregroundColor: p.onPrimary,
        elevation: 2,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.cardMuted,
        hintStyle: TextStyle(color: p.textMuted, fontSize: 13),
        labelStyle: TextStyle(color: p.textSecondary, fontSize: 13),
        floatingLabelStyle: TextStyle(color: p.primary),
        prefixIconColor: p.textSecondary,
        suffixIconColor: p.textSecondary,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: p.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: p.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: p.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: p.error),
        ),
      ),
      dividerTheme: DividerThemeData(color: p.divider, thickness: 1, space: 1),
      dialogTheme: DialogThemeData(
        backgroundColor: p.card,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        titleTextStyle: TextStyle(
          color: p.text,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
        contentTextStyle:
            TextStyle(color: p.textSecondary, fontSize: 14, height: 1.4),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: p.card,
        modalBackgroundColor: p.card,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        ),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: p.cardElevated,
        surfaceTintColor: Colors.transparent,
        textStyle: TextStyle(color: p.text, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: p.brightness == Brightness.dark
            ? p.cardElevated
            : const Color(0xFF1F2937),
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13),
        actionTextColor: p.primaryStrong,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: p.primary,
        linearTrackColor: p.cardMuted,
        circularTrackColor: p.cardMuted,
      ),
      listTileTheme: ListTileThemeData(
        iconColor: p.textSecondary,
        textColor: p.text,
        subtitleTextStyle: TextStyle(color: p.textSecondary, fontSize: 12),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? p.onPrimary : p.textMuted,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? p.primary : p.cardMuted,
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: p.cardMuted,
        selectedColor: p.primarySoft,
        side: BorderSide(color: p.border),
        labelStyle:
            TextStyle(color: p.text, fontSize: 12, fontWeight: FontWeight.w600),
        secondaryLabelStyle: TextStyle(
            color: p.primary, fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }
}
