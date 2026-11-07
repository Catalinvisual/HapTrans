import 'package:flutter/material.dart';
import 'app_theme.dart';

// ─── Semantic colours ───
// These are resolved from the active palette. Screens must not hardcode light
// surfaces or dark text; use these tokens (or Theme.of(context)) instead.
Color get kPrimary => AppTheme.colors.primary;
Color get kPrimaryStrong => AppTheme.colors.primaryStrong;
Color get kPrimaryDark => AppTheme.colors.primaryStrong;
Color get kPrimaryLight => AppTheme.colors.primarySoft;
Color get kOnPrimary => AppTheme.colors.onPrimary;
Color get kSuccess => AppTheme.colors.success;
Color get kSuccessLight => AppTheme.colors.successSoft;
Color get kError => AppTheme.colors.error;
Color get kErrorLight => AppTheme.colors.errorSoft;
Color get kWarning => AppTheme.colors.warning;
Color get kWarningLight => AppTheme.colors.warningSoft;
Color get kInfo => AppTheme.colors.info;
Color get kInfoLight => AppTheme.colors.infoSoft;
Color get kSurface => AppTheme.colors.background;
Color get kCard => AppTheme.colors.card;
Color get kCardMuted => AppTheme.colors.cardMuted;
Color get kCardElevated => AppTheme.colors.cardElevated;
Color get kText => AppTheme.colors.text;
Color get kTextSecondary => AppTheme.colors.textSecondary;
Color get kTextMuted => AppTheme.colors.textMuted;
Color get kBorder => AppTheme.colors.border;
Color get kDivider => AppTheme.colors.divider;
Color get kShadow => AppTheme.colors.shadow;
bool get kIsDark => AppTheme.colors.brightness == Brightness.dark;

// ─── API ───
const kApiUrl = 'https://haptrans-production.up.railway.app/api';
const kWsUrl = 'https://haptrans-production.up.railway.app';

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
            color: snackBar.backgroundColor ?? kCardElevated,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: kBorder),
            boxShadow: [BoxShadow(color: kShadow, blurRadius: 8, offset: const Offset(0, 3))],
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
