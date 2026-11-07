import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';

import '../utils/constants.dart';

/// Full-screen image preview. Bytes stay in memory; opening a document never
/// writes a user-visible copy or announces a download.
class ImagePreviewScreen extends StatelessWidget {
  final Uint8List bytes;
  final String title;

  const ImagePreviewScreen({
    super.key,
    required this.bytes,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: SafeArea(
        child: InteractiveViewer(
          minScale: 1,
          maxScale: 5,
          child: Center(
            child: Image.memory(
              bytes,
              fit: BoxFit.contain,
              gaplessPlayback: true,
              errorBuilder: (_, __, ___) => const Center(
                child: Icon(Icons.broken_image_outlined, color: Colors.white54, size: 52),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// In-app PDF reader with vertical page scrolling, pinch zoom and a normal back
/// action. The signed PDF is loaded from memory, so no duplicate file is saved.
class PdfPreviewScreen extends StatefulWidget {
  final Uint8List bytes;
  final String title;

  const PdfPreviewScreen({
    super.key,
    required this.bytes,
    required this.title,
  });

  @override
  State<PdfPreviewScreen> createState() => _PdfPreviewScreenState();
}

class _PdfPreviewScreenState extends State<PdfPreviewScreen> {
  late final PdfControllerPinch _controller;

  @override
  void initState() {
    super.initState();
    _controller = PdfControllerPinch(
      document: PdfDocument.openData(widget.bytes),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          PdfPageNumber(
            controller: _controller,
            builder: (_, loadingState, page, pagesCount) => Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 14),
                child: Text(
                  pagesCount == null ? '…' : '$page / $pagesCount',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSecondary),
                ),
              ),
            ),
          ),
        ],
      ),
      body: PdfViewPinch(
        controller: _controller,
        backgroundDecoration: BoxDecoration(color: kCardMuted),
        builders: PdfViewPinchBuilders<DefaultBuilderOptions>(
          options: const DefaultBuilderOptions(),
          documentLoaderBuilder: (_) => Center(
            child: CircularProgressIndicator(color: kPrimary, strokeWidth: 2.5),
          ),
          pageLoaderBuilder: (_) => Center(
            child: CircularProgressIndicator(color: kPrimary, strokeWidth: 2),
          ),
          errorBuilder: (_, error) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.picture_as_pdf_outlined, size: 44, color: kError),
                  const SizedBox(height: 12),
                  Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: kTextSecondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
