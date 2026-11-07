import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/version_check.dart';

void main() {
  test('installed v26 and backend v26 does not offer an update', () {
    expect(isUpdateAvailable(installedVersionCode: 26, latestVersionCode: 26), isFalse);
  });

  test('installed v25 and backend v26 offers an update', () {
    expect(isUpdateAvailable(installedVersionCode: 25, latestVersionCode: 26), isTrue);
  });

  test('installed v26 and backend v27 offers an update', () {
    expect(isUpdateAvailable(installedVersionCode: 26, latestVersionCode: 27), isTrue);
  });

  test('installed v27 and backend v26 never offers a downgrade', () {
    expect(isUpdateAvailable(installedVersionCode: 27, latestVersionCode: 26), isFalse);
  });

  test('version codes parse numerically from JSON strings', () {
    expect(parseVersionCode('26'), 26);
    expect(parseVersionCode(26), 26);
    expect(parseVersionCode('1.0.26'), isNull);
    expect(parseVersionCode(null), isNull);
  });
}