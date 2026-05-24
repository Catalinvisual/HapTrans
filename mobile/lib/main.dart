import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
  final prefs = await SharedPreferences.getInstance();
  // NotificationService.init() will internally sync the FCM token to server
  await NotificationService().init();
  await BackgroundLocationService.initialize();
  runApp(HapTransApp(prefs: prefs));
}

class HapTransApp extends StatelessWidget {
  final SharedPreferences prefs;
  const HapTransApp({super.key, required this.prefs});

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
          title: 'HapTrans Driver',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.theme,
          locale: auth.locale,
          supportedLocales: const [
            Locale('ro'),
            Locale('en'),
            Locale('nl'),
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
