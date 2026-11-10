import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/constants.dart';

/// Owns the driver's session tokens for the whole app.
///
/// Tokens live in Android Keystore-backed secure storage (never in
/// SharedPreferences), survive app restarts and phone reboots, and are rotated
/// on every renewal. Access tokens last 15 minutes, so every API call asks this
/// class for a fresh one through [ensureFreshAccessToken].
class SessionManager {
  SessionManager._();
  static final SessionManager instance = SessionManager._();

  static const _accessTokenKey = 'haptrans.access_token';
  static const _refreshTokenKey = 'haptrans.refresh_token';
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  /// Renew slightly before expiry so a request never races the clock.
  static const refreshSkew = Duration(seconds: 60);

  String? _accessToken;
  String? _refreshToken;
  bool _loaded = false;
  bool _restoreCompleted = false;
  Future<bool>? _refreshInFlight;

  final List<void Function()> _tokenListeners = [];
  final List<void Function()> _expiredListeners = [];

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;

  bool get hasSession => _accessToken != null || _refreshToken != null;

  void addTokenListener(void Function() listener) => _tokenListeners.add(listener);

  void addSessionEndedListener(void Function() listener) => _expiredListeners.add(listener);

  /// Reads the persisted session. Legacy plain-text tokens from older APK
  /// versions are moved into secure storage once, then deleted.
  Future<void> restore(SharedPreferences prefs) async {
    if (_restoreCompleted) return;
    // NotificationService may have called ensureLoaded() first; re-read so the
    // legacy migration and expiry checks still run before the first frame.
    await _load();

    if (!hasSession) {
      final legacy = prefs.getString('token');
      if (legacy != null && legacy.isNotEmpty) {
        await saveTokens(accessToken: legacy, refreshToken: null);
        await prefs.remove('token');
      }
    }

    // An expired access token without a refresh token is not a session.
    if (_accessToken != null &&
        _refreshToken == null &&
        needsRefresh(_accessToken!)) {
      await clear();
    }

    _loaded = true;
    _restoreCompleted = true;
  }

  /// Used by the background location isolate, which has no SharedPreferences
  /// instance but shares the same secure store.
  Future<void> ensureLoaded() async {
    if (_loaded) return;
    await _load();
    _loaded = true;
  }

  Future<void> _load() async {
    try {
      _accessToken = await _secureStorage.read(key: _accessTokenKey);
      _refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    } catch (e) {
      debugPrint('Secure session read failed: $e');
      _accessToken = null;
      _refreshToken = null;
    }
  }

  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _loaded = true;
    try {
      await _secureStorage.write(key: _accessTokenKey, value: accessToken);
      if (refreshToken == null) {
        await _secureStorage.delete(key: _refreshTokenKey);
      } else {
        await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
      }
    } catch (e) {
      debugPrint('Secure session write failed: $e');
    }
    _notifyTokens();
  }

  /// Returns an access token that is valid for at least [refreshSkew], renewing
  /// it first when necessary. Never throws: `null` means the session is over.
  Future<String?> ensureFreshAccessToken() async {
    await ensureLoaded();

    if (_accessToken != null && !needsRefresh(_accessToken!)) {
      return _accessToken;
    }
    if (_refreshToken == null) return null;

    final renewed = await refresh();
    return renewed ? _accessToken : null;
  }

  /// Single-flight refresh: concurrent 401s share one rotation request, which
  /// prevents parallel renewals from invalidating each other.
  Future<bool> refresh() {
    final inFlight = _refreshInFlight;
    if (inFlight != null) return inFlight;

    final future = _performRefresh();
    _refreshInFlight = future;
    return future.whenComplete(() {
      if (identical(_refreshInFlight, future)) _refreshInFlight = null;
    });
  }

  Future<bool> _performRefresh() async {
    final attempted = _refreshToken;
    if (attempted == null || attempted.isEmpty) return false;

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {'x-client-platform': 'mobile'},
      ));
      final res = await dio.post(
        '$kApiUrl/auth/refresh',
        data: {'refreshToken': attempted},
        options: Options(validateStatus: (_) => true),
      );

      final data = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : const <String, dynamic>{};

      if (res.statusCode == 200) {
        final access = data['access_token']?.toString();
        if (access == null || access.isEmpty) return false;
        // Rotation: the server always returns a new refresh token. Keeping the
        // old one would make the next renewal fail.
        final rotated = data['refresh_token']?.toString();
        await saveTokens(accessToken: access, refreshToken: rotated ?? attempted);
        return true;
      }

      if (res.statusCode == 401 || res.statusCode == 403) {
        // The background isolate can rotate at the same moment as the app. If
        // storage already holds a different token, that renewal won: adopt it
        // instead of destroying a valid session.
        final storedRefresh = await _readSecure(_refreshTokenKey);
        if (storedRefresh != null && storedRefresh != attempted) {
          _refreshToken = storedRefresh;
          _accessToken = await _readSecure(_accessTokenKey);
          _loaded = true;
          _notifyTokens();
          return _accessToken != null;
        }
        await endSession(expired: true);
        return false;
      }

      // Server-side transient failure: keep the session and retry later.
      return false;
    } catch (e) {
      // Offline or timeout: never log the driver out for a network problem.
      debugPrint('Token refresh failed (transient): $e');
      return false;
    }
  }

  Future<String?> _readSecure(String key) async {
    try {
      return await _secureStorage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  /// Manual sign-out. The refresh token is dropped locally; the caller revokes
  /// it on the server through /auth/logout.
  Future<void> logout() => endSession(expired: false);

  /// Ends the session. [expired] distinguishes a revoked/invalid session (the
  /// UI must return to login) from a deliberate sign-out.
  Future<void> endSession({required bool expired}) async {
    _accessToken = null;
    _refreshToken = null;
    _loaded = true;
    try {
      await _secureStorage.delete(key: _accessTokenKey);
      await _secureStorage.delete(key: _refreshTokenKey);
    } catch (e) {
      debugPrint('Secure session delete failed: $e');
    }
    _notifyTokens();
    if (expired) {
      for (final listener in List.of(_expiredListeners)) {
        listener();
      }
    }
  }

  /// Kept for the legacy "clear everything" path.
  Future<void> clear() => endSession(expired: false);

  void _notifyTokens() {
    for (final listener in List.of(_tokenListeners)) {
      listener();
    }
  }

  /// True when a JWT is missing, malformed, or expires within [skew].
  static bool needsRefresh(String token, {Duration skew = refreshSkew}) {
    final expiry = expiryOf(token);
    if (expiry == null) return true;
    return expiry.isBefore(DateTime.now().add(skew));
  }

  static DateTime? expiryOf(String token) {
    try {
      return JwtDecoder.getExpirationDate(token);
    } catch (_) {
      return null;
    }
  }
}
