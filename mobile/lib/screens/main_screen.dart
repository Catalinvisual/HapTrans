import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'dart:io';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../providers/chat_provider.dart';
import '../utils/constants.dart';
import '../utils/trip_status.dart';
import '../services/notification_service.dart';
import '../services/background_location_service.dart';
import 'home_screen.dart';
import 'trips_screen.dart';
import 'tachograph_screen.dart';
import 'documents_screen.dart';
import 'profile_screen.dart';
import '../providers/update_provider.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> with WidgetsBindingObserver {
  int _selectedIndex = 0;
  Timer? _pollingTimer;
  Timer? _updateTimer;
  StreamSubscription<Position>? _gpsSubscription;
  bool _isAutoTracking = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final tripProv = context.read<TripProvider>();
      final chatProv = context.read<ChatProvider>();

      _checkAndRequestPermissions();

      // Check for updates shortly after startup
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          context.read<UpdateProvider>().checkForUpdates(
            context: context,
            autoPrompt: true,
            locale: auth.locale.languageCode,
          );
        }
      });

      // Periodically check for updates while the app is actively used (every 2 minutes)
      _updateTimer = Timer.periodic(const Duration(minutes: 2), (_) {
        if (mounted) {
          context.read<UpdateProvider>().checkForUpdates(
            context: context,
            autoPrompt: true,
            locale: auth.locale.languageCode,
          );
        }
      });

      tripProv.addListener(() {
        if (mounted) {
          _updateAutomaticTracking(auth, tripProv, chatProv);
        }
      });

      if (auth.token != null) {
        tripProv.loadTrips(auth.token!).then((_) {
          if (tripProv.error == '401' || (tripProv.error != null && tripProv.error!.contains('401'))) {
            auth.logout();
            Navigator.pushReplacementNamed(context, '/login');
            return;
          }
          if (mounted) {
            _updateAutomaticTracking(auth, tripProv, chatProv);
          }
        });
        chatProv.connectGlobal(auth.token!, auth.user?['id'] ?? '', locale: auth.locale.languageCode);
        
        _pollingTimer = Timer.periodic(const Duration(seconds: 8), (timer) {
          if (mounted && auth.token != null) {
            tripProv.silentReloadTrips(auth.token!).then((_) {
              if (tripProv.error == '401' || (tripProv.error != null && tripProv.error!.contains('401'))) {
                auth.logout();
                Navigator.pushReplacementNamed(context, '/login');
                return;
              }
              if (mounted) {
                _updateAutomaticTracking(auth, tripProv, chatProv);
              }
            });
          }
        });
        
        _syncFcmNow(auth);
        Timer.periodic(const Duration(seconds: 30), (t) {
          if (!mounted) { t.cancel(); return; }
          _syncFcmNow(auth);
        });
      }
    });
  }

  Future<void> _checkAndRequestPermissions() async {
    if (!mounted) return;
    try {
      await Future.delayed(const Duration(milliseconds: 1000));
      if (!mounted) return;

      var status = await Permission.location.status;
      bool requested = false;
      if (!status.isGranted) {
        status = await Permission.location.request();
        requested = true;
        if (!status.isGranted) {
          return;
        }
      }
      
      if (requested) {
        await Future.delayed(const Duration(milliseconds: 1000));
      }
      
      if (mounted) {
        await BackgroundLocationService.requestAlwaysLocationPermission(context);
      }
    } catch (e) {
      debugPrint('Error checking permissions on startup: $e');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollingTimer?.cancel();
    _updateTimer?.cancel();
    _gpsSubscription?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      final auth = context.read<AuthProvider>();
      context.read<UpdateProvider>().checkForUpdates(
        context: context,
        autoPrompt: true,
        locale: auth.locale.languageCode,
      );
    }
  }

  void _updateAutomaticTracking(AuthProvider auth, TripProvider tripProv, ChatProvider chatProv) {
    final activeTrip = tripProv.trips.firstWhere(
      (t) => isActiveTripStatus(t['status']),
      orElse: () => <String, dynamic>{},
    );

    final bool shouldTrack = activeTrip.isNotEmpty;

    if (shouldTrack && !_isAutoTracking) {
      _isAutoTracking = true;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        try {
          final granted = await BackgroundLocationService.requestAlwaysLocationPermission(context);
          if (!granted) {
            setState(() => _isAutoTracking = false);
            return;
          }

          String? activeTruckId;
          if (activeTrip['truck'] != null) {
            activeTruckId = activeTrip['truck']['id'];
          }

          await BackgroundLocationService.start(
            token: auth.token!,
            userId: auth.user!['id'],
            truckId: activeTruckId,
          );
        } catch (e) {
          debugPrint('Error starting auto-tracking: $e');
          setState(() => _isAutoTracking = false);
        }
      });
    } else if (!shouldTrack && _isAutoTracking) {
      _isAutoTracking = false;
      BackgroundLocationService.stop();
    }
  }

  void _syncFcmNow(AuthProvider auth) {
    final notif = NotificationService();
    if (notif.fcmToken != null) {
      auth.syncFcmTokenValue(notif.fcmToken!);
    } else {
      auth.syncFcmToken();
    }
    notif.onTokenReady = (token) => auth.syncFcmTokenValue(token);
  }


  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final locale = auth.locale.languageCode;

    final screens = const [
      HomeScreen(),
      TripsScreen(),
      TachographScreen(),
      DocumentsScreen(),
      ProfileScreen(),
    ];

    final labels = {
      'ro': ['Acasă', 'Curse', 'Tahograf', 'Documente', 'Profil'],
      'en': ['Home', 'Trips', 'Tachograph', 'Documents', 'Profile'],
      'nl': ['Home', 'Ritten', 'Tachograaf', 'Documenten', 'Profiel'],
      'de': ['Home', 'Touren', 'Tachograph', 'Dokumente', 'Profil'],
      'fr': ['Accueil', 'Courses', 'Tachygraphe', 'Documents', 'Profil'],
     'es': ['Inicio', 'Rutas', 'Tacógrafo', 'Documentos', 'Perfil'], 'pl': ['Dom', 'Kursy', 'Tachograf', 'Dokumenty', 'Profil'] };
    final nav = labels[locale] ?? labels['en'] ?? labels['ro']!;

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) {
          setState(() => _selectedIndex = i);
        },
        backgroundColor: kCard,
        indicatorColor: kPrimaryLight,
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home, color: kPrimary), label: nav[0]),
          NavigationDestination(icon: const Icon(Icons.route_outlined), selectedIcon: const Icon(Icons.route, color: kPrimary), label: nav[1]),
          NavigationDestination(icon: const Icon(Icons.timer_outlined), selectedIcon: const Icon(Icons.timer, color: kPrimary), label: nav[2]),
          NavigationDestination(icon: const Icon(Icons.description_outlined), selectedIcon: const Icon(Icons.description, color: kPrimary), label: nav[3]),
          NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person, color: kPrimary), label: nav[4]),
        ],
      ),
    );
  }
}
