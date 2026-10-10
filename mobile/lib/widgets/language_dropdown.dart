import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';

class LanguageDropdown extends StatelessWidget {
  const LanguageDropdown({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final currentLocale = auth.locale.languageCode;

    final langs = [
      ('ro', '🇷🇴', 'Română'),
      ('en', '🇬🇧', 'English'),
      ('nl', '🇳🇱', 'Nederlands'),
      ('de', '🇩🇪', 'Deutsch'),
      ('fr', '🇫🇷', 'Français'),
      ('es', '🇪🇸', 'Español'),
      ('pl', '🇵🇱', 'Polski'),
    ];

    final current = langs.firstWhere((l) => l.$1 == currentLocale, orElse: () => langs[0]);

    return PopupMenuButton<String>(
      onSelected: (code) => auth.setLocale(code),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.white,
      elevation: 4,
      offset: const Offset(0, 42),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: kBorder),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            )
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(current.$2, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 8),
            Text(
              current.$3,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: kText),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.arrow_drop_down, color: kTextSecondary, size: 20),
          ],
        ),
      ),
      itemBuilder: (context) => langs.map((l) {
        final isSelected = l.$1 == currentLocale;
        return PopupMenuItem<String>(
          value: l.$1,
          child: Row(
            children: [
              Text(l.$2, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 12),
              Text(
                l.$3,
                style: TextStyle(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? kPrimary : kText,
                ),
              ),
              const Spacer(),
              if (isSelected) const Icon(Icons.check, color: kPrimary, size: 16),
            ],
          ),
        );
      }).toList(),
    );
  }
}
