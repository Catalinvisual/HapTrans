import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/api_client.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:signature/signature.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:ui' as ui;
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../services/document_opener.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/document_status.dart';
import '../utils/document_types.dart';
import '../utils/trip_fields.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => DocumentsScreenState();
}

class DocumentsScreenState extends State<DocumentsScreen> {
  final _commentCtrl = TextEditingController();
  final _searchCtrl = TextEditingController();
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
  String? _fetchError;
  String _scope = 'all';
  String? _typeFilter;

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
    _searchCtrl.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> refresh() => _fetchDocuments();

  Future<void> _fetchDocuments() async {
    if (!mounted) return;
    setState(() => _fetching = true);
    try {
      final dio = ApiClient.create(timeout: const Duration(seconds: 10));
      final res = await dio.get('/documents');
      if (res.data != null && mounted) {
        final allDocs = List<Map<String, dynamic>>.from(res.data);
        setState(() {
          // The backend is the authorization boundary: it already returns only
          // this driver's uploads and documents associated with his trips,
          // orders and stop tasks. Filtering again in the UI hid valid
          // order-level documents.
          _documentsList = allDocs;
          _fetchError = null;
          _documentsList.sort((a, b) {
            final dateA = DateTime.tryParse(a['uploadedAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
            final dateB = DateTime.tryParse(b['uploadedAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
            return dateB.compareTo(dateA);
          });
        });
      }
    } catch (e) {
      debugPrint('Error fetching docs: $e');
      if (mounted) setState(() => _fetchError = e.toString());
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
      final dio = ApiClient.create();

      final trips = context.read<TripProvider>().trips;
      Map<String, dynamic>? currentTrip;
      if (_selectedTripId != null) {
        try {
          currentTrip = trips.firstWhere((t) => t['id']?.toString() == _selectedTripId);
        } catch (_) {}
      }
      final tripRef = currentTrip?['tripNumber'] ?? currentTrip?['referenceNumber'];

      for (final file in _selectedFiles) {
        final ext = file.path.split('.').last;
        final cleanDocName = tripRef != null
            ? '${_selectedTypeKey.toUpperCase()}_$tripRef.$ext'
            : '${_selectedTypeKey.toUpperCase()}_Document.$ext';
        final formData = FormData.fromMap({
          'type': _selectedTypeKey.toLowerCase(),
          if (_selectedTripId != null) 'tripId': _selectedTripId,
          if (tripRef != null) 'reference': tripRef.toString(),
          'notes': _commentCtrl.text.trim(),
          'file': await MultipartFile.fromFile(file.path, filename: cleanDocName),
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
          _selectedTripId = null;
        });
        Navigator.pop(context); // Close upload sheet
        _fetchDocuments();
        context.read<TripProvider>().silentReloadTrips(auth.token!);
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
          decoration: BoxDecoration(border: Border.all(color: kBorder), borderRadius: BorderRadius.circular(8)),
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
    final activeTrips = trips.where((t) {
      final s = (t['status']?.toString() ?? '').toLowerCase();
      return !['cancelled', 'completed', 'delivered'].contains(s);
    }).toList();

    _selectedTripId = null;
    _commentCtrl.clear();
    _selectedFiles.clear();
    _signatureController.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: kCard,
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
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: kText),
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
                  children: documentTypes.map((type) {
                    final isSel = _selectedTypeKey == type.id;
                    return ChoiceChip(
                      label: Text(l.translate(type.labelKey), style: TextStyle(color: isSel ? kOnPrimary : kText, fontSize: 12, fontWeight: FontWeight.bold)),
                      selected: isSel,
                      selectedColor: kPrimary,
                      backgroundColor: kCardMuted,
                      onSelected: (_) => setSheetState(() => _selectedTypeKey = type.id),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Trip Selector (only if active trips exist)
                if (activeTrips.isNotEmpty) ...[
                  Text(
                    l.locale.languageCode == 'ro' ? 'Cursă asociată (Opțional)' : 'Associated Trip (Optional)',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: _selectedTripId,
                    hint: Text(
                      l.locale.languageCode == 'ro' ? 'Document General (Fără cursă)' : 'General Document (No Trip)',
                    ),
                    items: [
                      DropdownMenuItem(
                        value: null,
                        child: Text(
                          l.locale.languageCode == 'ro' ? 'Document General (Fără cursă)' : 'General Document (No Trip)',
                        ),
                      ),
                      ...activeTrips.map((t) => DropdownMenuItem(
                            value: t['id']?.toString(),
                            child: Text(
                              '${t['tripNumber'] ?? t['id']} (${tripPickup(t)} ➔ ${tripDropoff(t)})',
                              overflow: TextOverflow.ellipsis,
                            ),
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

                // Pick Action Buttons (Camera, Files, Signature)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                        ),
                        onPressed: () async {
                          await _pickImage(ImageSource.camera);
                          setSheetState(() {});
                        },
                        icon: Icon(Icons.camera_alt, color: kPrimary, size: 18),
                        label: Text(
                          l.translate('upload_camera'),
                          style: TextStyle(color: kPrimary, fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                        ),
                        onPressed: () async {
                          await _pickFile();
                          setSheetState(() {});
                        },
                        icon: Icon(Icons.folder, color: kPrimary, size: 18),
                        label: Text(
                          l.translate('upload_gallery_files'),
                          style: TextStyle(color: kPrimary, fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                        ),
                        onPressed: () async {
                          await _captureSignature(setSheetState);
                        },
                        icon: Icon(Icons.draw, color: kPrimary, size: 18),
                        label: Text(
                          l.locale.languageCode == 'ro' ? 'Semnătură' : 'Signature',
                          style: TextStyle(color: kPrimary, fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),

                // Selected files preview
                if (_selectedFiles.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    '${l.locale.languageCode == 'ro' ? 'Fișiere pregătite' : 'Selected files'} (${_selectedFiles.length}):',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kSuccess),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _selectedFiles.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final f = entry.value;
                      final fname = f.path.split(Platform.pathSeparator).last;
                      final isSig = fname.contains('SIG');
                      return InputChip(
                        avatar: Icon(
                          isSig ? Icons.draw : Icons.description,
                          size: 16,
                          color: isSig ? Colors.amber.shade800 : kPrimary,
                        ),
                        label: Text(
                          isSig ? (l.locale.languageCode == 'ro' ? 'Semnătură' : 'Signature') : fname,
                          style: const TextStyle(fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                        onDeleted: () {
                          setSheetState(() {
                            _selectedFiles.removeAt(idx);
                          });
                          setState(() {});
                        },
                      );
                    }).toList(),
                  ),
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
                        ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: kOnPrimary, strokeWidth: 2))
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

  List<Map<String, dynamic>> _visibleDocuments() {
    final query = _searchCtrl.text.trim().toLowerCase();
    return _documentsList.where((doc) {
      final hasTrip = _documentTripNumber(doc).isNotEmpty;
      if (_scope == 'trip' && !hasTrip) return false;
      if (_scope == 'general' && hasTrip) return false;
      final type = documentTypeOf(doc);
      if (!matchesDocumentType(doc, _typeFilter)) return false;
      if (query.isEmpty) return true;
      final haystack = [
        _documentName(doc),
        type,
        _documentTripNumber(doc),
        _documentOrderNumber(doc),
        (doc['notes'] ?? '').toString(),
      ].join(' ').toLowerCase();
      return haystack.contains(query);
    }).toList();
  }

  String _documentName(Map<String, dynamic> doc) {
    final raw = (doc['fileName'] ?? doc['originalFilename'] ?? doc['name'] ?? '').toString().trim();
    if (raw.isNotEmpty) return raw;
    final id = (doc['id'] ?? '').toString();
    return id.isEmpty ? 'Document' : 'Document #${id.substring(0, id.length < 4 ? id.length : 4)}';
  }

  String _documentType(Map<String, dynamic> doc) {
    return documentTypeOf(doc);
  }

  String _documentTripNumber(Map<String, dynamic> doc) {
    final direct = doc['trip'];
    if (direct is Map) {
      final number = (direct['tripNumber'] ?? '').toString().trim();
      if (number.isNotEmpty) return number;
    }
    final order = doc['order'];
    if (order is Map) {
      final orderTrip = order['trip'];
      if (orderTrip is Map) {
        final number = (orderTrip['tripNumber'] ?? '').toString().trim();
        if (number.isNotEmpty) return number;
      }
    }
    return (doc['tripNumber'] ?? '').toString().trim();
  }

  String _documentOrderNumber(Map<String, dynamic> doc) {
    final order = doc['order'];
    if (order is Map) {
      return (order['orderNumber'] ?? '').toString().trim();
    }
    return (doc['orderNumber'] ?? '').toString().trim();
  }

  String _documentExtension(Map<String, dynamic> doc) {
    final format = (doc['format'] ?? '').toString().trim().toLowerCase();
    if (format.isNotEmpty) return format;
    final name = _documentName(doc);
    final dot = name.lastIndexOf('.');
    return dot >= 0 && dot < name.length - 1 ? name.substring(dot + 1).toLowerCase() : '';
  }

  Widget _scopeChip(String value, String label) {
    final selected = _scope == value;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? kOnPrimary : kTextSecondary)),
        selected: selected,
        selectedColor: kPrimary,
        backgroundColor: kCardMuted,
        checkmarkColor: kOnPrimary,
        side: BorderSide(color: selected ? kPrimary : kBorder),
        onSelected: (_) => setState(() => _scope = value),
      ),
    );
  }

  Widget _filterBar(AppLocalizations l) {
    final selectedDefinition = _typeFilter == null ? null : documentTypeById(_typeFilter!);
    final selectedLabel = _typeFilter == null
        ? l.translate('docs_all_types')
        : l.translate(selectedDefinition?.labelKey ?? 'doc_type_other');
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
      child: Column(
        children: [
          TextField(
            controller: _searchCtrl,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: l.translate('docs_search_hint'),
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchCtrl.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () => setState(_searchCtrl.clear),
                    ),
              isDense: true,
              filled: true,
              fillColor: kCardMuted,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: kBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: kBorder)),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _scopeChip('all', l.translate('docs_filter_all')),
                      _scopeChip('trip', l.translate('docs_filter_trip')),
                      _scopeChip('general', l.translate('docs_filter_general')),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              PopupMenuButton<String>(
                tooltip: l.translate('docs_all_types'),
                onSelected: (value) => setState(() => _typeFilter = value == '__all__' ? null : value),
                itemBuilder: (ctx) => [
                  PopupMenuItem(value: '__all__', child: Text(l.translate('docs_all_types'))),
                  ...documentTypes.map((type) => PopupMenuItem(value: type.id, child: Text(l.translate(type.labelKey)))),
                ],
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
                  decoration: BoxDecoration(
                    color: kCard,
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(color: _typeFilter == null ? kBorder : kPrimary),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.filter_list, size: 16, color: _typeFilter == null ? kTextSecondary : kPrimary),
                      const SizedBox(width: 4),
                      Text(selectedLabel, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: _typeFilter == null ? kTextSecondary : kPrimary)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final visible = _visibleDocuments();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.translate('docs_title')),
            Text(
              '${_documentsList.length} ${l.translate('documents_available')}',
              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w500, color: kTextSecondary),
            ),
          ],
        ),
        elevation: 0,
        actions: [
          IconButton(tooltip: l.translate('btn_refresh'), onPressed: _fetchDocuments, icon: const Icon(Icons.refresh)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showUploadSheet,
        backgroundColor: kPrimary,
        icon: Icon(Icons.upload_file, color: kOnPrimary),
        label: Text(l.translate('upload_doc'), style: TextStyle(color: kOnPrimary, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          _filterBar(l),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchDocuments,
              color: kPrimary,
              child: _buildDocList(visible, l),
            ),
          ),
        ],
      ),
    );
  }

  Widget _metaChip(IconData icon, String label, {Color? color}) {
    color ??= kTextSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(kIsDark ? 0.18 : 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 3),
          Text(label, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }

  Future<void> _downloadDoc(Map<String, dynamic> doc) async {
    final token = context.read<AuthProvider>().token ?? '';
    await DocumentOpener.download(context, token: token, doc: doc);
  }

  Widget _buildDocList(List<Map<String, dynamic>> docs, AppLocalizations l) {
    if (_fetching && docs.isEmpty) {
      return Center(child: CircularProgressIndicator(color: kPrimary));
    }

    if (_fetchError != null && _documentsList.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off_outlined, size: 46, color: kTextSecondary),
              const SizedBox(height: 12),
              Text(l.translate('action_failed'), style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText)),
              const SizedBox(height: 12),
              OutlinedButton.icon(onPressed: _fetchDocuments, icon: const Icon(Icons.refresh), label: Text(l.translate('btn_refresh'))),
            ],
          ),
        ),
      );
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
                  decoration: BoxDecoration(
                    color: kCardMuted,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.description_outlined, size: 52, color: kTextMuted),
                ),
                const SizedBox(height: 16),
                Text(
                  _documentsList.isEmpty ? l.translate('no_docs_title') : l.translate('docs_no_results'),
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: kText),
                ),
                if (_documentsList.isEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    l.translate('no_docs_sub'),
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: kTextSecondary, height: 1.4),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 96),
      itemCount: docs.length,
      itemBuilder: (ctx, i) {
        final doc = docs[i];
        final rawType = _documentType(doc);
        final typeLabel = l.translate(documentTypeById(rawType)?.labelKey ?? 'doc_type_other');
        final name = _documentName(doc);
        final dateStr = doc['uploadedAt'] != null ? formatAppDateTime(doc['uploadedAt']) : '';
        final tripRef = _documentTripNumber(doc);
        final orderRef = _documentOrderNumber(doc);
        final extension = _documentExtension(doc);
        final isPdf = extension == 'pdf';
        final isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].contains(extension);
        final reviewState = documentStatusOf(doc);
        final reviewColor = reviewState == DocumentLifecycleState.approved
            ? kSuccess
            : (reviewState == DocumentLifecycleState.rejected ? kError : kPrimary);
        final reviewIcon = reviewState == DocumentLifecycleState.approved
            ? Icons.verified_outlined
            : (reviewState == DocumentLifecycleState.rejected ? Icons.cancel_outlined : Icons.cloud_done_outlined);
        final icon = isPdf ? Icons.picture_as_pdf_outlined : (isImage ? Icons.image_outlined : Icons.description_outlined);
        final iconColor = isPdf ? kError : (isImage ? kInfo : kPrimary);

