import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'dart:io';

const _kApiUrl = 'http://192.168.2.7:3001/api';

/// Background handler - MUST be top-level, MUST have @pragma annotation
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();

  final plugin = FlutterLocalNotificationsPlugin();
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  await plugin.initialize(const InitializationSettings(android: androidSettings));

  // Re-create channel in background isolate
  const channel = AndroidNotificationChannel(
    'haptrans_channel_id',
    'HapTrans Notifications',
    description: 'Notifications for trips and messages',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );
  await plugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  final title = message.notification?.title ?? message.data['title'] ?? 'HapTrans';
  final body = message.notification?.body ?? message.data['body'] ?? '';

  if (title.isNotEmpty || body.isNotEmpty) {
    await plugin.show(
      message.hashCode,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'haptrans_channel_id',
          'HapTrans Notifications',
          channelDescription: 'Notifications for trips and messages',
          importance: Importance.max,
          priority: Priority.high,
          playSound: true,
          enableVibration: true,
          icon: '@mipmap/ic_launcher',
        ),
      ),
    );
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  String? fcmToken;
  Function(String token)? onTokenReady;

  Future<void> init() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );

    if (Platform.isAndroid) {
      await Permission.notification.request();

      const channel = AndroidNotificationChannel(
        'haptrans_channel_id',
        'HapTrans Notifications',
        description: 'Notifications for trips and messages',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        enableLights: true,
      );
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }

    try {
      await Firebase.initializeApp();

      // MUST be registered right after initializeApp
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      final messaging = FirebaseMessaging.instance;

      await messaging.requestPermission(
        alert: true, badge: true, sound: true, criticalAlert: true,
      );

      await messaging.setForegroundNotificationPresentationOptions(
        alert: true, badge: true, sound: true,
      );

      // Get token and sync immediately
      fcmToken = await messaging.getToken();
      if (fcmToken != null) {
        await _syncTokenToServer(fcmToken!);
        onTokenReady?.call(fcmToken!);
      }

      // Listen for token refresh
      messaging.onTokenRefresh.listen((newToken) async {
        fcmToken = newToken;
        await _syncTokenToServer(newToken);
        onTokenReady?.call(newToken);
      });

      // Foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        final title = message.notification?.title ?? message.data['title'] ?? 'HapTrans';
        final body = message.notification?.body ?? message.data['body'] ?? '';
        if (title.isNotEmpty || body.isNotEmpty) {
          showNotification(id: message.hashCode, title: title, body: body);
        }
      });

      // App opened from notification tap (background)
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        // Could navigate to specific screen here
      });

    } catch (e) {
      print('Firebase init error: $e');
    }
  }

  /// Syncs FCM token directly to server using stored prefs (no JWT needed via public endpoint)
  Future<void> _syncTokenToServer(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId');
      if (userId == null) {
        print('FCM sync: no userId in prefs yet, will sync on login');
        return;
      }

      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));

      // Try authenticated endpoint first
      final savedToken = prefs.getString('token');
      if (savedToken != null) {
        try {
          await dio.post(
            '$_kApiUrl/auth/fcm-token',
            data: {'fcmToken': token},
            options: Options(headers: {'Authorization': 'Bearer $savedToken'}),
          );
          print('✅ FCM Token synced via /auth/fcm-token');
          return;
        } catch (_) {}
      }

      // Fallback: public endpoint (no JWT required)
      await dio.post(
        '$_kApiUrl/auth/fcm-token-public',
        data: {'userId': userId, 'fcmToken': token},
      );
      print('✅ FCM Token synced via /auth/fcm-token-public');
    } catch (e) {
      print('❌ FCM sync failed: $e');
    }
  }

  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'haptrans_channel_id',
      'HapTrans Notifications',
      channelDescription: 'Notifications for trips and messages',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      playSound: true,
      enableVibration: true,
      icon: '@mipmap/ic_launcher',
    );
    await _plugin.show(id, title, body, const NotificationDetails(android: androidDetails));
  }
}
