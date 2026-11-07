import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import '../services/apk_inspector.dart';
import '../utils/constants.dart';
import '../utils/version_check.dart';

class UpdateProvider extends ChangeNotifier {
  bool _hasUpdate = false;
  int? _serverVersionCode;
  String? _downloadUrl;
  String? _expectedSha256;
  Map<String, dynamic>? _messages;
  bool _isMandatory = false;
  bool _isChecking = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  DateTime? _lastDismissedAt;
  bool _dialogShowing = false;
  int? _installedVersionCode;
  String? _installedVersionName;
  String? _installedPackageName;
  String? _latestVersionName;

  bool get hasUpdate => _hasUpdate;
  int? get serverVersionCode => _serverVersionCode;
  String? get downloadUrl => _downloadUrl;
  bool get isMandatory => _isMandatory;
  bool get isChecking => _isChecking;
  bool get isDownloading => _isDownloading;
  double get downloadProgress => _downloadProgress;
  int? get installedVersionCode => _installedVersionCode;
  String? get installedVersionName => _installedVersionName;

  String get _installedLabel => _installedVersionName == null
      ? 'v$_installedVersionCode'
      : 'v$_installedVersionName ($_installedVersionCode)';

  Future<void> checkForUpdates({
    BuildContext? context,
    bool autoPrompt = false,
    bool manual = false,
    String locale = 'ro',
  }) async {
    if (_isChecking || _isDownloading) return;
    _isChecking = true;
    // Never keep a stale offer while package metadata is being re-read.
    _hasUpdate = false;
    notifyListeners();

    try {
      // PackageInfo reads the APK that Android actually installed. buildNumber
      // is Android's versionCode, including after the installer replaces the
      // running application.
      final package = await PackageInfo.fromPlatform();
      final installedCode = parseVersionCode(package.buildNumber);
      if (installedCode == null) {
        throw const FormatException('Installed Android versionCode is unavailable');
      }
      _installedVersionCode = installedCode;
      _installedVersionName = package.version;
      _installedPackageName = package.packageName;

      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));
      final res = await dio.get(
        '$kApiUrl/auth/app-version',
        queryParameters: {'_': DateTime.now().millisecondsSinceEpoch},
        options: Options(headers: {'Cache-Control': 'no-cache', 'Pragma': 'no-cache'}),
      );
      final data = res.data;
      final serverCode = parseVersionCode(data['latestVersionCode'] ?? data['versionCode']);
      if (serverCode == null) {
        throw const FormatException('Published versionCode is invalid');
      }
      _downloadUrl = data['url']?.toString();
      final sha = data['sha256']?.toString().trim().toLowerCase();
      _expectedSha256 = (sha != null && sha.length == 64) ? sha : null;
      _messages = data['message'] is Map ? Map<String, dynamic>.from(data['message']) : null;
      _isMandatory = data['mandatory'] == true;
      _serverVersionCode = serverCode;
      _latestVersionName = (data['latestVersionName'] ?? data['versionName'])?.toString();

