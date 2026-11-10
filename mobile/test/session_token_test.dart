import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/services/session_manager.dart';

String _tokenExpiringIn(Duration duration) {
  final header = base64Url.encode(utf8.encode('{"alg":"none","typ":"JWT"}')).replaceAll('=', '');
  final payload = base64Url
      .encode(utf8.encode(jsonEncode({
        'sub': 'driver-1',
        'exp': DateTime.now().add(duration).millisecondsSinceEpoch ~/ 1000,
      })))
      .replaceAll('=', '');
  return '$header.$payload.signature';
}

void main() {
  group('SessionManager access-token renewal', () {
    test('a token valid for ten minutes does not need renewal', () {
      final token = _tokenExpiringIn(const Duration(minutes: 10));
      expect(SessionManager.needsRefresh(token), isFalse);
    });

    test('a token expiring inside the 60s safety window needs renewal', () {
      final token = _tokenExpiringIn(const Duration(seconds: 10));
      expect(SessionManager.needsRefresh(token), isTrue);
    });

    test('an already expired token needs renewal', () {
      final token = _tokenExpiringIn(const Duration(minutes: -1));
      expect(SessionManager.needsRefresh(token), isTrue);
    });

    test('a malformed token is treated as expired instead of valid', () {
      expect(SessionManager.needsRefresh('not-a-jwt'), isTrue);
      expect(SessionManager.needsRefresh(''), isTrue);
    });

    test('the expiry is read from the 15-minute access token', () {
      final token = _tokenExpiringIn(const Duration(minutes: 15));
      final expiry = SessionManager.expiryOf(token);
      expect(expiry, isNotNull);
      expect(expiry!.isAfter(DateTime.now()), isTrue);
    });
  });
}
