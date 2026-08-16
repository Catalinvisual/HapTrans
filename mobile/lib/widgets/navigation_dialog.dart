import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../l10n/app_localizations.dart';
import '../utils/constants.dart';

class NavigationDialog {
  static Future<void> launchNavigation({
    required BuildContext context,
    required String address,
    double? lat,
    double? lng,
    String? companyName,
  }) async {
    final l = AppLocalizations.of(context);
    final query = (lat != null && lng != null && lat != 0 && lng != 0)
        ? '$lat,$lng'
        : Uri.encodeComponent(address.isNotEmpty ? address : (companyName ?? ''));

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: Colors.white,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: kPrimaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.navigation, color: kPrimary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l.translate('nav_select_app'),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kText),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          companyName ?? address,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13, color: kTextSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Option 1: Google Maps
              _buildNavOption(
                icon: Icons.map,
                title: l.translate('google_maps'),
                color: const Color(0xFF4285F4),
                onTap: () async {
                  Navigator.pop(ctx);
                  final uri = Uri.parse('google.navigation:q=$query&mode=d');
                  final fallback = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$query');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } else {
                    await launchUrl(fallback, mode: LaunchMode.externalApplication);
                  }
                },
              ),
              const SizedBox(height: 10),

              // Option 2: Waze
              _buildNavOption(
                icon: Icons.navigation_rounded,
                title: l.translate('waze'),
                color: const Color(0xFF33CCFF),
                onTap: () async {
                  Navigator.pop(ctx);
                  final uri = (lat != null && lng != null && lat != 0)
                      ? Uri.parse('waze://?ll=$lat,$lng&navigate=yes')
                      : Uri.parse('waze://?q=$query&navigate=yes');
                  final fallback = Uri.parse('https://www.waze.com/ul?q=$query&navigate=yes');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } else {
                    await launchUrl(fallback, mode: LaunchMode.externalApplication);
                  }
                },
              ),
              const SizedBox(height: 10),

              // Option 3: Browser / Fallback Maps
              _buildNavOption(
                icon: Icons.public,
                title: l.translate('browser_maps'),
                color: Colors.blueGrey,
                onTap: () async {
                  Navigator.pop(ctx);
                  final fallback = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');
                  await launchUrl(fallback, mode: LaunchMode.externalApplication);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildNavOption({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: kBorder),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: kText),
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: kTextSecondary),
          ],
        ),
      ),
    );
  }
}
