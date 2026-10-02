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

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  Timer? _pollingTimer;
  StreamSubscription<Position>? _gpsSubscription;
  bool _isAutoTracking = false;
  bool _checkedForUpdate = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final tripProv = context.read<TripProvider>();
      final chatProv = context.read<ChatProvider>();

      _checkAndRequestPermissions();
      _checkForUpdate(auth.locale.languageCode);

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

  Future<void> _checkForUpdate(String locale) async {
    if (_checkedForUpdate) return;
    _checkedForUpdate = true;
    try {
      final res = await Dio().get('$kApiUrl/auth/app-version');
      final data = res.data;
      final serverVersion = data['versionCode'] ?? 0;
      if (serverVersion > kAppVersionCode) {
        if (!mounted) return;
        final msg = data['message']?[locale] ?? data['message']?['en'] ?? 'O nouă versiune este disponibilă! Vă rugăm să actualizați.';
        final url = data['url'];
        
        showDialog(
          context: context,
          barrierDismissible: !(data['mandatory'] ?? false),
          builder: (ctx) => AlertDialog(
            title: Text({
              'ro': 'Actualizare Disponibilă',
              'en': 'Update Available',
              'nl': 'Update beschikbaar',
              'de': 'Update verfügbar',
              'fr': 'Mise à jour disponible'
            }[locale] ?? 'Update Available'),
            content: Text(msg),
            actions: [
              if (!(data['mandatory'] ?? false))
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text({
                    'ro': 'Mai târziu',
                    'en': 'Later',
                    'nl': 'Later',
                    'de': 'Später',
                    'fr': 'Plus tard'
                  }[locale] ?? 'Later'),
                ),
              ElevatedButton(
                onPressed: () {
                  if (url != null) {
                    Navigator.pop(ctx);
                    _downloadAndInstallUpdate(url, locale);
                  }
                },
                child: Text({
                  'ro': 'Descarcă Acum',
                  'en': 'Download Now',
                  'nl': 'Nu downloaden',
                  'de': 'Jetzt herunterladen',
                  'fr': 'Télécharger'
                }[locale] ?? 'Download Now'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint('Failed to check for updates: $e');
    }
  }

  Future<void> _downloadAndInstallUpdate(String url, String locale) async {
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
      
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context); // Close downloading dialog
      }
      await OpenFilex.open(filePath);
    } catch (e) {
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Eroare descărcare: $e'), backgroundColor: Colors.red),
        );
      }
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
  void dispose() {
    _pollingTimer?.cancel();
    _gpsSubscription?.cancel();
    super.dispose();
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
    };
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
