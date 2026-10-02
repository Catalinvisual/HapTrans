import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import '../widgets/language_dropdown.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final locale = auth.locale.languageCode;
    final user = auth.user;



    return Scaffold(
      appBar: AppBar(title: Text({'ro':'Profilul meu','en':'My Profile','nl':'Mijn profiel','de':'Mein Profil','fr':'Mon profil'}[locale] ?? 'My Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(child: Column(children: [
            Container(
              width: 80, height: 80,
              decoration: const BoxDecoration(color: kPrimaryLight, shape: BoxShape.circle),
              child: Center(child: Text(
                (user?['name'] ?? '?').substring(0, 1).toUpperCase(),
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: kPrimary),
              )),
            ),
            const SizedBox(height: 12),
            Text(user?['name'] ?? '—', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: kText)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(20)),
              child: Text(user?['role'] ?? '—', style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
            ),
          ])),
          const SizedBox(height: 32),

          // Language switcher
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                {'ro':'Limbă','en':'Language','nl':'Taal','de':'Sprache','fr':'Langue'}[locale] ?? 'Language',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: kText),
              ),
              const LanguageDropdown(),
            ],
          ),

          const SizedBox(height: 24),

          ElevatedButton.icon(
            onPressed: () => _showChangePasswordDialog(context, auth, locale),
            icon: const Icon(Icons.lock_reset_rounded),
            label: Text({
              'ro': 'Schimbă parola',
              'en': 'Change password',
              'nl': 'Wachtwoord wijzigen',
              'de': 'Passwort ändern',
              'fr': 'Changer le mot de passe'
            }[locale] ?? 'Change password'),
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),

          const SizedBox(height: 12),

          ElevatedButton.icon(
            onPressed: () => _checkForUpdateManual(context, locale),
            icon: const Icon(Icons.system_update),
            label: Text({
              'ro': 'Verifică Actualizări',
              'en': 'Check for Updates',
              'nl': 'Controleer op updates',
              'de': 'Nach Updates suchen',
              'fr': 'Vérifier les mises à jour'
            }[locale] ?? 'Check for Updates'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blueAccent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: () {
              auth.logout();
              Navigator.pushReplacementNamed(context, '/login');
            },
            icon: const Icon(Icons.logout),
            label: Text({'ro':'Deconectare','en':'Logout','nl':'Uitloggen','de':'Abmelden','fr':'Déconnexion'}[locale] ?? 'Logout'),
            style: ElevatedButton.styleFrom(
              backgroundColor: kError,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              '${{'ro': 'Versiunea aplicației: ', 'en': 'App Version: ', 'nl': 'App Versie: ', 'de': 'App Version: ', 'fr': 'Version de l\'application: '}[locale] ?? 'App Version: '}$kAppVersionCode',
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }

  Future<void> _checkForUpdateManual(BuildContext context, String locale) async {
    try {
      final res = await Dio().get('$kApiUrl/auth/app-version');
      final data = res.data;
      final serverVersion = data['versionCode'] ?? 0;
      
      if (serverVersion > kAppVersionCode) {
        final url = data['url'];
        if (url != null) {
          _downloadAndInstallUpdate(context, url, locale);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text({
              'ro': 'Folosiți deja ultima versiune.',
              'en': 'You are already using the latest version.',
              'nl': 'U gebruikt al de nieuwste versie.',
              'de': 'Sie verwenden bereits die neueste Version.',
              'fr': 'Vous utilisez déjà la dernière version.'
            }[locale] ?? 'You are already using the latest version.'),
            backgroundColor: kSuccess,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Eroare la verificarea actualizării: $e'), backgroundColor: kError),
      );
    }
  }

  Future<void> _downloadAndInstallUpdate(BuildContext context, String url, String locale) async {
    final ValueNotifier<double> progressNotifier = ValueNotifier(0.0);
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => ValueListenableBuilder<double>(
        valueListenable: progressNotifier,
        builder: (context, progress, child) {
          return AlertDialog(
            title: Text({
              'ro': 'Se descarcă...',
              'en': 'Downloading...',
              'nl': 'Downloaden...',
              'de': 'Wird heruntergeladen...',
              'fr': 'Téléchargement...'
            }[locale] ?? 'Downloading...'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                LinearProgressIndicator(value: progress),
                const SizedBox(height: 16),
                Text('${(progress * 100).toStringAsFixed(0)}%'),
              ],
            ),
          );
        }
      ),
    );

    try {
      final dir = await getExternalStorageDirectory();
      if (dir == null) return;
      final filePath = '${dir.path}/HapTrans_update.apk';
      
      final dio = Dio();
      await dio.download(
        url,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            progressNotifier.value = received / total;
          }
        },
      );
      
      if (Navigator.canPop(context)) {
        Navigator.pop(context); // Close downloading dialog
      }
      await OpenFilex.open(filePath);
    } catch (e) {
      if (Navigator.canPop(context)) {
        Navigator.pop(context);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Eroare descărcare: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _showChangePasswordDialog(BuildContext context, AuthProvider auth, String locale) {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool loading = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            {
              'ro': 'Schimbă parola',
              'en': 'Change Password',
              'nl': 'Wachtwoord wijzigen',
              'de': 'Passwort ändern',
              'fr': 'Changer le mot de passe'
            }[locale] ?? 'Change Password',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: kText),
          ),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: oldCtrl,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: {
                        'ro': 'Parola veche',
                        'en': 'Old password',
                        'nl': 'Oud wachtwoord',
                        'de': 'Altes Passwort',
                        'fr': 'Ancien mot de passe'
                      }[locale] ?? 'Old password',
                      prefixIcon: const Icon(Icons.lock_outline, size: 20),
                    ),
                    validator: (v) => (v == null || v.isEmpty)
                        ? ({
                            'ro': 'Introduceți parola veche',
                            'en': 'Enter old password',
                            'nl': 'Voer oud wachtwoord in',
                            'de': 'Geben Sie das alte Passwort ein',
                            'fr': 'Entrez l\'ancien mot de passe'
                          }[locale] ?? 'Enter old password')
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: newCtrl,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: {
                        'ro': 'Parola nouă',
                        'en': 'New password',
                        'nl': 'Nieuw wachtwoord',
                        'de': 'Neues Passwort',
                        'fr': 'Nouveau mot de passe'
                      }[locale] ?? 'New password',
                      prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
                    ),
                    validator: (v) {
                      if (v == null || v.length < 6) {
                        return {
                          'ro': 'Minim 6 caractere',
                          'en': 'Minimum 6 characters',
                          'nl': 'Minimaal 6 tekens',
                          'de': 'Mindestens 6 Zeichen',
                          'fr': 'Au moins 6 caractères'
                        }[locale] ?? 'Minimum 6 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: confirmCtrl,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: {
                        'ro': 'Confirmare parola nouă',
                        'en': 'Confirm new password',
                        'nl': 'Bevestig nieuw wachtwoord',
                        'de': 'Neues Passwort bestätigen',
                        'fr': 'Confirmer le nouveau mot de passe'
                      }[locale] ?? 'Confirm new password',
                      prefixIcon: const Icon(Icons.check_circle_outline, size: 20),
                    ),
                    validator: (v) {
                      if (v != newCtrl.text) {
                        return {
                          'ro': 'Parolele nu se potrivesc',
                          'en': 'Passwords do not match',
                          'nl': 'Wachtwoorden komen niet overeen',
                          'de': 'Passwörter stimmen nicht überein',
                          'fr': 'Les mots de passe ne correspondent pas'
                        }[locale] ?? 'Passwords do not match';
                      }
                      return null;
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: loading ? null : () => Navigator.pop(ctx),
              child: Text(
                {
                  'ro': 'Anulează',
                  'en': 'Cancel',
                  'nl': 'Annuleren',
                  'de': 'Abbrechen',
                  'fr': 'Annuler'
                }[locale] ?? 'Cancel',
                style: const TextStyle(color: kTextSecondary),
              ),
            ),
            ElevatedButton(
              onPressed: loading
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setState(() => loading = true);
                      final err = await auth.changePassword(oldCtrl.text, newCtrl.text);
                      setState(() => loading = false);
                      if (err != null) {
                        if (context.mounted) {
                          showTopSnackBar(context, 
                            SnackBar(content: Text({'ro': 'Eroare: $err', 'en': 'Error: $err', 'nl': 'Fout: $err', 'de': 'Fehler: $err', 'fr': 'Erreur: $err'}[locale] ?? err), backgroundColor: kError),
                          );
                        }
                      } else {
                        if (context.mounted) {
                          Navigator.pop(ctx);
                          showTopSnackBar(context, 
                            SnackBar(
                              content: Text({
                                'ro': 'Parolă schimbată cu succes!',
                                'en': 'Password changed successfully!',
                                'nl': 'Wachtwoord succesvol gewijzigd!',
                                'de': 'Passwort erfolgreich geändert!',
                                'fr': 'Mot de passe changé avec succès !'
                              }[locale] ?? 'Password changed successfully!'),
                              backgroundColor: kSuccess,
                            ),
                          );
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: loading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(
                      {
                        'ro': 'Schimbă',
                        'en': 'Change',
                        'nl': 'Wijzigen',
                        'de': 'Ändern',
                        'fr': 'Changer'
                      }[locale] ?? 'Change',
                      style: const TextStyle(color: Colors.white),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
