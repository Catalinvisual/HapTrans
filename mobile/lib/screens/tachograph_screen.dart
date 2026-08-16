import 'dart:async';
import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import '../utils/constants.dart';

enum TachoActivity { driving, breakRest, work, availability }

class TachographScreen extends StatefulWidget {
  const TachographScreen({super.key});

  @override
  State<TachographScreen> createState() => _TachographScreenState();
}

class _TachographScreenState extends State<TachographScreen> {
  TachoActivity _currentActivity = TachoActivity.breakRest;
  DateTime _activityStartTime = DateTime.now();
  Timer? _timer;
  int _secondsElapsed = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _secondsElapsed = DateTime.now().difference(_activityStartTime).inSeconds;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _setActivity(TachoActivity activity) {
    setState(() {
      _currentActivity = activity;
      _activityStartTime = DateTime.now();
      _secondsElapsed = 0;
    });
  }

  String _formatDuration(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(l.translate('tacho_title')),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Telematics disclaimer badge
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFF1D4ED8), size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l.translate('telematics_unavailable'),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E3A8A)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          l.translate('telematics_hint'),
                          style: const TextStyle(fontSize: 12, color: Color(0xFF3B82F6), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Current Activity Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kBorder),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  Text(
                    l.translate('current_activity').toUpperCase(),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextSecondary, letterSpacing: 1.1),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _getActivityIcon(_currentActivity),
                      const SizedBox(width: 10),
                      Text(
                        _getActivityName(l, _currentActivity),
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: _getActivityColor(_currentActivity),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _formatDuration(_secondsElapsed),
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                      color: kText,
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Mode Selector Buttons
                  Row(
                    children: [
                      _buildActivityButton(TachoActivity.driving, l.translate('driving'), Icons.directions_bus, const Color(0xFF2563EB)),
                      const SizedBox(width: 8),
                      _buildActivityButton(TachoActivity.work, l.translate('other_work'), Icons.handyman, const Color(0xFFD97706)),
                      const SizedBox(width: 8),
                      _buildActivityButton(TachoActivity.breakRest, l.translate('break_rest'), Icons.coffee, const Color(0xFF16A34A)),
                      const SizedBox(width: 8),
                      _buildActivityButton(TachoActivity.availability, l.translate('availability'), Icons.schedule, const Color(0xFF7C3AED)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Driving & Rest Metrics Grid
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: l.translate('driving_today'),
                    value: '04:15 h',
                    subtext: 'Max: 09:00 h',
                    icon: Icons.timer,
                    color: const Color(0xFF2563EB),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    title: l.translate('remaining_driving'),
                    value: '04:45 h',
                    subtext: 'Pauză: 45 min',
                    icon: Icons.hourglass_top,
                    color: kSuccess,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: l.translate('next_break_in'),
                    value: '00:15 h',
                    subtext: 'Limită: 4h 30m',
                    icon: Icons.free_breakfast,
                    color: kWarning,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    title: l.translate('weekly_driving'),
                    value: '28:40 h',
                    subtext: 'Max: 56:00 h',
                    icon: Icons.date_range,
                    color: const Color(0xFF475569),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // EU Regulation Reference Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Regulament CE 561/2006 (Ghid Șofer)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
                  ),
                  const SizedBox(height: 8),
                  _buildRegulationRow('• Conducere continuă maximă:', '4h 30m'),
                  _buildRegulationRow('• Pauză obligatorie:', '45m (sau 15m + 30m)'),
                  _buildRegulationRow('• Conducere zilnică maximă:', '9h (extensibil la 10h de 2x/săpt)'),
                  _buildRegulationRow('• Odihnă zilnică normală:', '11h (redusă: 9h)'),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildRegulationRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: kTextSecondary)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kText)),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtext,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kTextSecondary),
              ),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            subtext,
            style: const TextStyle(fontSize: 11, color: kTextSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityButton(TachoActivity activity, String label, IconData icon, Color color) {
    final isSelected = _currentActivity == activity;
    return Expanded(
      child: InkWell(
        onTap: () => _setActivity(activity),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? color : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? color : kBorder),
          ),
          child: Column(
            children: [
              Icon(icon, size: 18, color: isSelected ? Colors.white : kTextSecondary),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : kText,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _getActivityIcon(TachoActivity act) {
    return switch (act) {
      TachoActivity.driving => const Icon(Icons.directions_bus, color: Color(0xFF2563EB), size: 28),
      TachoActivity.work => const Icon(Icons.handyman, color: Color(0xFFD97706), size: 28),
      TachoActivity.breakRest => const Icon(Icons.coffee, color: Color(0xFF16A34A), size: 28),
      TachoActivity.availability => const Icon(Icons.schedule, color: Color(0xFF7C3AED), size: 28),
    };
  }

  String _getActivityName(AppLocalizations l, TachoActivity act) {
    return switch (act) {
      TachoActivity.driving => l.translate('driving'),
      TachoActivity.work => l.translate('other_work'),
      TachoActivity.breakRest => l.translate('break_rest'),
      TachoActivity.availability => l.translate('availability'),
    };
  }

  Color _getActivityColor(TachoActivity act) {
    return switch (act) {
      TachoActivity.driving => const Color(0xFF2563EB),
      TachoActivity.work => const Color(0xFFD97706),
      TachoActivity.breakRest => const Color(0xFF16A34A),
      TachoActivity.availability => const Color(0xFF7C3AED),
    };
  }
}
