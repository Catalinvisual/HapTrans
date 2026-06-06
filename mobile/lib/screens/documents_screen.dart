import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:google_mlkit_document_scanner/google_mlkit_document_scanner.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import '../utils/date_formatter.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final _commentCtrl = TextEditingController();
  String _selectedTypeKey = 'cmr';
  String? _selectedTripId;
  List<File> _selectedFiles = [];
  List<Map<String, dynamic>> _documentsList = [];
  bool _loading = false;
  String get locale => context.read<AuthProvider>().locale.languageCode;
  bool _fetching = false;

  @override
  void initState() {
    super.initState();
    _fetchDocuments();
  }

  Future<void> _fetchDocuments() async {
    setState(() => _fetching = true);
    try {
      final auth = context.read<AuthProvider>();
      final dio = Dio(BaseOptions(
        baseUrl: kApiUrl,
        headers: {'Authorization': 'Bearer ${auth.token}'},
      ));
      final res = await dio.get('/documents');
      if (res.data != null) {
        final allDocs = List<Map<String, dynamic>>.from(res.data);
        // Filter to only show documents uploaded by this driver/user
        setState(() {
          _documentsList = allDocs
              .where((d) => d['uploadedBy']?['id'] == auth.user?['id'])
              .toList();
          _documentsList.sort((a, b) => b['createdAt'].toString().compareTo(a['createdAt'].toString()));
        });
      }
    } catch (e) {
      debugPrint('Error fetching docs: $e');
    } finally {
      setState(() => _fetching = false);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      if (source == ImageSource.gallery) {
        final pickedList = await picker.pickMultiImage(imageQuality: 80);
        if (pickedList.isNotEmpty) {
          setState(() {
            _selectedFiles.addAll(pickedList.map((x) => File(x.path)));
          });
        }
      } else {
        final picked = await picker.pickImage(source: source, imageQuality: 80);
        if (picked != null) {
          setState(() {
            _selectedFiles.add(File(picked.path));
          });
        }
      }
    } catch (e) {
      showTopSnackBar(context, 
        SnackBar(content: Text({'ro': 'Eroare: $e', 'en': 'Error: $e', 'nl': 'Fout: $e', 'de': 'Fehler: $e', 'fr': 'Erreur: $e'}[locale] ?? 'Error: $e'), backgroundColor: kError),
      );
    }
  }

  Future<void> _scanDocument() async {
    try {
      if (!await Permission.camera.request().isGranted) {
        showTopSnackBar(context, 
          SnackBar(content: Text({'ro': 'Permisiunea camerei este necesară', 'en': 'Camera permission is required', 'nl': 'Cameratoestemming is vereist', 'de': 'Kameraberechtigung ist erforderlich', 'fr': 'Autorisation caméra requise'}[locale] ?? 'Camera permission is required'), backgroundColor: Colors.red),
        );
        return;
      }
      
      DocumentScannerOptions options = DocumentScannerOptions(
        documentFormats: const {DocumentFormat.jpeg},
        mode: ScannerMode.full,
        pageLimit: 1,
        isGalleryImport: true,
      );
      final documentScanner = DocumentScanner(options: options);
      
      DocumentScanningResult? result = await documentScanner.scanDocument();
      if (result != null && result.images != null && result.images!.isNotEmpty) {
        setState(() {
          _selectedFiles.add(File(result.images!.first));
        });
      }
      documentScanner.close();
    } catch (e) {
      if (e.toString().toLowerCase().contains('cancelled')) return; // Ignore user cancellation
      showTopSnackBar(context, 
        SnackBar(content: Text({'ro': 'Eroare scanare: $e', 'en': 'Scan Error: $e', 'nl': 'Scanfout: $e', 'de': 'Scan-Fehler: $e', 'fr': 'Erreur de scan: $e'}[locale] ?? 'Scan Error: $e'), backgroundColor: kError),
      );
    }
  }

  void _handleCameraPress() {
    if (_selectedTypeKey == 'cmr' || _selectedTypeKey == 'aviz') {
      _scanDocument();
    } else {
      _pickImage(ImageSource.camera);
    }
  }

  Future<void> _deleteDocument(String docId, Map<String, String> l) async {
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthProvider>();
      final dio = Dio(BaseOptions(
        baseUrl: kApiUrl,
        headers: {'Authorization': 'Bearer ${auth.token}'},
      ));
      await dio.delete('/documents/$docId');
      showTopSnackBar(context, 
        SnackBar(content: Text(l['deleteSuccess']!), backgroundColor: kSuccess),
      );
      _fetchDocuments();
    } catch (e) {
      showTopSnackBar(context, 
        SnackBar(content: Text('Error: $e'), backgroundColor: kError),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  void _confirmDelete(String docId, Map<String, String> l, BuildContext parentCtx) {
    showDialog(
      context: parentCtx,
      builder: (ctx) => AlertDialog(
        title: Text(l['delete']!),
        content: Text(l['deleteConfirm']!),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l['cancel']!, style: const TextStyle(color: kTextSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx); // close alert
              Navigator.pop(parentCtx); // close preview
              _deleteDocument(docId, l);
            },
            style: ElevatedButton.styleFrom(backgroundColor: kError),
            child: Text(l['delete']!, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(type: FileType.any, allowMultiple: true);
      if (result != null) {
        setState(() {
          _selectedFiles.addAll(result.paths.whereType<String>().map((p) => File(p)));
        });
      }
    } catch (e) {
      showTopSnackBar(context, 
        SnackBar(content: Text({'ro': 'Eroare: $e', 'en': 'Error: $e', 'nl': 'Fout: $e', 'de': 'Fehler: $e', 'fr': 'Erreur: $e'}[locale] ?? 'Error: $e'), backgroundColor: kError),
      );
    }
  }

  Future<void> _uploadDocument(Map<String, String> l) async {
    if (_selectedFiles.isEmpty) {
      showTopSnackBar(context, 
        SnackBar(content: Text(l['selectFile']!), backgroundColor: kWarning),
      );
      return;
    }
    
    if (_selectedTypeKey != 'fuel' && _selectedTripId == null) {
      showTopSnackBar(context, 
        SnackBar(content: Text(l['selectTripErr']!), backgroundColor: kWarning),
      );
      return;
    }

    setState(() => _loading = true);

    try {
      final auth = context.read<AuthProvider>();
      final tripProv = context.read<TripProvider>();
      final selectedTrip = tripProv.trips.firstWhere((t) => t['id'] == _selectedTripId, orElse: () => {});
      final refPrefix = selectedTrip['referenceNumber'] != null ? '${selectedTrip['referenceNumber']}_' : '';
      final dio = Dio(BaseOptions(
        baseUrl: kApiUrl,
        headers: {'Authorization': 'Bearer ${auth.token}'},
      ));

      for (final file in _selectedFiles) {
        final extension = file.path.split('.').last;
        final englishNames = {
          'cmr': 'CMR',
          'aviz': 'Waybill',
          'fuel': 'Fuel_Receipt',
          'loadingPhoto': 'Loading_Photo',
          'cargoPhoto': 'Cargo_Photo',
          'other': 'Other',
        };
        final cleanType = englishNames[_selectedTypeKey] ?? 'Document';
        final finalName = _selectedTripId != null ? '$refPrefix$cleanType.$extension' : '$cleanType.$extension';
        
        final formData = FormData.fromMap({
          'type': l[_selectedTypeKey] ?? 'CMR',
          if (_selectedTripId != null) 'tripId': _selectedTripId,
          'notes': _commentCtrl.text.trim(),
          'file': await MultipartFile.fromFile(
            file.path,
            filename: finalName,
          ),
        });
        await dio.post('/documents/upload', data: formData);
      }

      showTopSnackBar(context, 
        SnackBar(content: Text(l['uploadSuccess']!), backgroundColor: kSuccess),
      );
      setState(() {
        _commentCtrl.clear();
        _selectedFiles.clear();
      });
      _fetchDocuments();
    } catch (e) {
      showTopSnackBar(context, 
        SnackBar(content: Text({'ro': 'Încărcare eșuată: $e', 'en': 'Upload failed: $e', 'nl': 'Upload mislukt: $e', 'de': 'Hochladen fehlgeschlagen: $e', 'fr': 'Échec du téléchargement: $e'}[locale] ?? 'Upload failed: $e'), backgroundColor: kError),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _downloadFile(String fileUrl, String fileName, Map<String, String> l) async {
    try {
      final dio = Dio();
      final response = await dio.get(
        fileUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      
      String? savePath;
      if (Platform.isAndroid) {
        savePath = '/storage/emulated/0/Download/$fileName';
      } else {
        final dir = await getApplicationDocumentsDirectory();
        savePath = '${dir.path}/$fileName';
      }

      final file = File(savePath);
      await file.writeAsBytes(response.data);

      showTopSnackBar(context, 
        SnackBar(
          content: Text('${l['downloadSuccess']!} -> Downloads/$fileName'),
          backgroundColor: kSuccess,
          duration: const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      try {
        final dir = await getApplicationDocumentsDirectory();
        final savePath = '${dir.path}/$fileName';
        final file = File(savePath);
        final dio = Dio();
        final response = await dio.get(
          fileUrl,
          options: Options(responseType: ResponseType.bytes),
        );
        await file.writeAsBytes(response.data);
        
        showTopSnackBar(context, 
          SnackBar(
            content: Text('${l['downloadSuccess']!} (Documents/$fileName)'),
            backgroundColor: kSuccess,
          ),
        );
      } catch (err) {
        showTopSnackBar(context, 
          SnackBar(content: Text({'ro': 'Descărcare eșuată: $err', 'en': 'Download failed: $err', 'nl': 'Download mislukt: $err', 'de': 'Download fehlgeschlagen: $err', 'fr': 'Échec du téléchargement: $err'}[locale] ?? 'Download failed: $err'), backgroundColor: kError),
        );
      }
    }
  }

  Future<void> _shareFile(String fileUrl, String fileName, Map<String, String> l) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final tempPath = '${tempDir.path}/$fileName';
      
      final dio = Dio();
      await dio.download(fileUrl, tempPath);
      
      final xFile = XFile(tempPath);
      await Share.shareXFiles([xFile], text: fileName);
    } catch (e) {
      showTopSnackBar(context, 
        SnackBar(content: Text({'ro': 'Partajare eșuată: $e', 'en': 'Sharing failed: $e', 'nl': 'Delen mislukt: $e', 'de': 'Teilen fehlgeschlagen: $e', 'fr': 'Échec du partage: $e'}[locale] ?? 'Sharing failed: $e'), backgroundColor: kError),
      );
    }
  }

  void _showTripSelectionSheet(List<Map<String, dynamic>> trips, Map<String, String> l) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: kSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(color: Colors.black26, blurRadius: 20, offset: Offset(0, -5)),
            ],
          ),
          child: Column(
            children: [
              // Modern handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 16),
                  width: 48,
                  height: 5,
                  decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(10)),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.route, color: kPrimary, size: 28),
                    const SizedBox(width: 12),
                    Text(l['selectTrip']!, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: kText)),
                  ],
                ),
              ),
              const Divider(height: 24, thickness: 1),
              // List
              Expanded(
                child: trips.isEmpty
                    ? Center(child: Text(l['noTrip']!, style: const TextStyle(fontSize: 16, color: kTextSecondary)))
                    : ListView.separated(
                        controller: scrollController,
                        itemCount: trips.length,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (ctx, i) {
                          final t = trips[i];
                          final ref = t['referenceNumber'] ?? 'No Ref';
                          final pickup = t['pickupAddress'] ?? '';
                          final dropoff = t['dropoffAddress'] ?? '';
                          final isSelected = _selectedTripId == t['id'];
                          
                          return InkWell(
                            onTap: () {
                              setState(() => _selectedTripId = t['id']);
                              Navigator.pop(ctx);
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isSelected ? kPrimary.withOpacity(0.05) : Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected ? kPrimary : Colors.grey[200]!,
                                  width: isSelected ? 2 : 1,
                                ),
                                boxShadow: isSelected ? [
                                  BoxShadow(color: kPrimary.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))
                                ] : [
                                  BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 2))
                                ],
                              ),
                              child: Row(
                                children: [
                                  // Icon side
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: isSelected ? kPrimary : kPrimaryLight,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      Icons.local_shipping_rounded,
                                      color: isSelected ? Colors.white : kPrimary,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  // Content side
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          ref,
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: kText),
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Column(
                                              children: [
                                                const SizedBox(height: 2),
                                                Container(width: 8, height: 8, decoration: BoxDecoration(color: Colors.blue[400], shape: BoxShape.circle)),
                                                Container(width: 2, height: 16, color: Colors.grey[300]),
                                                Container(width: 8, height: 8, decoration: BoxDecoration(color: Colors.green[500], shape: BoxShape.circle)),
                                              ],
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(pickup.split(',').first, style: const TextStyle(fontSize: 13, color: kTextSecondary, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis),
                                                  const SizedBox(height: 6),
                                                  Text(dropoff.split(',').first, style: const TextStyle(fontSize: 13, color: kTextSecondary, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isSelected)
                                    const Padding(
                                      padding: EdgeInsets.only(left: 12),
                                      child: Icon(Icons.check_circle_rounded, color: kPrimary, size: 28),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  void _showPreviewDialog(Map<String, dynamic> doc, Map<String, String> l) {
    // Build full static URL of the document on our server
    final serverIp = kApiUrl.replaceAll('/api', ''); // Get http://ip:3001
    final fileUrl = doc['fileUrl'] ?? '';
    final fullUrl = fileUrl.startsWith('http') ? fileUrl : '$serverIp$fileUrl';

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          padding: const EdgeInsets.all(16),
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${doc['type']}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kText),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.delete, color: kError),
                        onPressed: () => _confirmDelete(doc['id'], l, ctx),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: kTextSecondary),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: fileUrl.isNotEmpty
                      ? Image.network(
                          fullUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              color: kSurface,
                              child: const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.insert_drive_file, size: 64, color: kTextSecondary),
                                  SizedBox(height: 8),
                                  Text('File Preview Not Available', style: TextStyle(color: kTextSecondary)),
                                ],
                              ),
                            );
                          },
                        )
                      : Container(
                          color: kSurface,
                          child: const Icon(Icons.insert_drive_file, size: 64, color: kTextSecondary),
                        ),
                ),
              ),
              if (doc['notes'] != null && doc['notes'].toString().isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: kSurface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: kBorder),
                  ),
                  child: Text(
                    doc['notes'],
                    style: const TextStyle(fontSize: 13, color: kText),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        _downloadFile(fullUrl, fileUrl.split('/').last, l);
                      },
                      icon: const Icon(Icons.download_rounded, size: 18),
                      label: Text(l['download']!),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        _shareFile(fullUrl, fileUrl.split('/').last, l);
                      },
                      icon: const Icon(Icons.share_rounded, size: 18),
                      label: Text(l['share']!),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kSuccess,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<AuthProvider>().locale.languageCode;

    final labels = {
      'ro': {
        'title': 'Documente',
        'type': 'Tip Document',
        'cmr': 'CMR',
        'aviz': 'Aviz',
        'fuel': 'Bon Combustibil',
        'loadingPhoto': 'Foto Încărcare',
        'cargoPhoto': 'Foto Marfă',
        'other': 'Altele',
        'comment': 'Comentarii / Detalii',
        'selectFile': 'Alege Fișier / Fă O Foto',
        'upload': 'Trimite Document',
        'uploadSuccess': 'Document încărcat cu succes!',
        'preview': 'Previzualizează',
        'docList': 'Istoric Documente',
        'noDocs': 'Niciun document încărcat încă.',
        'download': 'Descarcă',
        'share': 'Trimite',
        'downloadSuccess': 'Document descărcat cu succes în galerie!',
        'shareSuccess': 'Document pregătit pentru partajare!',
        'camera': 'Scanare / Cameră',
        'gallery': 'Galerie Foto',
        'files': 'Fișiere',
        'selectTrip': 'Selectează Cursa',
        'noTrip': 'Nicio cursă',
        'selectTripErr': 'Te rog să selectezi o cursă!',
        'deleteConfirm': 'Sigur dorești să ștergi acest document?',
        'delete': 'Șterge',
        'cancel': 'Anulează',
        'deleteSuccess': 'Document șters cu succes!',
      },
      'en': {
        'title': 'Documents',
        'type': 'Document Type',
        'cmr': 'CMR',
        'aviz': 'Waybill',
        'fuel': 'Fuel Receipt',
        'loadingPhoto': 'Loading Photo',
        'cargoPhoto': 'Cargo Photo',
        'other': 'Other',
        'comment': 'Comments / Details',
        'selectFile': 'Choose File / Take A Photo',
        'upload': 'Submit Document',
        'uploadSuccess': 'Document uploaded successfully!',
        'preview': 'Preview',
        'docList': 'Document History',
        'noDocs': 'No documents uploaded yet.',
        'download': 'Download',
        'share': 'Share',
        'downloadSuccess': 'Document downloaded successfully!',
        'shareSuccess': 'Document prepared for sharing!',
        'camera': 'Scan / Camera',
        'gallery': 'Gallery',
        'files': 'Files',
        'selectTrip': 'Select Trip',
        'noTrip': 'No trip',
        'selectTripErr': 'Please select a trip!',
        'deleteConfirm': 'Are you sure you want to delete this document?',
        'delete': 'Delete',
        'cancel': 'Cancel',
        'deleteSuccess': 'Document deleted successfully!',
      },
      'nl': {
        'title': 'Documenten',
        'type': 'Documenttype',
        'cmr': 'CMR',
        'aviz': 'Vrachtbrief',
        'fuel': 'Brandstofbon',
        'loadingPhoto': 'Foto Lading',
        'cargoPhoto': 'Foto Vracht',
        'other': 'Overig',
        'comment': 'Opmerkingen / Details',
        'selectFile': 'Kies bestand / Maak foto',
        'upload': 'Document indienen',
        'uploadSuccess': 'Document succesvol geüpload!',
        'preview': 'Voorbeeld',
        'docList': 'Documentgeschiedenis',
        'noDocs': 'Nog geen documenten geüpload.',
        'download': 'Downloaden',
        'share': 'Delen',
        'downloadSuccess': 'Document succesvol gedownload!',
        'shareSuccess': 'Document gereed voor delen!',
        'camera': 'Scannen / Camera',
        'gallery': 'Galerij',
        'files': 'Bestanden',
        'selectTrip': 'Selecteer Rit',
        'noTrip': 'Geen rit',
        'selectTripErr': 'Selecteer alstublieft een rit!',
        'deleteConfirm': 'Weet u zeker dat u dit document wilt verwijderen?',
        'delete': 'Verwijderen',
        'cancel': 'Annuleren',
        'deleteSuccess': 'Document succesvol verwijderd!',
      },
      'de': {
        'title': 'Dokumente',
        'type': 'Dokumententyp',
        'cmr': 'CMR',
        'aviz': 'Frachtbrief',
        'fuel': 'Tankbeleg',
        'loadingPhoto': 'Foto Beladung',
        'cargoPhoto': 'Foto Fracht',
        'other': 'Sonstiges',
        'comment': 'Kommentare / Details',
        'selectFile': 'Datei auswählen / Foto aufnehmen',
        'upload': 'Dokument einreichen',
        'uploadSuccess': 'Dokument erfolgreich hochgeladen!',
        'preview': 'Vorschau',
        'docList': 'Dokumentenverlauf',
        'noDocs': 'Noch keine Dokumente hochgeladen.',
        'download': 'Herunterladen',
        'share': 'Teilen',
        'downloadSuccess': 'Dokument erfolgreich heruntergeladen!',
        'shareSuccess': 'Dokument bereit zum Teilen!',
        'camera': 'Scannen / Kamera',
        'gallery': 'Galerie',
        'files': 'Dateien',
        'selectTrip': 'Tour auswählen',
        'noTrip': 'Keine Tour',
        'selectTripErr': 'Bitte wählen Sie eine Tour aus!',
        'deleteConfirm': 'Möchten Sie dieses Dokument wirklich löschen?',
        'delete': 'Löschen',
        'cancel': 'Abbrechen',
        'deleteSuccess': 'Dokument erfolgreich gelöscht!',
      },
      'fr': {
        'title': 'Documents',
        'type': 'Type de document',
        'cmr': 'CMR',
        'aviz': 'Lettre de voiture',
        'fuel': 'Reçu de carburant',
        'loadingPhoto': 'Photo Chargement',
        'cargoPhoto': 'Photo Cargaison',
        'other': 'Autre',
        'comment': 'Commentaires / Détails',
        'selectFile': 'Choisir un fichier / Prendre une photo',
        'upload': 'Soumettre le document',
        'uploadSuccess': 'Document téléchargé avec succès !',
        'preview': 'Aperçu',
        'docList': 'Historique des documents',
        'noDocs': 'Aucun document téléchargé pour le moment.',
        'download': 'Télécharger',
        'share': 'Partager',
        'downloadSuccess': 'Document téléchargé avec succès !',
        'shareSuccess': 'Document prêt pour le partage !',
        'camera': 'Scanner / Caméra',
        'gallery': 'Galerie',
        'files': 'Fichiers',
        'selectTrip': 'Sélectionner la Course',
        'noTrip': 'Aucune course',
        'selectTripErr': 'Veuillez sélectionner une course !',
        'deleteConfirm': 'Voulez-vous vraiment supprimer ce document?',
        'delete': 'Supprimer',
        'cancel': 'Annuler',
        'deleteSuccess': 'Document supprimé avec succès !',
      },
    };

    final l = labels[locale] ?? labels['ro']!;

    return Scaffold(
      appBar: AppBar(title: Text(l['title']!)),
      body: RefreshIndicator(
        color: kPrimary,
        onRefresh: _fetchDocuments,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ─── UPLOAD CARD ───
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: kBorder),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(l['type']!, style: const TextStyle(fontWeight: FontWeight.bold, color: kText)),
                      const SizedBox(height: 8),
                      // Dropdown/Selector
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final typeKey in ['cmr', 'aviz', 'fuel', 'loadingPhoto', 'cargoPhoto', 'other'])
                            GestureDetector(
                              onTap: () => setState(() => _selectedTypeKey = typeKey),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _selectedTypeKey == typeKey ? kPrimary : Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: _selectedTypeKey == typeKey ? kPrimary : kBorder),
                                ),
                                child: Text(
                                  l[typeKey]!,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: _selectedTypeKey == typeKey ? Colors.white : kTextSecondary,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(l['selectTrip']!, style: const TextStyle(fontWeight: FontWeight.bold, color: kText)),
                      const SizedBox(height: 8),
                      Builder(
                        builder: (context) {
                          final availableTrips = context.watch<TripProvider>().trips
                              .where((t) => t['driver']?['user']?['id'] == context.read<AuthProvider>().user?['id'])
                              .toList();
                          final selectedTrip = availableTrips.firstWhere((t) => t['id'] == _selectedTripId, orElse: () => <String, dynamic>{});
                          final selectedRef = selectedTrip.isNotEmpty ? (selectedTrip['referenceNumber'] ?? 'Ref') : l['selectTrip']!;
                          final selectedPickup = selectedTrip.isNotEmpty ? (selectedTrip['pickupAddress'] ?? '').split(',').first : '';
                          final selectedDropoff = selectedTrip.isNotEmpty ? (selectedTrip['dropoffAddress'] ?? '').split(',').first : '';

                          return GestureDetector(
                            onTap: () => _showTripSelectionSheet(availableTrips, l),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: _selectedTripId != null ? kPrimary.withOpacity(0.5) : kBorder),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          selectedRef,
                                          style: TextStyle(
                                            fontWeight: _selectedTripId != null ? FontWeight.bold : FontWeight.normal,
                                            color: _selectedTripId != null ? kText : kTextSecondary,
                                            fontSize: 15,
                                          ),
                                        ),
                                        if (_selectedTripId != null) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            '$selectedPickup ➔ $selectedDropoff',
                                            style: const TextStyle(fontSize: 12, color: kTextSecondary),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ]
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.arrow_drop_down, color: kTextSecondary),
                                ],
                              ),
                            ),
                          );
                        }
                      ),
                      const SizedBox(height: 16),
                      Text(l['comment']!, style: const TextStyle(fontWeight: FontWeight.bold, color: kText)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _commentCtrl,
                        maxLines: 2,
                        decoration: InputDecoration(
                          hintText: l['comment'],
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.all(12),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Trigger Buttons for Files/Photos
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _handleCameraPress,
                              icon: const Icon(Icons.document_scanner, size: 18),
                              label: Text(l['camera']!),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: kSuccess,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _pickImage(ImageSource.gallery),
                              icon: const Icon(Icons.photo_outlined, size: 18),
                              label: Text(l['gallery']!),
                              style: OutlinedButton.styleFrom(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: _pickFile,
                        icon: const Icon(Icons.insert_drive_file_outlined, size: 18),
                        label: Text(l['files']!),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Selected files preview list
                      if (_selectedFiles.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          locale == 'ro'
                              ? 'Fișiere selectate (${_selectedFiles.length}):'
                              : locale == 'nl'
                                  ? 'Geselecteerde bestanden (${_selectedFiles.length}):'
                                  : 'Selected files (${_selectedFiles.length}):',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: kText),
                        ),
                        const SizedBox(height: 6),
                        for (int idx = 0; idx < _selectedFiles.length; idx++)
                          Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: kPrimaryLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: kPrimary.withOpacity(0.15)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle, color: kPrimary, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _selectedFiles[idx].path.split('/').last,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kPrimaryDark),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.cancel, color: kPrimary, size: 20),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () => setState(() => _selectedFiles.removeAt(idx)),
                                ),
                              ],
                            ),
                          ),
                      ],
                      const SizedBox(height: 16),
                      // Submit button
                      SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _loading ? null : () => _uploadDocument(l),
                          child: _loading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : Text(l['upload']!),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // ─── LIST CARD ───
              Text(
                l['docList']!,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: kText),
              ),
              const SizedBox(height: 12),
              _fetching
                  ? const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 40), child: CircularProgressIndicator(color: kPrimary)))
                  : _documentsList.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 40),
                            child: Column(
                              children: [
                                const Icon(Icons.folder_open_outlined, size: 48, color: kTextSecondary),
                                const SizedBox(height: 8),
                                Text(l['noDocs']!, style: const TextStyle(color: kTextSecondary)),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _documentsList.length,
                          itemBuilder: (ctx, i) {
                            final doc = _documentsList[i];
                            final dateStr = doc['createdAt'] != null ? formatAppDateTime(doc['createdAt']) : '';
                            return Card(
                              elevation: 0,
                              margin: const EdgeInsets.only(bottom: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(color: kBorder),
                              ),
                              child: ListTile(
                                leading: const CircleAvatar(
                                  backgroundColor: kPrimaryLight,
                                  child: Icon(Icons.document_scanner, color: kPrimary),
                                ),
                                title: Text(
                                  doc['type'],
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: kText),
                                ),
                                subtitle: Text(
                                  '$dateStr ${doc['notes'] != null && doc['notes'].isNotEmpty ? '\n${doc['notes']}' : ''}',
                                  style: const TextStyle(fontSize: 12, color: kTextSecondary),
                                ),
                                trailing: const Icon(Icons.chevron_right, color: kTextSecondary),
                                onTap: () => _showPreviewDialog(doc, l),
                              ),
                            );
                          },
                        ),
            ],
          ),
        ),
      ),
    );
  }
}
