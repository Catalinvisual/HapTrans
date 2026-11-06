import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/document_types.dart';

void main() {
  test('canonical catalog contains every backend document type exactly once', () {
    final ids = documentTypes.map((type) => type.id).toList();
    expect(ids, ['cmr', 'aviz', 'pod', 'invoice', 'packing_list', 'photo', 'fuel', 'licence', 'other']);
    expect(ids.toSet().length, ids.length);
  });

  test('legacy upload and TMS values normalize to canonical ids', () {
    expect(normalizeDocumentType('delivery_note'), 'aviz');
    expect(normalizeDocumentType('waybill'), 'aviz');
    expect(normalizeDocumentType('factura'), 'invoice');
    expect(normalizeDocumentType('packing list'), 'packing_list');
    expect(normalizeDocumentType('loading_photo'), 'photo');
    expect(normalizeDocumentType('fuel_receipt'), 'fuel');
    expect(normalizeDocumentType('license'), 'licence');
  });

  test('filtering uses ids and remains independent of translated labels', () {
    final cmr = {'documentType': 'cmr', 'type': 'CMR'};
    final pod = {'documentType': 'pod', 'type': 'POD'};
    expect(matchesDocumentType(cmr, 'cmr'), isTrue);
    expect(matchesDocumentType(cmr, 'pod'), isFalse);
    expect(matchesDocumentType(pod, 'pod'), isTrue);
    expect(matchesDocumentType(pod, null), isTrue);
  });
}