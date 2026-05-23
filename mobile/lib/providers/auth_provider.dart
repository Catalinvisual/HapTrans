import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../utils/constants.dart';
import '../services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  String? _token;
  Map<String, dynamic>? _user;
  Locale _locale = const Locale('ro');

  AuthProvider(this._prefs) {
    _token = _prefs.getString('token');
    final lang = _prefs.getString('lang') ?? 'ro';
    _locale = Locale(lang);
    final userJson = _prefs.getString('user');
    if (userJson != null) {
      _user = {'name': _prefs.getString('userName'), 'id': _prefs.getString('userId'), 'role': _prefs.getString('userRole')};
    }
  }

  bool get isLoggedIn => _token != null;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  Locale get locale => _locale;

  /// Syncs whichever FCM token NotificationService currently has
  Future<void> syncFcmToken() async {
    final fcmToken = NotificationService().fcmToken;
    if (fcmToken != null) {
      await syncFcmTokenValue(fcmToken);
    }
  }

  /// Syncs a specific FCM token value to the backend via /auth/fcm-token
  Future<void> syncFcmTokenValue(String fcmToken) async {
    if (_token == null) return;
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));
      await dio.post(
        '$kApiUrl/auth/fcm-token',
        data: {'fcmToken': fcmToken},
        options: Options(headers: {'Authorization': 'Bearer $_token'}),
      );
      debugPrint('✅ FCM Token synced to /auth/fcm-token: ${fcmToken.substring(0, 20)}...');
    } catch (e) {
      // Fallback: try PATCH /users/:id
      try {
        if (_user?['id'] != null) {
          final dio = Dio();
          await dio.patch(
            '$kApiUrl/users/${_user!['id']}',
            data: {'fcmToken': fcmToken},
            options: Options(headers: {'Authorization': 'Bearer $_token'}),
          );
          debugPrint('✅ FCM Token synced via PATCH users fallback');
        }
      } catch (e2) {
        debugPrint('❌ FCM token sync failed: $e2');
      }
    }
  }

  Future<String?> login(String email, String password) async {
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      ));
      final res = await dio.post('$kApiUrl/auth/login', data: {'email': email, 'password': password});
      _token = res.data['access_token'];
      _user = res.data['user'];
      await _prefs.setString('token', _token!);
      await _prefs.setString('user', 'saved');
      await _prefs.setString('userId', _user!['id']);
      await _prefs.setString('userName', _user!['name']);
      await _prefs.setString('userRole', _user!['role']);
      notifyListeners();

      // userId is now in prefs - trigger FCM token sync
      // NotificationService will use the new userId and token from prefs
      final notif = NotificationService();
      if (notif.fcmToken != null) {
        // Token already available, sync now
        await syncFcmTokenValue(notif.fcmToken!);
      }
      // The onTokenRefresh listener in NotificationService will also handle future syncs

      return null; // Null means success
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        return _locale.languageCode == 'ro'
            ? 'Eroare conexiune: Nu se poate contacta laptopul. Verificați dacă laptopul și telefonul sunt pe aceeași rețea Wi-Fi și că firewall-ul permite portul 3001! (IP: 192.168.2.7)'
            : 'Connection Error: Cannot reach the laptop. Verify that both phone and laptop are on the same Wi-Fi and that the firewall allows port 3001! (IP: 192.168.2.7)';
      }
      if (e.response?.statusCode == 401) {
        return _locale.languageCode == 'ro' ? 'Email sau parolă incorectă' : 'Invalid email or password';
      }
      return e.message ?? 'Unknown error';
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> changePassword(String oldPassword, String newPassword) async {
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
        headers: {
          'Authorization': 'Bearer $_token',
        },
      ));
      await dio.post('$kApiUrl/auth/change-password', data: {
        'oldPassword': oldPassword,
        'newPassword': newPassword,
      });
      return null; // Null means success
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        return {
          'ro': 'Parola veche este incorectă',
          'en': 'Old password is incorrect',
          'nl': 'Oud wachtwoord is onjuist',
          'de': 'Altes Passwort ist falsch',
          'fr': 'L\'ancien mot de passe est incorrect'
        }[_locale.languageCode] ?? 'Old password is incorrect';
      }
      return e.response?.data?['message']?.toString() ?? e.message ?? 'Unknown error';
    } catch (e) {
      return e.toString();
    }
  }

  void logout() {
    _token = null;
    _user = null;
    _prefs.remove('token');
    _prefs.remove('user');
    notifyListeners();
  }

  void setLocale(String code) {
    _locale = Locale(code);
    _prefs.setString('lang', code);
    notifyListeners();
  }
}
