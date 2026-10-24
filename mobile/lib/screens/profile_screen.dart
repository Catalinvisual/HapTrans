import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import '../widgets/language_dropdown.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import '../providers/update_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final locale = auth.locale.languageCode;
    final user = auth.user;



    return Scaffold(
      appBar: AppBar(title: Text({'ro':'Profilul meu','en':'My Profile','nl':'Mijn profiel','de':'Mein Profil','fr':'Mon profil', 'es': 'Mi Perfil', 'pl': 'Mój profil' }[locale] ?? 'My Profile')),
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
                {'ro':'Limbă','en':'Language','nl':'Taal','de':'Sprache','fr':'Langue', 'es': 'Idioma', 'pl': 'Język' }[locale] ?? 'Language',
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
            , 'es': 'Cambiar contraseña', 'pl': 'Zmień hasło' }[locale] ?? 'Change password'),
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),

          const SizedBox(height: 12),

          Consumer<UpdateProvider>(
            builder: (context, updateProv, child) {
              if (updateProv.hasUpdate) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () => updateProv.promptUpdateDialog(context, locale: locale),
                      icon: const Icon(Icons.download_rounded, color: Colors.white, size: 20),
                      label: Text(
                        {
                          'ro': 'Actualizare Disponibilă (v${updateProv.serverVersionCode ?? ''}) - Descarcă',
                          'en': 'Update Available (v${updateProv.serverVersionCode ?? ''}) - Download',
                          'nl': 'Update beschikbaar (v${updateProv.serverVersionCode ?? ''}) - Nu downloaden',
                          'de': 'Update verfügbar (v${updateProv.serverVersionCode ?? ''}) - Jetzt herunterladen',
                          'fr': 'Mise à jour disponible (v${updateProv.serverVersionCode ?? ''}) - Télécharger',
                          'es': 'Actualización Disponible (v${updateProv.serverVersionCode ?? ''}) - Descargar',
                          'pl': 'Dostępna aktualizacja (v${updateProv.serverVersionCode ?? ''}) - Pobierz',
                        }[locale] ?? 'Update Available - Download',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 4,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Center(
                      child: Text(
                        {
                          'ro': 'O nouă versiune este pregătită pentru instalare!',
                          'en': 'A new version is ready to install!',
                          'nl': 'Er staat een nieuwe versie klaar om te installeren!',
                          'de': 'Eine neue Version ist zur Installation bereit!',
                          'fr': 'Une nouvelle version est prête à être installée !',
                          'es': '¡Hay una nueva versión lista para instalar!',
                          'pl': 'Nowa wersja jest gotowa do instalacji!',
                        }[locale] ?? 'A new version is ready to install!',
                        style: TextStyle(fontSize: 11, color: Colors.amber.shade800, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                );
              }

              return ElevatedButton.icon(
                onPressed: () => updateProv.checkForUpdates(context: context, manual: true, locale: locale),
                icon: updateProv.isChecking
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.system_update),
                label: Text(
                  {
                    'ro': 'Verifică Actualizări',
                    'en': 'Check for Updates',
                    'nl': 'Controleer op updates',
                    'de': 'Nach Updates suchen',
                    'fr': 'Vérifier les mises à jour',
                    'es': 'Buscar Actualizaciones',
                    'pl': 'Sprawdź aktualizacje',
                  }[locale] ?? 'Check for Updates',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blueAccent,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: () {
              auth.logout();
              Navigator.pushReplacementNamed(context, '/login');
            },
            icon: const Icon(Icons.logout),
            label: Text({'ro':'Deconectare','en':'Logout','nl':'Uitloggen','de':'Abmelden','fr':'Déconnexion', 'es': 'Cerrar sesión', 'pl': 'Wyloguj' }[locale] ?? 'Logout'),
            style: ElevatedButton.styleFrom(
              backgroundColor: kError,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              '${{'ro': 'Versiunea aplicației: ', 'en': 'App Version: ', 'nl': 'App Versie: ', 'de': 'App Version: ', 'fr': 'Version de l\'application: ', 'es': 'Versión de la app: ', 'pl': 'Wersja aplikacji: ' }[locale] ?? 'App Version: '}$kAppVersionCode',
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
          const SizedBox(height: 24),
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
            , 'es': 'Cambiar contraseña', 'pl': 'Zmień hasło' }[locale] ?? 'Change Password',
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
                      , 'es': 'Contraseña anterior', 'pl': 'Stare hasło' }[locale] ?? 'Old password',
                      prefixIcon: const Icon(Icons.lock_outline, size: 20),
                    ),
                    validator: (v) => (v == null || v.isEmpty)
                        ? ({
                            'ro': 'Introduceți parola veche',
                            'en': 'Enter old password',
                            'nl': 'Voer oud wachtwoord in',
                            'de': 'Geben Sie das alte Passwort ein',
                            'fr': 'Entrez l\'ancien mot de passe'
                          , 'es': 'Introduce tu contraseña anterior', 'pl': 'Wprowadź stare hasło' }[locale] ?? 'Enter old password')
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
                      , 'es': 'Contraseña nueva', 'pl': 'Nowe hasło' }[locale] ?? 'New password',
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
                        , 'es': 'Mínimo 6 caracteres', 'pl': 'Minimum 6 znaków' }[locale] ?? 'Minimum 6 characters';
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
                      , 'es': 'Confirmar la contraseña nueva', 'pl': 'Potwierdź nowe hasło' }[locale] ?? 'Confirm new password',
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
                        , 'es': 'Las contraseñas no coinciden', 'pl': 'Hasła nie są zgodne' }[locale] ?? 'Passwords do not match';
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
                , 'es': 'Cancelar', 'pl': 'Anuluj' }[locale] ?? 'Cancel',
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
                            SnackBar(content: Text({'ro': 'Eroare: $err', 'en': 'Error: $err', 'nl': 'Fout: $err', 'de': 'Fehler: $err', 'fr': 'Erreur: $err', 'es': 'Error: $err', 'pl': 'Błąd: $err' }[locale] ?? err), backgroundColor: kError),
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
                              , 'es': '¡Contraseña cambiada!', 'pl': 'Hasło zostało zmienione!' }[locale] ?? 'Password changed successfully!'),
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
                      , 'es': 'Cambiar', 'pl': 'Zmień' }[locale] ?? 'Change',
                      style: const TextStyle(color: Colors.white),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
