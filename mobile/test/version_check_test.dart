import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/version_check.dart';

void main() {
  test('installed 21 and latest 21 does not offer an update', () {
    expect(isUpdateAvailable(installedVersionCode: 21, latestVersionCode: 21), isFalse);
  });

  test('installed 20 and latest 21 offers an update', () {
    expect(isUpdateAvailable(installedVersionCode: 20, latestVersionCode: 21), isTrue);
  });

  test('installed 21 and latest 22 offers an update', () {
    expect(isUpdateAvailable(installedVersionCode: 21, latestVersionCode: 22), isTrue);
  });

  test('installed 22 and latest 21 never offers a downgrade', () {
    expect(isUpdateAvailable(installedVersionCode: 22, latestVersionCode: 21), isFalse);
  });

  test('version codes parse numerically from JSON strings', () {
    expect(parseVersionCode('21'), 21);
    expect(parseVersionCode(21), 21);
    expect(parseVersionCode('1.0.21'), isNull);
    expect(parseVersionCode(null), isNull);
  });
}