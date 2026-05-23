import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../widgets/language_dropdown.dart';

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
        ]),
      ),
    );
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
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(err), backgroundColor: kError),
                          );
                        }
                      } else {
                        if (context.mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
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
