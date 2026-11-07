import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/trip_provider.dart';
import '../screens/document_preview_screen.dart';
import '../utils/constants.dart';
import 'platform_storage.dart';

/// Everything the driver app needs to know about one document's file.
class DocumentFileInfo {
  final String fileName;
  final String extension;
  final String mimeType;

  const DocumentFileInfo({
    required this.fileName,
    required this.extension,
    required this.mimeType,
  });

  String get baseName {
    final dot = fileName.lastIndexOf('.');
    return dot > 0 ? fileName.substring(0, dot) : fileName;
  }
}

/// Central document actions.
///
/// Tapping a document calls [preview]: the backend issues a short-lived signed
/// URL after checking ownership, and the file is rendered in memory. Only an
/// explicit download calls [download], which writes the original file to
/// Android Downloads (or the gallery for images).
class DocumentOpener {
  static Future<void> preview(
    BuildContext context, {
    required String token,
    required Map<String, dynamic> doc,
  }) async {
    final l = AppLocalizations.of(context);
    final documentId = doc['id']?.toString();
    if (documentId == null || documentId.isEmpty) {
      _snack(context, l.translate('doc_open_error'), kError);
      return;
    }

    _showProgress(context, l.translate('opening_document'));
    try {
      final data =
          await context.read<TripProvider>().documentPreview(token, documentId);
      final error = data['error']?.toString();
      if (error != null && error.isNotEmpty) throw Exception(error);
      final url = data['url']?.toString();
      if (url == null || url.isEmpty) throw Exception('Missing preview URL');

      final info = infoFor(doc, data, url);
      final bytes = await _fetchBytes(url);
      if (!context.mounted) return;
      _closeProgress(context);

      if (info.mimeType.startsWith('image/')) {
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                ImagePreviewScreen(bytes: bytes, title: info.fileName),
          ),
        );
        return;
      }

