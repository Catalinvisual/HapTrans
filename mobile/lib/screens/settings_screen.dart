import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../utils/constants.dart';
import '../widgets/language_dropdown.dart';

/// Driver settings: appearance and language. Appearance is stored separately
/// from the session so it survives logout, restart and APK updates.
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final theme = context.watch<ThemeProvider>();
    context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l.translate('settings_title')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Text(
            l.translate('settings_subtitle'),
            style: TextStyle(fontSize: 13, color: kTextSecondary, height: 1.4),
          ),
          const SizedBox(height: 18),
          _SectionCard(
            icon: Icons.contrast_rounded,
            title: l.translate('settings_appearance'),
            subtitle: l.translate('settings_appearance_desc'),
            child: Column(
              children: [
                _AppearanceOption(
                  icon: Icons.light_mode_outlined,
                  label: l.translate('appearance_light'),
                  selected: theme.mode == ThemeMode.light,
                  onTap: () => theme.setMode(ThemeMode.light),
                ),
                const SizedBox(height: 8),
                _AppearanceOption(
                  icon: Icons.dark_mode_outlined,
                  label: l.translate('appearance_dark'),
                  selected: theme.mode == ThemeMode.dark,
                  onTap: () => theme.setMode(ThemeMode.dark),
                ),
                const SizedBox(height: 8),
                _AppearanceOption(
                  icon: Icons.phone_android_rounded,
                  label: l.translate('appearance_system'),
                  subtitle: l.translate('appearance_system_desc'),
                  selected: theme.mode == ThemeMode.system,
                  onTap: () => theme.setMode(ThemeMode.system),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _SectionCard(
            icon: Icons.language_rounded,
            title: l.translate('settings_language'),
            subtitle: l.translate('settings_language_desc'),
            child: Align(
              alignment: Alignment.centerLeft,
              child: const LanguageDropdown(),
            ),
          ),
          const SizedBox(height: 14),
          _SectionCard(
            icon: Icons.badge_outlined,
            title: l.translate('settings_account'),
            subtitle: context.watch<AuthProvider>().user?['name']?.toString() ?? '—',
            child: Text(
              context.watch<AuthProvider>().user?['role']?.toString() ?? '—',
              style: TextStyle(fontSize: 13, color: kTextSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;

  const _SectionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorder),
        boxShadow: [
          BoxShadow(color: kShadow, blurRadius: 14, offset: const Offset(0, 5)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: kPrimaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: kPrimary),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: kText,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: TextStyle(fontSize: 11.5, color: kTextSecondary, height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _AppearanceOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _AppearanceOption({
    required this.icon,
    required this.label,
    this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            color: selected ? kPrimaryLight : kCardMuted,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? kPrimary : kBorder, width: selected ? 1.4 : 1),
          ),
          child: Row(
            children: [
              Icon(icon, size: 19, color: selected ? kPrimary : kTextSecondary),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                        color: selected ? kPrimary : kText,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        style: TextStyle(fontSize: 10.5, color: kTextSecondary),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? kPrimary : Colors.transparent,
                  border: Border.all(color: selected ? kPrimary : kBorder),
                ),
                child: selected
                    ? Icon(Icons.check, size: 13, color: kOnPrimary)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
