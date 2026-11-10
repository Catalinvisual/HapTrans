import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/l10n/app_localizations.dart';
import 'package:hapcargo_driver/widgets/document_type_sheet.dart';

void main() {
  testWidgets('document type sheet returns the selected type', (tester) async {
    final l = AppLocalizations(const Locale('ro'));
    String? selected;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async {
                  selected = await showDocumentTypeSheet(context, l: l);
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

    expect(find.text(l.translate('upload_doc')), findsOneWidget);
    await tester.tap(find.text(l.translate('doc_type_cmr')));
    await tester.pumpAndSettle();

    expect(selected, 'cmr');
  });
}
