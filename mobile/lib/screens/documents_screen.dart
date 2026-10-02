import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:signature/signature.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:ui' as ui;
import 'package:url_launcher/url_launcher.dart';
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/number_format.dart';
import '../utils/trip_fields.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _commentCtrl = TextEditingController();
  final _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );
  String _selectedTypeKey = 'cmr';
  String? _selectedTripId;
  final List<File> _selectedFiles = [];
  List<Map<String, dynamic>> _documentsList = [];
  bool _loading = false;
  bool _fetching = false;

  @override
  void initState() {
    super.initState();
    _fetchDocuments();
    
    // Fetch trips if empty so the trip selector doesn't disappear
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.read<TripProvider>().trips.isEmpty) {
        final token = context.read<AuthProvider>().token;
        if (token != null) {
          context.read<TripProvider>().loadTrips(token);
        }
      }
    });
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> _fetchDocuments() async {
    if (!mounted) return;
    setState(() => _fetching = true);
    try {
      final auth = context.read<AuthProvider>();
      final dio = Dio(BaseOptions(
        baseUrl: kApiUrl,
        headers: {'Authorization': 'Bearer ${auth.token}'},
        connectTimeout: const Duration(seconds: 10),
      ));
      final res = await dio.get('/documents');
      if (res.data != null && mounted) {
        final allDocs = List<Map<String, dynamic>>.from(res.data);
        setState(() {
          _documentsList = allDocs
              .where((d) => d['uploadedBy']?['id'] == auth.user?['id'] || d['tripId'] != null)
              .toList();
          _documentsList.sort((a, b) => (b['createdAt'] ?? '').toString().compareTo((a['createdAt'] ?? '').toString()));
        });
      }
    } catch (e) {
      debugPrint('Error fetching docs: $e');
    } finally {
      if (mounted) setState(() => _fetching = false);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 80);
      if (picked != null && mounted) {
        setState(() {
          _selectedFiles.add(File(picked.path));
        });
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(type: FileType.any, allowMultiple: true);
      if (result != null && mounted) {
        setState(() {
          _selectedFiles.addAll(result.paths.whereType<String>().map((p) => File(p)));
        });
      }
    } catch (e) {
      debugPrint('Error picking file: $e');
    }
  }

  Future<void> _uploadDocument(void Function(void Function()) setSheetState) async {
    final l = AppLocalizations.of(context);
    if (_selectedFiles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l.translate('no_docs_title')), backgroundColor: kWarning),
      );
      return;
    }

    setSheetState(() => _loading = true);
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthProvider>();
      final dio = Dio(BaseOptions(
        baseUrl: kApiUrl,
        headers: {'Authorization': 'Bearer ${auth.token}'},
      ));

      for (final file in _selectedFiles) {
        final ext = file.path.split('.').last;
        final formData = FormData.fromMap({
          'type': _selectedTypeKey.toLowerCase(),
          if (_selectedTripId != null) 'tripId': _selectedTripId,
          'notes': _commentCtrl.text.trim(),
          'file': await MultipartFile.fromFile(file.path, filename: 'DOC_${DateTime.now().millisecondsSinceEpoch}.$ext'),
        });
        await dio.post('/documents/upload', data: formData);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l.translate('upload_success') != 'upload_success' ? l.translate('upload_success') : 'Document încărcat cu succes!'), backgroundColor: kSuccess),
        );
        setState(() {
          _commentCtrl.clear();
          _selectedFiles.clear();
        });
        Navigator.pop(context); // Close upload sheet
        _fetchDocuments();
      }
    } catch (e) {
      debugPrint('Upload error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Eroare: $e'), backgroundColor: kError),
        );
      }
    } finally {
      if (mounted) {
        setSheetState(() => _loading = false);
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _captureSignature(void Function(void Function()) setSheetState) async {
    final l = AppLocalizations.of(context);
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.translate('signature_title'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        contentPadding: const EdgeInsets.all(16),
        content: Container(
          width: 300,
          height: 200,
          decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(8)),
          child: Signature(
            controller: _signatureController,
            backgroundColor: Colors.grey[100]!,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => _signatureController.clear(),
            child: Text(l.translate('signature_clear'), style: const TextStyle(color: Colors.red)),
          ),
          ElevatedButton(
            onPressed: () async {
              if (_signatureController.isNotEmpty) {
                final image = await _signatureController.toImage();
                if (image != null) {
                  bool merged = false;
                  if (_selectedFiles.isNotEmpty) {
                    try {
                      final docFile = _selectedFiles.last;
                      final docData = await docFile.readAsBytes();
                      final docImg = await decodeImageFromList(docData);

                      double scale = 1.0;
                      if (image.width > docImg.width) {
                        scale = docImg.width / image.width;
                      } else {
                        // Make signature visible size
                        scale = docImg.width / (image.width * 1.5);
                      }
                      
                      final sigHeight = (image.height * scale).toInt();
                      final totalHeight = docImg.height + sigHeight + 40; // 40px padding

                      final recorder = ui.PictureRecorder();
                      final canvas = Canvas(recorder);
                      
                      // Fill white background
                      canvas.drawRect(Rect.fromLTWH(0, 0, docImg.width.toDouble(), totalHeight.toDouble()), Paint()..color = Colors.white);
                      
                      // Draw original document at top
                      canvas.drawImage(docImg, Offset.zero, Paint());

                      final sigX = (docImg.width - (image.width * scale)) / 2;
                      final sigY = docImg.height.toDouble() + 20; // 20px margin below doc

                      canvas.save();
                      canvas.translate(sigX, sigY);
                      canvas.scale(scale, scale);
                      canvas.drawImage(image, Offset.zero, Paint());
                      canvas.restore();

                      final picture = recorder.endRecording();
                      final mergedImg = await picture.toImage(docImg.width, totalHeight);
                      final byteData = await mergedImg.toByteData(format: ui.ImageByteFormat.png);
                      if (byteData != null) {
                        final tempDir = await getTemporaryDirectory();
                        final mergedFile = File('${tempDir.path}/DOC_SIG_${DateTime.now().millisecondsSinceEpoch}.png');
                        await mergedFile.writeAsBytes(byteData.buffer.asUint8List());
                        
                        setSheetState(() {
                          _selectedFiles[_selectedFiles.length - 1] = mergedFile;
                        });
                        setState(() {});
                        merged = true;
                      }
                    } catch (e) {
                      debugPrint('Merge error: $e');
                    }
                  }

                  if (!merged) {
                    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
                    if (byteData != null) {
                      final buffer = byteData.buffer;
                      final tempDir = await getTemporaryDirectory();
                      final file = File('${tempDir.path}/SIG_${DateTime.now().millisecondsSinceEpoch}.png');
                      await file.writeAsBytes(buffer.asUint8List(byteData.offsetInBytes, byteData.lengthInBytes));
                      
                      setSheetState(() {
                        _selectedFiles.add(file);
                      });
                      setState(() {});
                    }
                  }
                }
                _signatureController.clear();
                Navigator.pop(ctx);
              } else {
                Navigator.pop(ctx);
              }
            },
            child: Text(l.translate('signature_save')),
          ),
        ],
      ),
    );
  }

  void _showUploadSheet() {
    final l = AppLocalizations.of(context);
    final trips = context.read<TripProvider>().trips;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l.translate('upload_doc'),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: kText),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const SizedBox(height: 16),

                // Doc Type Selector
                Text(l.translate('issue_category'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: ['cmr', 'aviz', 'fuel', 'pod', 'licence', 'other'].map((type) {
                    final isSel = _selectedTypeKey == type;
                    return ChoiceChip(
                      label: Text(type.toUpperCase(), style: TextStyle(color: isSel ? Colors.white : kText, fontSize: 12, fontWeight: FontWeight.bold)),
                      selected: isSel,
                      selectedColor: kPrimary,
                      backgroundColor: Colors.white,
                      onSelected: (_) => setSheetState(() => _selectedTypeKey = type),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Trip Selector (if available)
                if (trips.isNotEmpty) ...[
                  const Text('Trip (Optional)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: _selectedTripId,
                    hint: const Text('General Document (No Trip)'),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('General Document (No Trip)')),
                      ...trips.map((t) => DropdownMenuItem(
                            value: t['id']?.toString(),
                            child: Text('${t['tripNumber'] ?? t['id']} (${tripPickup(t)} ➔ ${tripDropoff(t)})', overflow: TextOverflow.ellipsis),
                          )),
                    ],
                    onChanged: (val) => setSheetState(() => _selectedTripId = val),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Pick Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          await _pickImage(ImageSource.camera);
                          setSheetState(() {});
                        },
                        icon: const Icon(Icons.camera_alt, color: kPrimary),
                        label: Text(l.translate('upload_camera'), style: const TextStyle(color: kPrimary)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          await _pickFile();
                          setSheetState(() {});
                        },
                        icon: const Icon(Icons.folder, color: kPrimary),
                        label: Text(l.translate('upload_gallery_files'), style: const TextStyle(color: kPrimary), overflow: TextOverflow.ellipsis),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _captureSignature(setSheetState),
                  icon: const Icon(Icons.draw, color: kPrimary),
                  label: Text(l.translate('signature_draw'), style: const TextStyle(color: kPrimary)),
                  style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 44)),
                ),

                // Selected count preview
                if (_selectedFiles.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text('Fișiere selectate: ${fmtNum(_selectedFiles.length, l.locale.languageCode)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kSuccess)),
                ],

                const SizedBox(height: 16),
                TextField(
                  controller: _commentCtrl,
                  decoration: InputDecoration(
                    hintText: l.translate('upload_notes_hint'),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _loading ? null : () => _uploadDocument(setSheetState),
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(l.translate('upload_doc')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text('${l.translate('docs_title')} v3'),
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showUploadSheet,
        backgroundColor: kPrimary,
        icon: const Icon(Icons.upload_file, color: Colors.white),
        label: Text(l.translate('upload_doc'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchDocuments,
        color: kPrimary,
        child: _buildDocList(_documentsList, l),
      ),
    );
  }

  Widget _buildDocList(List<Map<String, dynamic>> docs, AppLocalizations l) {
    if (_fetching) {
      return const Center(child: CircularProgressIndicator(color: kPrimary));
    }

    if (docs.isEmpty) {
      return Center(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF1F5F9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.description_outlined, size: 52, color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 16),
                Text(
                  l.translate('no_docs_title'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: kText),
                ),
                const SizedBox(height: 8),
                Text(
                  l.translate('no_docs_sub'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: kTextSecondary, height: 1.4),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: docs.length,
      itemBuilder: (ctx, i) {
        final doc = docs[i];
        final type = (doc['type'] ?? 'DOC').toString().toUpperCase();
        final name = doc['fileName'] ?? doc['name'] ?? 'Document #${doc['id']?.toString().substring(0, 4)}';
        final dateStr = doc['createdAt'] != null ? formatAppDateTime(doc['createdAt']) : '';
        final fileUrl = doc['fileUrl'] ?? '';

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: kBorder),
          ),
          child: ListTile(
            onTap: () async {
              if (fileUrl.isNotEmpty) {
                final uri = Uri.parse(fileUrl);
                final ext = fileUrl.split('.').last.split('?').first.toLowerCase();
                final isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].contains(ext) || fileUrl.contains('image/upload');
                
                if (isImage) {
                  showDialog(
                    context: context,
                    builder: (ctx) => Dialog(
                      backgroundColor: Colors.transparent,
                      insetPadding: const EdgeInsets.all(10),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          InteractiveViewer(
                            minScale: 0.5,
                            maxScale: 4.0,
                            child: Image.network(fileUrl, fit: BoxFit.contain, loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return const Center(child: CircularProgressIndicator(color: Colors.white));
                            }),
                          ),
                          Positioned(
                            top: 10, right: 10,
                            child: IconButton(
                              icon: const Icon(Icons.close, color: Colors.white, size: 30),
                              onPressed: () => Navigator.pop(ctx),
                            ),
                          ),
                          Positioned(
                            bottom: 20,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(backgroundColor: kPrimary, foregroundColor: Colors.white),
                                  onPressed: () => Share.share(fileUrl),
                                  icon: const Icon(Icons.share),
                                  label: const Text('Share'),
                                ),
                                const SizedBox(width: 10),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: kPrimary),
                                  onPressed: () => launchUrl(uri, mode: LaunchMode.externalApplication),
                                  icon: const Icon(Icons.download),
                                  label: const Text('Descarcă'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                } else {
                  try {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } catch (e) {
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Cannot open URL')));
                    }
                  }
                }
              }
            },
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: kPrimaryLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.description, color: kPrimary, size: 24),
            ),
            title: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(type, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kTextSecondary)),
                    ),
                    const SizedBox(width: 8),
                    Text(dateStr, style: const TextStyle(fontSize: 11, color: kTextSecondary)),
                  ],
                ),
                if (doc['notes'] != null && doc['notes'].toString().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(doc['notes'].toString(), style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                ],
              ],
            ),
            trailing: IconButton(
              icon: const Icon(Icons.share, color: kPrimary, size: 20),
              onPressed: () {
                if (fileUrl.isNotEmpty) {
                  Share.share('Document $name: $fileUrl');
                }
              },
            ),
          ),
        );
      },
    );
  }
}
