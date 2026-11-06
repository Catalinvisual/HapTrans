import 'package:flutter/services.dart';

class ApkMetadata {
  final String packageName;
  final int versionCode;
  final String? versionName;
  final bool signatureMatches;

  const ApkMetadata({
    required this.packageName,
    required this.versionCode,
    required this.versionName,
    required this.signatureMatches,
  });
}

/// Reads the package identity, versionCode and signing certificate of a
/// downloaded APK through Android's PackageManager before handing it to the
/// installer. Android remains the final authority during installation.
class ApkInspector {
  static const _channel = MethodChannel('com.example.hapcargo_driver/apk');

  static Future<ApkMetadata> inspect(String path) async {
    final result = await _channel.invokeMapMethod<String, dynamic>(
      'inspect',
      {'path': path},
    );
    if (result == null) throw Exception('APK metadata unavailable');
    return ApkMetadata(
      packageName: (result['packageName'] ?? '').toString(),
      versionCode: (result['versionCode'] as num?)?.toInt() ?? -1,
      versionName: result['versionName']?.toString(),
      signatureMatches: result['signatureMatches'] == true,
    );
  }
}