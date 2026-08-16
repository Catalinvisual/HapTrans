import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';

class PodScreen extends StatefulWidget {
  final Map<String, dynamic> trip;
  final Map<String, dynamic> stop;
  final String token;

  const PodScreen({
    super.key,
    required this.trip,
    required this.stop,
    required this.token,
  });

  @override
  State<PodScreen> createState() => _PodScreenState();
}

class _PodScreenState extends State<PodScreen> {
  final _recipientCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final GlobalKey _signatureKey = GlobalKey();
  final List<Offset?> _points = [];
  final List<File> _photos = [];
  bool _submitting = false;

  @override
  void dispose() {
    _recipientCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 75);
      if (picked != null) {
        setState(() {
          _photos.add(File(picked.path));
        });
      }
    } catch (e) {
      debugPrint('Error picking photo: $e');
    }
  }

  Future<String?> _captureSignatureBase64() async {
    if (_points.isEmpty) return null;
    try {
      final boundary = _signatureKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return null;
      final image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return null;
      final bytes = byteData.buffer.asUint8List();
      return 'data:image/png;base64,${base64Encode(bytes)}';
    } catch (e) {
      debugPrint('Error capturing signature: $e');
      return null;
    }
  }

  Future<void> _submitPod() async {
    final l = AppLocalizations.of(context);
    final recipient = _recipientCtrl.text.trim();
    if (recipient.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l.translate('recipient_name') + ' is required'),
          backgroundColor: kError,
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final tripId = widget.trip['id']?.toString() ?? '';
      final stopId = widget.stop['id']?.toString() ?? '';
      final orderId = widget.stop['orderId']?.toString() ??
          (widget.trip['orders'] != null && (widget.trip['orders'] as List).isNotEmpty
              ? widget.trip['orders'][0]['id']?.toString()
              : null);

      final signatureBase64 = await _captureSignatureBase64();
      final tripProv = context.read<TripProvider>();

      // Upload attached photos as CMR/POD documents
      for (final photo in _photos) {
        await tripProv.uploadDocument(widget.token, tripId, photo.path, 'pod');
      }

      final success = await tripProv.savePod(
        widget.token,
        tripId,
        recipientName: recipient,
        signatureBase64: signatureBase64,
        notes: _notesCtrl.text.trim(),
        orderId: orderId,
        stopId: stopId,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l.translate('pod_saved_success')),
            backgroundColor: kSuccess,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      debugPrint('Error submitting POD: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(l.translate('pod_title')),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stop Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kBorder),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: kPrimaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.check_circle_outline, color: kPrimary, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.stop['companyName'] ?? widget.stop['address'] ?? 'Delivery Destination',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kText),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.stop['address'] ?? '',
                          style: const TextStyle(fontSize: 13, color: kTextSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // 1. Recipient Name Input
            Text(
              l.translate('recipient_name') + ' *',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _recipientCtrl,
              decoration: InputDecoration(
                hintText: l.translate('recipient_hint'),
                prefixIcon: const Icon(Icons.person_outline, color: kTextSecondary),
              ),
            ),
            const SizedBox(height: 18),

            // 2. Signature Pad
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  l.translate('signature'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
                ),
                if (_points.isNotEmpty)
                  TextButton(
                    onPressed: () => setState(() => _points.clear()),
                    child: const Text('Șterge / Clear', style: TextStyle(color: kError, fontSize: 12)),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            RepaintBoundary(
              key: _signatureKey,
              child: Container(
                height: 150,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kBorder, width: 1.5),
                ),
                child: GestureDetector(
                  onPanUpdate: (details) {
                    final box = context.findRenderObject() as RenderBox?;
                    if (box != null) {
                      final localPos = details.localPosition;
                      setState(() => _points.add(localPos));
                    }
                  },
                  onPanEnd: (_) => setState(() => _points.add(null)),
                  child: CustomPaint(
                    painter: SignaturePainter(points: _points),
                    child: _points.isEmpty
                        ? Center(
                            child: Text(
                              l.translate('sign_hint'),
                              style: const TextStyle(color: kTextSecondary, fontSize: 13),
                            ),
                          )
                        : const SizedBox.expand(),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // 3. Photo Attachments
            Text(
              l.translate('add_photos'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: () => _pickPhoto(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt, color: kPrimary, size: 20),
                  label: const Text('Cameră', style: TextStyle(color: kPrimary)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: kPrimary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: () => _pickPhoto(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library, color: kPrimary, size: 20),
                  label: const Text('Galerie', style: TextStyle(color: kPrimary)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: kPrimary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
            if (_photos.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 80,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _photos.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(_photos[i], width: 80, height: 80, fit: BoxFit.cover),
                      ),
                      Positioned(
                        top: 2,
                        right: 2,
                        child: GestureDetector(
                          onTap: () => setState(() => _photos.removeAt(i)),
                          child: Container(
                            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                            padding: const EdgeInsets.all(4),
                            child: const Icon(Icons.close, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 18),

            // 4. Notes Input
            Text(
              l.translate('notes'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _notesCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Stare marfă, sigilii, observații...',
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _submitting ? null : _submitPod,
                icon: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.check_circle, color: Colors.white),
                label: Text(
                  l.translate('btn_complete_delivery'),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: kSuccess,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  SignaturePainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black87
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant SignaturePainter oldDelegate) => true;
}
