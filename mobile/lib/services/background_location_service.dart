import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import '../utils/constants.dart';

class BackgroundLocationService {
  static Future<bool> requestAlwaysLocationPermission(BuildContext context) async {
    // 1. Request foreground permission first
    var status = await Permission.location.status;
    if (!status.isGranted) {
      status = await Permission.location.request();
      if (!status.isGranted) {
        return false;
      }
    }

    // 2. Request background permission
    var alwaysStatus = await Permission.locationAlways.status;
    if (!alwaysStatus.isGranted) {
      final locale = Localizations.localeOf(context).languageCode;
      
      final Map<String, Map<String, String>> translations = {
        'ro': {
          'title': 'Permisiune Locație Fundal',
          'content': 'Pentru a monitoriza corect camionul când aplicația este închisă sau ecranul este stins, te rugăm ca pe ecranul următor să selectezi opțiunea:\n\n→ „Permiteți tot timpul”',
          'button': 'OK',
        },
        'en': {
          'title': 'Background Location Permission',
          'content': 'To monitor the truck correctly when the app is closed or the screen is off, please select the following option on the next screen:\n\n→ "Allow all the time"',
          'button': 'OK',
        },
        'nl': {
          'title': 'Locatiepermissie op de achtergrond',
          'content': 'Om de vrachtwagen correct te volgen wanneer de app gesloten is of het scherm uit staat, selecteert u de volgende optie in het volgende scherm:\n\n→ "Altijd toestaan"',
          'button': 'OK',
        },
        'de': {
          'title': 'Hintergrund-Standortberechtigung',
          'content': 'Um den Lkw korrekt zu überwachen, wenn die App geschlossen oder der Bildschirm ausgeschaltet ist, wählen Sie bitte auf dem nächsten Bildschirm folgende Option:\n\n→ "Immer zulassen"',
          'button': 'OK',
        },
        'fr': {
          'title': 'Autorisation de localisation en arrière-plan',
          'content': 'Pour suivre correctement le camion lorsque l\'application est fermée ou que l\'écran est éteint, veuillez sélectionner l\'option suivante sur l\'écran suivant :\n\n→ "Toujours autoriser"',
          'button': 'OK',
        },
      };

      final lang = translations.containsKey(locale) ? locale : 'en';
      final titleText = translations[lang]!['title']!;
      final contentText = translations[lang]!['content']!;
      final buttonText = translations[lang]!['button']!;

      // Show explanation dialog first so they know why they are being redirected
      if (context.mounted) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: Text(titleText),
            content: Text(contentText),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: Text(buttonText),
              ),
            ],
          ),
        );
      }
      
      alwaysStatus = await Permission.locationAlways.request();
    }

    return alwaysStatus.isGranted;
  }

  static Future<void> initialize() async {
    final service = FlutterBackgroundService();

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'haptrans_location_service',
        initialNotificationTitle: 'HapTrans - Tracking Activ',
        initialNotificationContent: 'Locația ta este monitorizată pentru dispecerat în timpul cursei.',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  static Future<void> start({required String token, required String userId, String? truckId}) async {
    // Save to SharedPreferences so background isolate can read it
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('userId', userId);
    if (truckId != null) {
      await prefs.setString('truckId', truckId);
    } else {
      await prefs.remove('truckId');
    }

    final service = FlutterBackgroundService();
    final isRunning = await service.isRunning();
    if (!isRunning) {
      await service.startService();
    } else {
      // If already running, notify service about param updates
      service.invoke('updateParams', {
        'token': token,
        'userId': userId,
        'truckId': truckId,
      });
    }
  }

  static Future<void> stop() async {
    final service = FlutterBackgroundService();
    final isRunning = await service.isRunning();
    if (isRunning) {
      service.invoke("stopService");
    }
  }
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  Timer? timer;

  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });

    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }

  service.on('stopService').listen((event) {
    timer?.cancel();
    service.stopSelf();
  });

  service.on('updateParams').listen((event) async {
    if (event != null) {
      final prefs = await SharedPreferences.getInstance();
      if (event['token'] != null) await prefs.setString('token', event['token']);
      if (event['userId'] != null) await prefs.setString('userId', event['userId']);
      if (event['truckId'] != null) {
        await prefs.setString('truckId', event['truckId']);
      } else {
        await prefs.remove('truckId');
      }
    }
  });

  // Start periodic tracking
  timer = Timer.periodic(const Duration(seconds: 15), (t) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userId = prefs.getString('userId');
      final truckId = prefs.getString('truckId');

      if (token == null || userId == null) {
        timer?.cancel();
        service.stopSelf();
        return;
      }

      // Check permissions
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );

      // Send to server via HTTP POST
      final dio = Dio(BaseOptions(
        baseUrl: kApiUrl,
        headers: {'Authorization': 'Bearer $token'},
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      ));

      await dio.post('/location', data: {
        'driverId': userId,
        'truckId': truckId,
        'lat': position.latitude,
        'lng': position.longitude,
      });

      if (service is AndroidServiceInstance) {
        service.setNotificationInfo(
          title: "HapTrans - Tracking Activ",
          content: "Locația ta este monitorizată pentru dispecerat în timpul cursei.",
        );
      }
    } catch (e) {
      debugPrint('Background location update error: $e');
    }
  });
}
