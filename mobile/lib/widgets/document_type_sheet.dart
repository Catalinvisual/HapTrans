import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../utils/constants.dart';
import '../utils/document_types.dart';

/// Opens the document type picker used before a trip document is uploaded.
Future<String?> showDocumentTypeSheet(
  BuildContext context, {
  required AppLocalizations l,
  String selected = 'pod',
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _DocumentTypeSheet(l: l, selected: selected),
  );
}

class _DocumentTypeSheet extends StatelessWidget {
  final AppLocalizations l;
  final String selected;

  const _DocumentTypeSheet({required this.l, required this.selected});

  static const _icons = <String, IconData>{
    'cmr': Icons.description_outlined,
    'aviz': Icons.receipt_long_outlined,
    'pod': Icons.assignment_turned_in_outlined,
    'invoice': Icons.request_quote_outlined,
    'packing_list': Icons.inventory_2_outlined,
    'photo': Icons.photo_camera_outlined,
    'fuel': Icons.local_gas_station_outlined,
    'licence': Icons.badge_outlined,
    'other': Icons.folder_outlined,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.82,
      ),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: kShadow,
            blurRadius: 24,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 10),
          Container(
            width: 42,
            height: 4,
            decoration: BoxDecoration(
              color: kBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 12, 12),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: kPrimaryLight,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(Icons.upload_file_rounded, color: kPrimary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l.translate('upload_doc'),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: kText,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        l.translate('docs_document_type'),
                        style: TextStyle(fontSize: 12.5, color: kTextSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(Icons.close_rounded, color: kTextSecondary),
                  tooltip: l.translate('cancel'),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: kDivider),
          Flexible(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              shrinkWrap: true,
              itemCount: documentTypes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final type = documentTypes[index];
                final isSelected = type.id == selected;
                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => Navigator.pop(context, type.id),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? kPrimary.withValues(alpha: 0.08)
                            : kCardMuted.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? kPrimary : kBorder,
                          width: isSelected ? 1.4 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: isSelected ? kPrimary : kCard,
                              borderRadius: BorderRadius.circular(11),
                              border: Border.all(
                                color: isSelected ? kPrimary : kBorder,
                              ),
                            ),
                            child: Icon(
                              _icons[type.id] ?? Icons.insert_drive_file_outlined,
                              size: 19,
                              color: isSelected ? kOnPrimary : kPrimary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              l.translate(type.labelKey),
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                color: kText,
                              ),
                            ),
                          ),
                          if (isSelected)
                            Icon(Icons.check_circle_rounded, color: kPrimary, size: 22)
                          else
                            Icon(Icons.radio_button_unchecked_rounded, color: kBorder, size: 21),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
