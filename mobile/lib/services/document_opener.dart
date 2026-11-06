import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';

/// Opens a trip document through the authenticated API.
///
/// Documents live in Cloudinary as *authenticated* assets, so a bare file URL is
/// not readable. The app asks the backend for a short-lived signed URL (after
/// the server has checked that the trip belongs to this driver), downloads the
/// bytes with progress, and hands the local file to the Android viewer. Images
/// are additionally shown in an in-app preview.
class DocumentOpener {
  static Future<void> open(
    BuildContext context, {
    required String token,
    required Map<String, dynamic> doc,
  }) async {
    final l = AppLocalizations.of(context);
    final documentId = doc['id']?.toString();

    if (documentId == null || documentId.isEmpty) {
      _snack(
        context,
        l.translate('download_failed'),
        kError,
      );
      return;
    }

    _showProgress(context, l);

    final data = await context.read<TripProvider>().documentPreview(token, documentId);
    if (!context.mounted) return;

    final error = data['error']?.toString();
    if (error != null) {
      Navigator.of(context, rootNavigator: true).pop();
      _snack(context, error, kError, onRetry: () => open(context, token: token, doc: doc));
      return;
    }

    final url = data['url']?.toString();
    if (url == null || url.isEmpty) {
      Navigator.of(context, rootNavigator: true).pop();
      _snack(context, l.translate('download_failed'), kError, onRetry: () => open(context, token: token, doc: doc));
      return;
    }

    final fileName = _fileName(doc, data, url);
    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/$fileName';
      final response = await Dio().get<List<int>>(
        url,
        options: Options(responseType: ResponseType.bytes, followRedirects: true),
      );
      final bytes = response.data;
      if (bytes == null || bytes.isEmpty) {
        throw const FileSystemException('Empty document');
      }
      final file = File(path);
      await file.writeAsBytes(bytes, flush: true);

      if (!context.mounted) return;
      Navigator.of(context, rootNavigator: true).pop();

      final isImage = _isImage(fileName) || (data['mimeType']?.toString().startsWith('image/') ?? false);
      if (isImage) {
        await _previewImage(context, file, l);
        return;
      }

      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done && context.mounted) {
        _snack(
          context,
          '${l.translate('download_failed')}: ${result.message}',
          kError,
          onRetry: () => open(context, token: token, doc: doc),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      Navigator.of(context, rootNavigator: true).pop();
      _snack(
        context,
        l.translate('download_failed'),
        kError,
        onRetry: () => open(context, token: token, doc: doc),
      );
    }
  }

  static String _fileName(Map<String, dynamic> doc, Map<String, dynamic> data, String url) {
    final raw = (doc['fileName'] ?? doc['originalFilename'] ?? data['fileName'] ?? '').toString();
    final urlName = Uri.tryParse(url)?.pathSegments.isNotEmpty == true
        ? Uri.parse(url).pathSegments.last
        : '';
    var name = raw.trim().isNotEmpty ? raw.trim() : urlName;
    if (name.isEmpty) name = 'document';
    name = name.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    if (!name.contains('.')) {
      final type = (doc['documentType'] ?? doc['type'] ?? data['documentType'] ?? '').toString().toLowerCase();
      final ext = {'cmr': 'pdf', 'pod': 'pdf', 'invoice': 'pdf', 'aviz': 'pdf', 'photo': 'jpg'}[type] ?? 'pdf';
      name = '$name.$ext';
    }
    final stamp = DateTime.now().millisecondsSinceEpoch;
    return 'HapCargo_${stamp}_$name';
  }

  static bool _isImage(String name) {
    final ext = name.split('.').last.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].contains(ext);
  }

  static void _showProgress(BuildContext context, AppLocalizations l) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Row(
          children: [
            const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: kPrimary)),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                l.translate('downloading'),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: kText),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Future<void> _previewImage(BuildContext context, File file, AppLocalizations l) async {
    await showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: MediaQuery.of(ctx).size.width,
              height: MediaQuery.of(ctx).size.height,
              child: InteractiveViewer(
                minScale: 1,
                maxScale: 4,
                child: Image.file(file, fit: BoxFit.contain),
              ),
            ),
            Positioned(
              top: 40,
              right: 12,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static void _snack(
    BuildContext context,
    String message,
    Color color, {
    VoidCallback? onRetry,
  }) {
    final l = AppLocalizations.of(context);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: color,
          action: onRetry == null
              ? null
              : SnackBarAction(
                  label: l.translate('retry'),
                  textColor: Colors.white,
                  onPressed: onRetry,
                ),
        ),
      );
  }
}
