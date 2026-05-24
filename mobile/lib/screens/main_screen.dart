import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:badges/badges.dart' as badges;
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../providers/chat_provider.dart';
import '../utils/constants.dart';
import '../services/notification_service.dart';
import '../services/background_location_service.dart';
import 'trips_screen.dart';
import 'map_screen.dart';
import 'documents_screen.dart';
import 'chat_screen.dart';
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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final tripProv = context.read<TripProvider>();
      final chatProv = context.read<ChatProvider>();

      tripProv.addListener(() {
        if (mounted) {
          _updateAutomaticTracking(auth, tripProv, chatProv);
        }
      });

      if (auth.token != null) {
        tripProv.loadTrips(auth.token!).then((_) {
          if (tripProv.error == '401') {
            auth.logout();
            return;
          }
          if (mounted) {
            _updateAutomaticTracking(auth, tripProv, chatProv);
          }
        });
        chatProv.connectGlobal(auth.token!, auth.user?['id'] ?? '', locale: auth.locale.languageCode);
        
        // Start polling every 8 seconds silently for real-time trip additions!
        _pollingTimer = Timer.periodic(const Duration(seconds: 8), (timer) {
          if (mounted && auth.token != null) {
            tripProv.silentReloadTrips(auth.token!).then((_) {
              if (tripProv.error == '401') {
                auth.logout();
                return;
              }
              if (mounted) {
                _updateAutomaticTracking(auth, tripProv, chatProv);
              }
            });
          }
        });
        
        // Sync FCM token immediately and keep trying every 30s until it works
        _syncFcmNow(auth);
        Timer.periodic(const Duration(seconds: 30), (t) {
          if (!mounted) { t.cancel(); return; }
          _syncFcmNow(auth);
        });
      }
    });
  }

  void _updateAutomaticTracking(AuthProvider auth, TripProvider tripProv, ChatProvider chatProv) async {
    // Check if there is an active (in_progress) or confirmed trip
    final activeTrip = tripProv.trips.firstWhere(
      (t) => t['status'] == 'in_progress',
      orElse: () => tripProv.trips.firstWhere(
        (t) => t['status'] == 'confirmed',
        orElse: () => <String, dynamic>{},
      ),
    );

    final bool shouldTrack = activeTrip.isNotEmpty;

    if (shouldTrack && !_isAutoTracking) {
      _isAutoTracking = true;
      try {
        if (mounted) {
          final granted = await BackgroundLocationService.requestAlwaysLocationPermission(context);
          if (!granted) {
            _isAutoTracking = false;
            return;
          }
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
        _isAutoTracking = false;
      }
    } else if (!shouldTrack && _isAutoTracking) {
      _isAutoTracking = false;
      await BackgroundLocationService.stop();
    }
  }

  void _syncFcmNow(AuthProvider auth) {
    final notif = NotificationService();
    if (notif.fcmToken != null) {
      auth.syncFcmTokenValue(notif.fcmToken!);
    } else {
      auth.syncFcmToken();
    }
    // Always (re)register the callback in case it was overwritten
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
    final chat = context.watch<ChatProvider>();
    final driverId = auth.user?['id'] ?? '';
    final token = auth.token ?? '';
    final locale = auth.locale.languageCode;

    final screens = [
      const TripsScreen(),
      const MapScreen(),
      const DocumentsScreen(),
      ChatScreen(
        trip: {
          'id': 'driver_$driverId',
          'client': const {'name': 'Dispecerat'},
        },
        token: token,
        locale: locale,
        isDirectDriverChat: true,
      ),
      const ProfileScreen(),
    ];

    final labels = {
      'ro': ['Curse', 'Hartă', 'Documente', 'Chat', 'Profil'],
      'en': ['Trips', 'Map', 'Documents', 'Chat', 'Profile'],
      'nl': ['Ritten', 'Kaart', 'Documenten', 'Chat', 'Profiel'],
      'de': ['Fahrten', 'Karte', 'Dokumente', 'Chat', 'Profil'],
      'fr': ['Courses', 'Carte', 'Documents', 'Chat', 'Profil'],
    };
    final nav = labels[locale] ?? labels['ro']!;

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) {
          setState(() => _selectedIndex = i);
          if (i == 3) {
            context.read<ChatProvider>().setChatScreenActive(true);
          } else {
            context.read<ChatProvider>().setChatScreenActive(false);
          }
        },
        backgroundColor: kCard,
        indicatorColor: kPrimaryLight,
        destinations: [
          NavigationDestination(icon: const Icon(Icons.route_outlined), selectedIcon: const Icon(Icons.route, color: kPrimary), label: nav[0]),
          NavigationDestination(icon: const Icon(Icons.map_outlined), selectedIcon: const Icon(Icons.map, color: kPrimary), label: nav[1]),
          NavigationDestination(icon: const Icon(Icons.description_outlined), selectedIcon: const Icon(Icons.description, color: kPrimary), label: nav[2]),
          NavigationDestination(
            icon: badges.Badge(
              showBadge: chat.unreadCount > 0,
              badgeContent: Text('${chat.unreadCount}', style: const TextStyle(color: Colors.white, fontSize: 10)),
              child: const Icon(Icons.chat_outlined),
            ),
            selectedIcon: const Icon(Icons.chat, color: kPrimary),
            label: nav[3],
          ),
          NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person, color: kPrimary), label: nav[4]),
        ],
      ),
    );
  }
}
