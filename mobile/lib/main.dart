import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/trip_provider.dart';
import 'providers/chat_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';
import 'utils/constants.dart';
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
    try {
      await flagFile.create();
    } catch (_) {}
  }

  // NotificationService.init() will internally sync the FCM token to server
  await NotificationService().init();
  await BackgroundLocationService.initialize();
  runApp(HapCargoApp(prefs: prefs));
}

class HapCargoApp extends StatelessWidget {
  final SharedPreferences prefs;
  const HapCargoApp({super.key, required this.prefs});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(prefs)),
        ChangeNotifierProvider(create: (_) => TripProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (ctx, auth, _) => MaterialApp(
          title: 'HapCargo Driver',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.theme,
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
        ),
      ),
    );
  }
}
