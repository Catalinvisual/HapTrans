/// Canonical document types shared by upload, trip upload and the filter.
/// The id is the backend enum value and is never translated.
class DocumentTypeDefinition {
  final String id;
  final String labelKey;

  const DocumentTypeDefinition(this.id, this.labelKey);
}

const List<DocumentTypeDefinition> documentTypes = [
  DocumentTypeDefinition('cmr', 'doc_type_cmr'),
  DocumentTypeDefinition('aviz', 'doc_type_aviz'),
  DocumentTypeDefinition('pod', 'doc_type_pod'),
  DocumentTypeDefinition('invoice', 'doc_type_invoice'),
  DocumentTypeDefinition('packing_list', 'doc_type_packing_list'),
  DocumentTypeDefinition('photo', 'doc_type_photo'),
  DocumentTypeDefinition('fuel', 'doc_type_fuel'),
  DocumentTypeDefinition('licence', 'doc_type_licence'),
  DocumentTypeDefinition('other', 'doc_type_other'),
];

DocumentTypeDefinition? documentTypeById(String id) {
  for (final type in documentTypes) {
    if (type.id == id) return type;
  }
  return null;
}

/// Maps legacy TMS/mobile values to the canonical backend enum id.
String normalizeDocumentType(dynamic raw) {
  final value = (raw ?? '').toString().trim().toLowerCase().replaceAll('-', '_');
  switch (value) {
    case 'aviz':
    case 'delivery_note':
    case 'delivery note':
    case 'waybill':
    case 'leveringsbon':
    case 'lieferschein':
      return 'aviz';
    case 'invoice':
    case 'factura':
    case 'factură':
    case 'factuur':
    case 'rechnung':
      return 'invoice';
    case 'packing_list':
    case 'packing list':
    case 'packinglist':
    case 'pakbon':
      return 'packing_list';
    case 'photo':
    case 'foto':
    case 'loading_photo':
    case 'cargo_photo':
      return 'photo';
    case 'fuel':
    case 'fuel_receipt':
    case 'combustibil':
    case 'brandstof':
      return 'fuel';
    case 'licence':
    case 'license':
    case 'rijbewijs':
      return 'licence';
    case 'cmr':
      return 'cmr';
    case 'pod':
      return 'pod';
    default:
      return documentTypeById(value)?.id ?? 'other';
  }
}

String documentTypeOf(Map<String, dynamic> doc) =>
    normalizeDocumentType(doc['documentType'] ?? doc['type']);

bool matchesDocumentType(Map<String, dynamic> doc, String? canonicalType) =>
    canonicalType == null || documentTypeOf(doc) == canonicalType;