import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) =>
      Localizations.of<AppLocalizations>(context, AppLocalizations)!;

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  static final Map<String, Map<String, String>> _localizedValues = {
    'ro': {
      'app_name': 'HapCargo Șofer',
      'trips': 'Curse',
      'map': 'Hartă',
      'chat': 'Chat',
      'profile': 'Profil',
      'login': 'Autentifică-te',
      'logout': 'Deconectare',
    },
    'en': {
      'app_name': 'HapCargo Driver',
      'trips': 'Trips',
      'map': 'Map',
      'chat': 'Chat',
      'profile': 'Profile',
      'login': 'Sign In',
      'logout': 'Logout',
    },
    'nl': {
      'app_name': 'HapCargo Chauffeur',
      'trips': 'Ritten',
      'map': 'Kaart',
      'chat': 'Chat',
      'profile': 'Profiel',
      'login': 'Inloggen',
      'logout': 'Uitloggen',
    },
    'de': {
      'app_name': 'HapCargo Fahrer',
      'trips': 'Touren',
      'map': 'Karte',
      'chat': 'Chat',
      'profile': 'Profil',
      'login': 'Anmelden',
      'logout': 'Abmelden',
    },
    'fr': {
      'app_name': 'HapCargo Chauffeur',
      'trips': 'Courses',
      'map': 'Carte',
      'chat': 'Chat',
      'profile': 'Profil',
      'login': 'Connexion',
      'logout': 'Déconnexion',
    },
  };

  String translate(String key) =>
      _localizedValues[locale.languageCode]?[key] ??
      _localizedValues['ro']?[key] ?? key;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['ro', 'en', 'nl', 'de', 'fr'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async => AppLocalizations(locale);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