      if (isUpdateAvailable(installedVersionCode: installedCode, latestVersionCode: serverCode)) {
        _hasUpdate = true;
        notifyListeners();

        if (context != null && context.mounted) {
          if (manual) {
            promptUpdateDialog(context, locale: locale);
          } else if (autoPrompt && !_dialogShowing) {
            // Check if dismissed recently (wait 30 minutes before re-prompting, unless mandatory)
            final canPrompt = _isMandatory ||
                _lastDismissedAt == null ||
                DateTime.now().difference(_lastDismissedAt!) > const Duration(minutes: 30);
            if (canPrompt) {
              promptUpdateDialog(context, locale: locale);
            }
          }
        }
      } else {
        _hasUpdate = false;
        notifyListeners();

        if (manual && context != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text({
                'ro': 'Folosiți deja ultima versiune ($_installedLabel).',
                'en': 'You are already using the latest version ($_installedLabel).',
                'nl': 'U gebruikt al de nieuwste versie ($_installedLabel).',
                'de': 'Sie verwenden bereits die neueste Version ($_installedLabel).',
                'fr': 'Vous utilisez déjà la dernière version ($_installedLabel).',
                'es': 'Ya estás usando la última versión ($_installedLabel).',
                'pl': 'Masz już najnowszą wersję ($_installedLabel).'
              }[locale] ?? 'You are already using the latest version.'),
              backgroundColor: kSuccess,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error checking for updates: $e');
      if (manual && context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${{
              'ro': 'Eroare la verificarea actualizării: ',
              'en': 'Error checking for updates: ',
              'nl': 'Fout bij het controleren op updates: ',
              'de': 'Fehler beim Suchen nach Updates: ',
              'fr': 'Erreur lors de la recherche de mises à jour : ',
              'es': 'Error al buscar actualizaciones: ',
              'pl': 'Błąd sprawdzania aktualizacji: '
            }[locale] ?? 'Error checking for updates: '}$e'),
            backgroundColor: kError,
          ),
        );
      }
    } finally {
      _isChecking = false;
      notifyListeners();
    }
  }

  void promptUpdateDialog(BuildContext context, {String locale = 'ro'}) {
    if (_dialogShowing || _downloadUrl == null) return;
    _dialogShowing = true;

    final title = {
      'ro': 'Actualizare Disponibilă',
      'en': 'Update Available',
      'nl': 'Update beschikbaar',
      'de': 'Update verfügbar',
      'fr': 'Mise à jour disponible',
      'es': 'Actualización Disponible',
      'pl': 'Dostępna aktualizacja'
    }[locale] ?? 'Update Available';

    final msg = _messages?[locale]?.toString() ??
        _messages?['en']?.toString() ??
        ({
          'ro': 'O nouă versiune a aplicației (v${_serverVersionCode ?? ''}) este disponibilă! Vă rugăm să actualizați.',
          'en': 'A new version of the app (v${_serverVersionCode ?? ''}) is available! Please update.',
          'nl': 'Er is een nieuwe versie van de app (v${_serverVersionCode ?? ''}) beschikbaar! Werk deze alstublieft bij.',
          'de': 'Eine neue Version der App (v${_serverVersionCode ?? ''}) ist verfügbar! Bitte aktualisieren Sie.',
          'fr': 'Une nouvelle version de l\'application (v${_serverVersionCode ?? ''}) est disponible ! Veuillez la mettre à jour.',
          'es': '¡Hay una nueva versión de la aplicación (v${_serverVersionCode ?? ''}) disponible! Por favor actualice.',
          'pl': 'Nowa wersja aplikacji (v${_serverVersionCode ?? ''}) jest dostępna! Zaktualizuj aplikację.'
        }[locale] ?? 'A new version of the app is available! Please update.');

    final btnUpdate = {
      'ro': 'Actualizează Acum',
      'en': 'Update Now',
      'nl': 'Nu bijwerken',
      'de': 'Jetzt aktualisieren',
      'fr': 'Mettre à jour maintenant',
      'es': 'Actualizar Ahora',
      'pl': 'Zaktualizuj teraz'
    }[locale] ?? 'Update Now';

    final btnLater = {
      'ro': 'Mai târziu',
      'en': 'Later',
      'nl': 'Later',
      'de': 'Später',
      'fr': 'Plus tard',
      'es': 'Más tarde',
      'pl': 'Później'
    }[locale] ?? 'Later';

    showDialog(
      context: context,
      barrierDismissible: !_isMandatory,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.system_update_rounded, color: kPrimary, size: 28),
            const SizedBox(width: 10),
            Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17))),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(msg, style: TextStyle(fontSize: 14, color: kText)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: kPrimaryLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$_installedLabel  ➔  v${_latestVersionName ?? ''} (${_serverVersionCode ?? ''})',
                style: TextStyle(fontWeight: FontWeight.bold, color: kPrimaryDark, fontSize: 13),
              ),
            ),
          ],
        ),
        actions: [
          if (!_isMandatory)
            TextButton(
              onPressed: () {
                _lastDismissedAt = DateTime.now();
                _dialogShowing = false;
                Navigator.pop(ctx);
              },
              child: Text(btnLater, style: const TextStyle(color: Colors.grey)),
            ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _dialogShowing = false;
              downloadAndInstall(context, locale: locale);
            },
            child: Text(btnUpdate, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    ).then((_) {
      _dialogShowing = false;
    });
  }

  Future<void> downloadAndInstall(BuildContext context, {String locale = 'ro'}) async {
    if (_downloadUrl == null || _isDownloading) return;
    _isDownloading = true;
    _downloadProgress = 0.0;
    notifyListeners();

    final ValueNotifier<double> progressNotifier = ValueNotifier(0.0);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => ValueListenableBuilder<double>(
        valueListenable: progressNotifier,
        builder: (context, progress, child) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text({
              'ro': 'Se descarcă actualizarea...',
              'en': 'Downloading update...',
              'nl': 'Update downloaden...',
              'de': 'Update wird heruntergeladen...',
              'fr': 'Téléchargement de la mise à jour...',
              'es': 'Descargando actualización...',
              'pl': 'Pobieranie aktualizacji...'
            }[locale] ?? 'Downloading update...', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                LinearProgressIndicator(value: progress, color: kPrimary, backgroundColor: Colors.grey.shade200),
                const SizedBox(height: 16),
                Text('${(progress * 100).toStringAsFixed(0)}%', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
          );
        },
      ),
    );

    try {
      final dir = await getExternalStorageDirectory();
      if (dir == null) throw Exception('Storage directory unavailable');
      final filePath = '${dir.path}/HapTrans_update.apk';
      final file = File(filePath);
      // Never install a stale file left by an interrupted download.
      if (await file.exists()) await file.delete();

      final dio = Dio();
      final response = await dio.download(
        _downloadUrl!,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final p = received / total;
            _downloadProgress = p;
            progressNotifier.value = p;
            notifyListeners();
          }
        },
      );
      if (response.statusCode != 200) {
        throw Exception('APK download returned HTTP ${response.statusCode}');
      }
      final declaredLength = int.tryParse(response.headers.value('content-length') ?? '');
      if (declaredLength != null && declaredLength > 0 && await file.length() != declaredLength) {
        await file.delete();
        throw Exception('APK download length does not match the server response');
      }

      // Android re-checks the signature at install time; the checksum proves
      // the bytes came from our server and were not truncated in transit.
      if (_expectedSha256 != null) {
        final digest = await sha256.bind(file.openRead()).first;
        if (digest.toString().toLowerCase() != _expectedSha256) {
          await file.delete();
          throw Exception({
            'ro': 'Fișierul descărcat este incomplet. Reîncercați.',
            'en': 'The downloaded file is incomplete. Please try again.',
            'nl': 'Het gedownloade bestand is onvolledig. Probeer het opnieuw.',
            'de': 'Die heruntergeladene Datei ist unvollständig. Bitte erneut versuchen.',
            'fr': 'Le fichier téléchargé est incomplet. Veuillez réessayer.',
            'es': 'El archivo descargado está incompleto. Inténtelo de nuevo.',
            'pl': 'Pobrany plik jest niekompletny. Spróbuj ponownie.',
          }[locale] ?? 'The downloaded file is incomplete. Please try again.');
        }
      }

      // The checksum proves the bytes; Android's PackageManager proves the
      // package identity, versionCode and signing certificate before install.
      final apk = await ApkInspector.inspect(filePath);
      if (_installedPackageName != null && apk.packageName != _installedPackageName) {
        await file.delete();
        throw Exception('Downloaded APK has a different package identity');
      }
      if (_serverVersionCode != null && apk.versionCode != _serverVersionCode) {
        await file.delete();
        throw Exception('Downloaded APK versionCode does not match the published version');
      }
      if (!apk.signatureMatches) {
        await file.delete();
        throw Exception('Downloaded APK signing certificate does not match the installed app');
      }

      if (context.mounted && Navigator.canPop(context)) {
        Navigator.pop(context); // Close progress dialog
      }
      // Hand the APK to Android's package installer explicitly; Android then
      // verifies its signature and (for sideloaded apps) Play Protect scans it.
      final opened = await OpenFilex.open(
        filePath,
        type: 'application/vnd.android.package-archive',
      );
      if (opened.type != ResultType.done) {
        throw Exception(opened.message);
      }
    } catch (e) {
      if (context.mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${{
              'ro': 'Eroare la descărcare: ',
              'en': 'Download error: ',
              'nl': 'Downloadfout: ',
              'de': 'Download-Fehler: ',
              'fr': 'Erreur de téléchargement : ',
              'es': 'Error de descarga: ',
              'pl': 'Błąd pobierania: '
            }[locale] ?? 'Download error: '}$e'),
            backgroundColor: kError,
          ),
        );
      }
    } finally {
      _isDownloading = false;
      notifyListeners();
    }
  }
}
