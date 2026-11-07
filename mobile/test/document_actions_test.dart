import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/services/document_opener.dart';

void main() {
  group('document file metadata', () {
    test('preserves the original PDF filename and extension', () {
      final info = DocumentOpener.infoFor(
        {'fileName': 'CMR TRP-2026-0001.PDF'},
        {},
        'https://res.cloudinary.com/demo/raw/authenticated/CMR.pdf',
      );

      expect(info.fileName, 'CMR TRP-2026-0001.PDF');
      expect(info.baseName, 'CMR TRP-2026-0001');
      expect(info.extension, 'pdf');
      expect(info.mimeType, 'application/pdf');
    });

    test('uses the backend MIME type for image previews and gallery saves', () {
      final info = DocumentOpener.infoFor(
        {'fileName': 'POD photo.png'},
        {'mimeType': 'image/png'},
        'https://example.test/photo',
      );

      expect(info.fileName, 'POD photo.png');
      expect(info.extension, 'png');
      expect(info.mimeType, 'image/png');
    });

    test('repairs a missing extension without renaming the document', () {
      final info = DocumentOpener.infoFor(
        {'fileName': 'POD signature', 'format': 'jpg'},
        {},
        'https://example.test/file',
      );

      expect(info.fileName, 'POD signature.jpg');
      expect(info.extension, 'jpg');
      expect(info.mimeType, 'image/jpeg');
    });

    test('sanitizes path separators and illegal Android filename characters',
        () {
      final info = DocumentOpener.infoFor(
        {'fileName': 'folder/CMR:1?.pdf'},
        {},
        'https://example.test/file',
      );

      expect(info.fileName, 'CMR_1_.pdf');
      expect(info.mimeType, 'application/pdf');
    });
  });
}
