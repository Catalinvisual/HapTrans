import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../utils/constants.dart';

/// Where a trip document should be picked from.
enum DocumentSource { camera, files }

/// Asks whether the driver wants to photograph the document or pick a file.
Future<DocumentSource?> showDocumentSourceSheet(
  BuildContext context, {
  required AppLocalizations l,
  required String documentLabel,
}) {
  return showModalBottomSheet<DocumentSource>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _DocumentSourceSheet(l: l, documentLabel: documentLabel),
  );
}

class _DocumentSourceSheet extends StatelessWidget {
  final AppLocalizations l;
  final String documentLabel;

  const _DocumentSourceSheet({required this.l, required this.documentLabel});

  @override
  Widget build(BuildContext context) {
    return Container(
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
      child: SafeArea(
        top: false,
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
                    child: Icon(Icons.add_a_photo_rounded, color: kPrimary, size: 22),
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
                          documentLabel,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: kTextSecondary,
                          ),
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
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
              child: Column(
                children: [
                  _SourceOption(
                    icon: Icons.photo_camera_rounded,
                    title: l.translate('upload_camera'),
                    primary: true,
                    onTap: () => Navigator.pop(context, DocumentSource.camera),
                  ),
                  const SizedBox(height: 10),
                  _SourceOption(
                    icon: Icons.folder_open_rounded,
                    title: l.translate('upload_gallery_files'),
                    primary: false,
                    onTap: () => Navigator.pop(context, DocumentSource.files),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SourceOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final bool primary;
  final VoidCallback onTap;

  const _SourceOption({
    required this.icon,
    required this.title,
    required this.primary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          decoration: BoxDecoration(
            color: primary
                ? kPrimaryLight.withValues(alpha: 0.55)
                : kCardMuted.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: primary ? kPrimary.withValues(alpha: 0.35) : kBorder,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: primary ? kPrimary : kCard,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(
                  icon,
                  color: primary ? kOnPrimary : kPrimary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: kText,
                  ),
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: kTextMuted, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
