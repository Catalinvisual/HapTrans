import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import '../widgets/language_dropdown.dart';
import 'package:dio/dio.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController(text: '');
  final _passCtrl = TextEditingController(text: '');
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final locale = context.watch<AuthProvider>().locale.languageCode;

    final labels = {
      'ro': {'title': 'Bun venit!', 'sub': 'Autentifică-te pentru a continua', 'email': 'Email', 'pass': 'Parolă', 'btn': 'Autentifică-te', 'err': 'Email sau parolă incorectă'},
      'en': {'title': 'Welcome!', 'sub': 'Sign in to continue', 'email': 'Email', 'pass': 'Password', 'btn': 'Sign In', 'err': 'Invalid email or password'},
      'nl': {'title': 'Welkom!', 'sub': 'Log in om verder te gaan', 'email': 'E-mail', 'pass': 'Wachtwoord', 'btn': 'Inloggen', 'err': 'Ongeldig e-mail of wachtwoord'},
      'de': {'title': 'Willkommen!', 'sub': 'Melden Sie sich an, um fortzufahren', 'email': 'E-Mail', 'pass': 'Passwort', 'btn': 'Einloggen', 'err': 'Ungültige E-Mail-Adresse oder Passwort'},
      'fr': {'title': 'Bienvenue !', 'sub': 'Connectez-vous pour continuer', 'email': 'E-mail', 'pass': 'Mot de passe', 'btn': 'Se connecter', 'err': 'E-mail ou mot de passe incorrect'},
    };
    final l = labels[locale] ?? labels['ro']!;

    return Scaffold(
      backgroundColor: kSurface,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              // Logo
              Center(
                child: Image.asset(
                  'assets/images/footer-logo.png',
                  height: 80,
                  fit: BoxFit.contain,
                  errorBuilder: (c, e, s) => Container(
                    width: 80, height: 80,
                    decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(20)),
                    child: const Icon(Icons.local_shipping_rounded, color: Colors.white, size: 44),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(l['title']!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: kText)),
              const SizedBox(height: 8),
              Text(l['sub']!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 15, color: kTextSecondary)),
              const SizedBox(height: 40),

              // Language switcher
              const Center(child: LanguageDropdown()),
              const SizedBox(height: 32),

              // Email
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: l['email'],
                  prefixIcon: const Icon(Icons.email_outlined, color: kTextSecondary),
                ),
              ),
              const SizedBox(height: 16),

              // Password
              TextFormField(
                controller: _passCtrl,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: l['pass'],
                  prefixIcon: const Icon(Icons.lock_outline, color: kTextSecondary),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: kTextSecondary),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
                  child: Text(_error!, style: const TextStyle(color: kError, fontSize: 13)),
                ),
              ],

              const SizedBox(height: 24),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : () async {
                    setState(() { _loading = true; _error = null; });
                    final errorMsg = await auth.login(_emailCtrl.text.trim(), _passCtrl.text);
                    if (errorMsg == null && mounted) {
                      Navigator.pushReplacementNamed(context, '/main');
                    } else if (mounted) {
                      setState(() { _loading = false; _error = errorMsg; });
                    }
                  },
                  child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(l['btn']!, style: const TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
