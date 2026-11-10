import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../services/notification_service.dart';
import '../services/background_location_service.dart';
import '../services/session_manager.dart';
import '../services/api_client.dart';

/// Authentication state for the driver app.
///
/// The access token and the rotating refresh token live in [SessionManager]
/// (Android Keystore-backed secure storage). This provider only exposes the
/// session to the widget tree and syncs the non-sensitive driver profile.
class AuthProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  final SessionManager _session = SessionManager.instance;
  Map<String, dynamic>? _user;
  Locale _locale;
  VoidCallback? onSessionEnded;

  AuthProvider(this._prefs) : _locale = const Locale('ro') {
    final lang = _prefs.getString('lang') ?? 'ro';
    _locale = Locale(lang);
    final id = _prefs.getString('userId');
    if (id != null) {
      _user = {
        'name': _prefs.getString('userName'),
        'id': id,
        'role': _prefs.getString('userRole'),
      };
    }
    _session.addTokenListener(_onTokensChanged);
    _session.addSessionEndedListener(_onSessionEnded);
  }

  /// Restores the persisted session before the first frame. The driver stays
  /// signed in across app restarts and phone reboots while the refresh token
  /// is valid and the account is active.
  Future<void> restore() async {
    await _session.restore(_prefs);
    if (!_session.hasSession) _clearLocalUser();
  }

  bool get isLoggedIn => _session.accessToken != null;
  String? get token => _session.accessToken;
  Map<String, dynamic>? get user => _user;
  Locale get locale => _locale;

  void _onTokensChanged() {
    if (_session.accessToken != null) notifyListeners();
  }

  void _onSessionEnded() {
    _clearLocalUser();
    BackgroundLocationService.stop();
    notifyListeners();
    onSessionEnded?.call();
  }

  void _clearLocalUser() {
    _user = null;
    _prefs.remove('user');
    _prefs.remove('userId');
    _prefs.remove('userName');
    _prefs.remove('userRole');
    // Legacy plain-text token, migrated into secure storage on first launch.
    _prefs.remove('token');
  }

  /// Renews the access token now. Safe to call concurrently: SessionManager
  /// performs only one rotation at a time.
  Future<bool> refreshAccessToken() => _session.refresh();

  /// Syncs whichever FCM token NotificationService currently has
  Future<void> syncFcmToken() async {
    final fcmToken = NotificationService().fcmToken;
    if (fcmToken != null) {
      await syncFcmTokenValue(fcmToken);
    }
  }

  /// Syncs a specific FCM token value to the backend via /auth/fcm-token
  Future<void> syncFcmTokenValue(String fcmToken) async {
    if (!_session.hasSession) return;
    try {
      final dio = ApiClient.create(timeout: const Duration(seconds: 10));
      await dio.post(
        '/auth/fcm-token',
        data: {'fcmToken': fcmToken},
      );
      debugPrint('✅ FCM Token synced to /auth/fcm-token: ${fcmToken.substring(0, 20)}...');
    } catch (e) {
      // Fallback: try PATCH /users/:id
      try {
        if (_user?['id'] != null) {
          final dio = ApiClient.create(timeout: const Duration(seconds: 10));
          await dio.patch(
            '/users/${_user!['id']}',
            data: {'fcmToken': fcmToken},
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
      final dio = ApiClient.create(timeout: const Duration(seconds: 10));
      final res = await dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      final accessToken = res.data['access_token']?.toString();
      final refreshToken = res.data['refresh_token']?.toString();
      final user = res.data['user'];
      if (accessToken == null || accessToken.isEmpty || user is! Map) {
        return 'Unexpected server response';
      }

      await _session.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      _user = Map<String, dynamic>.from(user);
      await _prefs.setString('user', 'saved');
      await _prefs.setString('userId', _user!['id'].toString());
      await _prefs.setString('userName', _user!['name'].toString());
      await _prefs.setString('userRole', _user!['role'].toString());
      notifyListeners();

      // userId is now in prefs - trigger FCM token sync
      final notif = NotificationService();
      if (notif.fcmToken != null) {
        await syncFcmTokenValue(notif.fcmToken!);
      }

      return null; // Null means success
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        return _locale.languageCode == 'ro'
            ? 'Eroare conexiune: Nu se poate contacta serverul. Verificati conexiunea la internet!'
            : (_locale.languageCode == 'es'
                ? 'Error de conexión: No se puede contactar con el servidor. ¡Verifica tu conexión a internet!'
                : (_locale.languageCode == 'pl'
                    ? 'Błąd połączenia: Nie można połączyć się z serwerem. Sprawdź połączenie internetowe!'
                    : 'Connection Error: Cannot reach the server. Verify your internet connection!'));
      }
      if (e.response?.statusCode == 401) {
        final serverMessage = e.response?.data is Map
            ? e.response!.data['message']?.toString()
            : null;
        if (serverMessage != null && serverMessage.isNotEmpty) {
          return serverMessage;
        }
        return _locale.languageCode == 'ro'
            ? 'Email sau parolă incorectă'
            : (_locale.languageCode == 'es'
                ? 'Correo o contraseña incorrectos'
                : (_locale.languageCode == 'pl' ? 'Nieprawidłowy e-mail lub hasło' : 'Invalid email or password'));
      }
      return e.message ?? 'Unknown error';
    } catch (e) {
      return e.toString();
    }
  }

  Future<String?> changePassword(String oldPassword, String newPassword) async {
    try {
      final dio = ApiClient.create(timeout: const Duration(seconds: 10));
      await dio.post('/auth/change-password', data: {
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
          'fr': 'L\'ancien mot de passe est incorrect',
          'es': 'La contraseña anterior es incorrecta',
          'pl': 'Stare hasło jest nieprawidłowe'
        }[_locale.languageCode] ?? 'Old password is incorrect';
      }
      return e.response?.data?['message']?.toString() ?? e.message ?? 'Unknown error';
    } catch (e) {
      return e.toString();
    }
  }

  /// Manual sign-out: revokes the refresh session on the server, then removes
  /// both tokens from secure storage. The next launch shows the login screen.
  Future<void> logout() async {
    try {
      await ApiClient.create(timeout: const Duration(seconds: 5)).post(
        '/auth/logout',
        data: {'refreshToken': _session.refreshToken},
      );
    } catch (_) {
      // Offline sign-out still clears the local session.
    }
    await _session.logout();
    _clearLocalUser();
    BackgroundLocationService.stop();
    notifyListeners();
  }

  void setLocale(String code) {
    _locale = Locale(code);
    _prefs.setString('lang', code);
    notifyListeners();
  }
}