      if (info.mimeType == 'application/pdf' || info.extension == 'pdf') {
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                PdfPreviewScreen(bytes: bytes, title: info.fileName),
          ),
        );
        return;
      }

      // Other formats have no in-app renderer. They are still opened without a
      // download notification or a permanent copy: a cache file is replaced on
      // each preview and can be reclaimed by Android.
      final dir = await getTemporaryDirectory();
      final previewDir = Directory('${dir.path}/hapcargo_preview');
      if (!await previewDir.exists()) await previewDir.create(recursive: true);
      final file = File('${previewDir.path}/${info.fileName}');
      await file.writeAsBytes(bytes, flush: true);
      final opened = await OpenFilex.open(
        file.path,
        type: info.mimeType,
      );
      if (opened.type != ResultType.done && context.mounted) {
        _snack(context, l.translate('preview_unavailable'), kError);
      }
    } catch (e) {
      debugPrint('Document preview error: $e');
      if (!context.mounted) return;
      _closeProgress(context);
      _snack(context, l.translate('doc_open_error'), kError);
    }
  }

  static Future<void> download(
    BuildContext context, {
    required String token,
    required Map<String, dynamic> doc,
  }) async {
    final l = AppLocalizations.of(context);
    final documentId = doc['id']?.toString();
    if (documentId == null || documentId.isEmpty) {
      _snack(context, l.translate('download_error'), kError);
      return;
    }

    _showProgress(context, l.translate('downloading'));
    try {
      final data =
          await context.read<TripProvider>().documentPreview(token, documentId);
      final error = data['error']?.toString();
      if (error != null && error.isNotEmpty) throw Exception(error);
      final url = data['url']?.toString();
      if (url == null || url.isEmpty) throw Exception('Missing download URL');
      final info = infoFor(doc, data, url);
      final bytes = await _fetchBytes(url);

      final saved = await _saveWithPermissionRetry(info, bytes);
      if (!context.mounted) return;
      _closeProgress(context);
      _showSuccess(context, l, saved);
    } on PlatformException catch (e) {
      if (!context.mounted) return;
      _closeProgress(context);
      _handleStorageError(context, l, e);
    } catch (e) {
      debugPrint('Document download error: $e');
      if (!context.mounted) return;
      _closeProgress(context);
      _snack(context, l.translate('download_error'), kError);
    }
  }

  static Future<_SavedFile> _saveBytes(
      DocumentFileInfo info, Uint8List bytes) async {
    if (!Platform.isAndroid) {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/${info.fileName}');
      await file.writeAsBytes(bytes, flush: true);
      return _SavedFile(
          uri: file.uri.toString(), gallery: false, mimeType: info.mimeType);
    }

    if (info.mimeType.startsWith('image/')) {
      try {
        final uri = await PlatformStorage.saveToGallery(
          bytes: bytes,
          fileName: info.fileName,
          mimeType: info.mimeType,
        );
        return _SavedFile(uri: uri, gallery: true, mimeType: info.mimeType);
      } on PlatformException catch (e) {
        // A gallery refusal must not lose the file: Downloads is an accessible
        // fallback and the success message names the actual location.
        if (e.code != 'PERMISSION_DENIED' && e.code != 'STORAGE_FAILED')
          rethrow;
      }
    }

    final uri = await PlatformStorage.saveToDownloads(
      bytes: bytes,
      fileName: info.fileName,
      mimeType: info.mimeType,
    );
    return _SavedFile(uri: uri, gallery: false, mimeType: info.mimeType);
  }

  /// Android 9 and older need WRITE_EXTERNAL_STORAGE for public Downloads.
  /// Ask only after MediaStore refuses, then retry the same original file once.
  static Future<_SavedFile> _saveWithPermissionRetry(
    DocumentFileInfo info,
    Uint8List bytes,
  ) async {
    try {
      return await _saveBytes(info, bytes);
    } on PlatformException catch (error) {
      if (!Platform.isAndroid || error.code != 'PERMISSION_DENIED') rethrow;
      final status = await Permission.storage.request();
      if (!status.isGranted) rethrow;
      return _saveBytes(info, bytes);
    }
  }

  static Future<void> _handleStorageError(
    BuildContext context,
    AppLocalizations l,
    PlatformException error,
  ) async {
    if (error.code != 'PERMISSION_DENIED') {
      _snack(context,
          '${l.translate('download_error')}: ${error.message ?? ''}', kError);
      return;
    }

    // The storage permission was already requested in the retry above. Never
    // fail silently: name the denial and offer the system app settings.
    _snack(
      context,
      l.translate('download_permission_denied'),
      kError,
      actionLabel: l.translate('open_settings'),
      onAction: openAppSettings,
    );
  }

  static Future<Uint8List> _fetchBytes(String url) async {
    final response = await Dio().get<List<int>>(
      url,
      options: Options(
        responseType: ResponseType.bytes,
        followRedirects: true,
        receiveTimeout: const Duration(seconds: 60),
      ),
    );
    final data = response.data;
    if (data == null || data.isEmpty)
      throw const FileSystemException('Empty document');
    return Uint8List.fromList(data);
  }

  /// Resolves a display name, extension and MIME type without changing the
  /// original filename.
  static DocumentFileInfo infoFor(
    Map<String, dynamic> doc,
    Map<String, dynamic> data,
    String url,
  ) {
    final raw = (doc['fileName'] ??
            doc['originalFilename'] ??
            data['fileName'] ??
            (Uri.tryParse(url)?.pathSegments.isNotEmpty == true
                ? Uri.parse(url).pathSegments.last
                : ''))
        .toString()
        .trim();
    var name = _safeName(raw.isEmpty ? 'document' : raw);
    var ext = _extension(name);
    if (ext.isEmpty) {
      ext = (doc['format'] ?? doc['extension'] ?? '').toString().toLowerCase();
    }
    if (ext.isEmpty) {
      final type =
          (doc['documentType'] ?? doc['type'] ?? data['documentType'] ?? '')
              .toString()
              .toLowerCase();
      ext = const {
            'cmr': 'pdf',
            'pod': 'pdf',
            'invoice': 'pdf',
            'aviz': 'pdf',
            'delivery_note': 'pdf',
            'photo': 'jpg',
            'image': 'jpg',
            'licence': 'pdf',
            'license': 'pdf',
          }[type] ??
          'pdf';
    }
    if (_extension(name).isEmpty) name = '$name.$ext';

    final suppliedMime = (data['mimeType'] ?? doc['mimeType'] ?? '').toString();
    final mime = suppliedMime.contains('/') ? suppliedMime : _mimeFor(ext);
    return DocumentFileInfo(
      fileName: name,
      extension: ext,
      mimeType: mime,
    );
  }

  static String _safeName(String raw) {
    final noPath = raw.split(RegExp(r'[/\\]')).last;
    final cleaned = noPath
        .replaceAll(RegExp(r'[\x00-\x1F<>:"|?*]'), '_')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    return cleaned.isEmpty ? 'document' : cleaned;
  }

  static String _extension(String name) {
    final dot = name.lastIndexOf('.');
    if (dot < 0 || dot == name.length - 1) return '';
    return name.substring(dot + 1).toLowerCase();
  }

  static String _mimeFor(String ext) {
    return const {
          'pdf': 'application/pdf',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
          'gif': 'image/gif',
          'heic': 'image/heic',
          'doc': 'application/msword',
          'docx':
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }[ext] ??
        'application/octet-stream';
  }

  static void _showProgress(BuildContext context, String message) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        content: Row(
          children: [
            SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    strokeWidth: 2.5, color: kPrimary)),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w600, color: kText),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static void _closeProgress(BuildContext context) {
    final navigator = Navigator.of(context, rootNavigator: true);
    if (navigator.canPop()) navigator.pop();
  }

  static void _showSuccess(
      BuildContext context, AppLocalizations l, _SavedFile saved) {
    _snack(
      context,
      saved.gallery
          ? l.translate('saved_to_gallery')
          : l.translate('saved_to_downloads'),
      kSuccess,
      actionLabel: l.translate('open_document'),
      onAction: () async {
        try {
          await PlatformStorage.open(saved.uri, saved.mimeType);
        } catch (_) {}
      },
    );
  }

  static void _snack(
    BuildContext context,
    String message,
    Color color, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: color,
          action: actionLabel == null || onAction == null
              ? null
              : SnackBarAction(
                  label: actionLabel,
                  textColor: kOnPrimary,
                  onPressed: onAction,
                ),
        ),
      );
  }
}

class _SavedFile {
  final String uri;
  final bool gallery;
  final String mimeType;

  const _SavedFile({
    required this.uri,
    required this.gallery,
    required this.mimeType,
  });
}
