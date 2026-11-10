import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/l10n/app_localizations.dart';
import 'package:hapcargo_driver/widgets/document_source_sheet.dart';

void main() {
  testWidgets('document source sheet returns the camera option', (tester) async {
    final l = AppLocalizations(const Locale('ro'));
    DocumentSource? selected;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async {
                  selected = await showDocumentSourceSheet(
                    context,
                    l: l,
                    documentLabel: 'CMR',
                  );
                },
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('CMR'), findsOneWidget);
    await tester.tap(find.text(l.translate('upload_camera')));
    await tester.pumpAndSettle();

    expect(selected, DocumentSource.camera);
  });
}
