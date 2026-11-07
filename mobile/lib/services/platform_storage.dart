import 'dart:typed_data';

import 'package:flutter/services.dart';

/// Thin bridge to Android MediaStore. Keeping this native avoids broad storage
/// permissions and gives predictable public locations on modern Android.
class PlatformStorage {
  static const _channel = MethodChannel('com.example.hapcargo_driver/storage');

  static Future<String> saveToDownloads({
    required Uint8List bytes,
    required String fileName,
    required String mimeType,
  }) async {
    final uri = await _channel.invokeMethod<String>('saveToDownloads', {
      'bytes': bytes,
      'fileName': fileName,
      'mimeType': mimeType,
    });
    if (uri == null || uri.isEmpty) throw PlatformException(code: 'STORAGE_FAILED');
    return uri;
  }

  static Future<String> saveToGallery({
    required Uint8List bytes,
    required String fileName,
    required String mimeType,
  }) async {
    final uri = await _channel.invokeMethod<String>('saveToGallery', {
      'bytes': bytes,
      'fileName': fileName,
      'mimeType': mimeType,
    });
    if (uri == null || uri.isEmpty) throw PlatformException(code: 'STORAGE_FAILED');
    return uri;
  }

  static Future<void> open(String uri, String mimeType) =>
      _channel.invokeMethod<void>('open', {'uri': uri, 'mimeType': mimeType});
}