        return Card(
          elevation: 0,
          color: kCard,
          surfaceTintColor: Colors.transparent,
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: kBorder),
          ),
          child: ListTile(
            onTap: () async {
              // Documents are private Cloudinary assets: open them through the
              // authenticated preview-url endpoint instead of the raw file URL.
              final docId = doc['id']?.toString();
              if (docId != null && docId.isNotEmpty) {
                final authToken = context.read<AuthProvider>().token ?? '';
                await DocumentOpener.preview(context, token: authToken, doc: doc);
                return;
              }
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.translate('action_failed'))));
              }
            },
            contentPadding: const EdgeInsets.fromLTRB(12, 6, 6, 6),
            leading: Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(kIsDark ? 0.18 : 0.09),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            title: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: [
                    _metaChip(Icons.sell_outlined, typeLabel),
                    if (tripRef.isNotEmpty) _metaChip(Icons.route_outlined, tripRef, color: kPrimary),
                    if (orderRef.isNotEmpty) _metaChip(Icons.inventory_2_outlined, orderRef, color: kInfo),
                    _metaChip(
                      reviewIcon,
                      l.translate(reviewState.labelKey),
                      color: reviewColor,
                    ),
                  ],
                ),
                if (dateStr.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(dateStr, style: TextStyle(fontSize: 10.5, color: kTextSecondary)),
                ],
                if (doc['notes'] != null && doc['notes'].toString().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(doc['notes'].toString(), style: TextStyle(fontSize: 12, color: kTextSecondary)),
                ],
                if (reviewState == DocumentLifecycleState.rejected &&
                    (doc['rejectionReason'] ?? '').toString().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    doc['rejectionReason'].toString(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: kError),
                  ),
                ],
              ],
            ),
            trailing: IconButton(
              tooltip: l.translate('docs_download'),
              icon: Icon(Icons.download_outlined, color: kPrimary, size: 20),
              onPressed: () => _downloadDoc(doc),
            ),
          ),
        );
      },
    );
  }
}
