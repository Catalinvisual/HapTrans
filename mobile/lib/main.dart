import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/trip_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/update_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';
import 'services/session_manager.dart';
import 'utils/app_theme.dart';
import 'l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'services/notification_service.dart';
import 'services/background_location_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Clear preferences on fresh installation (ignore Android Auto-Backup data)
  final tempDir = await getTemporaryDirectory();
  final flagFile = File('${tempDir.path}/.has_run');
  final prefs = await SharedPreferences.getInstance();
  if (!await flagFile.exists()) {
    await prefs.clear();
    await SessionManager.instance.clear();
    try {
      await flagFile.create();
    } catch (_) {}
  }

  // NotificationService.init() will internally sync the FCM token to server
  await NotificationService().init();
  await BackgroundLocationService.initialize();

  // Restore the persisted session (secure storage) before the first frame, so
  // a driver who opens the app is taken straight to the trip list.
  final auth = AuthProvider(prefs);
  await auth.restore();

  runApp(HapCargoApp(prefs: prefs, auth: auth));
}

class HapCargoApp extends StatefulWidget {
  final SharedPreferences prefs;
  final AuthProvider auth;

  const HapCargoApp({super.key, required this.prefs, required this.auth});

  @override
  State<HapCargoApp> createState() => _HapCargoAppState();
}

class _HapCargoAppState extends State<HapCargoApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    // An expired/revoked refresh token closes the session from anywhere in the
    // app and returns the driver to login, without an infinite retry loop.
    widget.auth.onSessionEnded = _showLogin;
  }

  @override
  void dispose() {
    if (widget.auth.onSessionEnded == _showLogin) {
      widget.auth.onSessionEnded = null;
    }
    super.dispose();
  }

  void _showLogin() {
    final navigator = _navigatorKey.currentState;
    if (navigator == null) return;
    navigator.pushNamedAndRemoveUntil('/login', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: widget.auth),
        ChangeNotifierProvider(create: (_) => ThemeProvider(widget.prefs)),
        ChangeNotifierProvider(create: (_) => TripProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => UpdateProvider()),
      ],
      child: Consumer2<AuthProvider, ThemeProvider>(
        builder: (ctx, auth, theme, _) {
          AppTheme.activate(theme.effectiveBrightness);
          return MaterialApp(
          navigatorKey: _navigatorKey,
          title: 'HapCargo Driver',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: theme.mode,
          themeAnimationDuration: const Duration(milliseconds: 220),
          locale: auth.locale,
          supportedLocales: const [
            Locale('ro'),
            Locale('en'),
            Locale('nl'),
            Locale('de'),
            Locale('fr'),
            Locale('es'),
            Locale('pl'),
          ],
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: auth.isLoggedIn ? const MainScreen() : const LoginScreen(),
          routes: {
            '/login': (_) => const LoginScreen(),
            '/main': (_) => const MainScreen(),
          },
          );
        },
      ),
    );
  }
}
