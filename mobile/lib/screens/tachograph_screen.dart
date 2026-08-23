import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../l10n/app_localizations.dart';
import '../utils/constants.dart';
import '../utils/number_format.dart';
import '../providers/auth_provider.dart';

enum TachoActivity { driving, breakRest, work, availability, loading, unloading }

class TachographScreen extends StatefulWidget {
  const TachographScreen({super.key});

  @override
  State<TachographScreen> createState() => _TachographScreenState();
}

class _TachographScreenState extends State<TachographScreen> with SingleTickerProviderStateMixin {
  TachoActivity _currentActivity = TachoActivity.driving;
  DateTime _activityStartTime = DateTime.now().subtract(const Duration(minutes: 42));
  Timer? _stopwatchTimer;
  Timer? _fetchTimer;
  int _secondsElapsed = 2520;
  bool _isLoading = false;

  // Live telemetry & compliance state
  Map<String, dynamic>? _telemetryData;
  double _speed = 82.0;
  String _plateNumber = 'BT 43 VRA';
  String _truckModel = 'DAF XF 480';
  String _connectionStatus = 'LIVE';
  double _lat = 51.9191;
  double _lng = 4.4771;
  int _drivingToday = 7200; // in seconds (2h 00m)
  int _continuousDriving = 7200;
  int _weeklyDriving = 90000; // in seconds (25h 00m)
  int _dailyRest = 39600; // 11h
  int _breakRequiredIn = 9000; // in seconds (2h 30m left)

  @override
  void initState() {
    super.initState();
    _fetchLiveTelemetry();

    // 1-second local stopwatch timer
    _stopwatchTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _secondsElapsed = DateTime.now().difference(_activityStartTime).inSeconds;
        });
      }
    });

    // 4-second live polling timer
    _fetchTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _fetchLiveTelemetry();
    });
  }

  @override
  void dispose() {
    _stopwatchTimer?.cancel();
    _fetchTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchLiveTelemetry() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isLoggedIn) return;

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));
      final res = await dio.get(
        '$kApiUrl/telematics/mobile/my-truck',
        options: Options(headers: {'Authorization': 'Bearer ${auth.token}'}),
      );

      if (res.statusCode == 200 && res.data != null && mounted) {
        final data = res.data;
        setState(() {
          _telemetryData = data;
          _plateNumber = data['vehicle']?['plateNumber'] ?? 'BT 43 VRA';
          _truckModel = '${data['vehicle']?['brand'] ?? 'DAF'} ${data['vehicle']?['model'] ?? 'XF 480'}';
          _speed = (data['telematics']?['speed'] as num?)?.toDouble() ?? 82.0;
          _lat = (data['telematics']?['latitude'] as num?)?.toDouble() ?? 51.9191;
          _lng = (data['telematics']?['longitude'] as num?)?.toDouble() ?? 4.4771;
          _connectionStatus = data['telematics']?['connectionStatus'] ?? 'LIVE';

          final compliance = data['driver']?['compliance'];
          if (compliance != null) {
            _drivingToday = compliance['drivingTimeToday'] ?? _drivingToday;
            _continuousDriving = compliance['continuousDriving'] ?? _continuousDriving;
            _weeklyDriving = compliance['weeklyDrivingTime'] ?? _weeklyDriving;
            _dailyRest = compliance['dailyRestRemaining'] ?? _dailyRest;
            _breakRequiredIn = compliance['breakRequiredIn'] ?? _breakRequiredIn;
          }

          final actStr = data['driver']?['currentActivity'] ?? 'DRIVING';
          _currentActivity = _mapStringToActivity(actStr);
        });
      }
    } catch (_) {
      // Fallback silently to offline simulator state
    }
  }

  TachoActivity _mapStringToActivity(String act) {
    switch (act.toUpperCase()) {
      case 'DRIVING':
        return TachoActivity.driving;
      case 'BREAK':
      case 'REST':
        return TachoActivity.breakRest;
      case 'WORKING':
      case 'WORK':
        return TachoActivity.work;
      case 'LOADING':
        return TachoActivity.loading;
      case 'UNLOADING':
        return TachoActivity.unloading;
      case 'AVAILABILITY':
      default:
        return TachoActivity.availability;
    }
  }

  String _mapActivityToString(TachoActivity act) {
    switch (act) {
      case TachoActivity.driving:
        return 'DRIVING';
      case TachoActivity.breakRest:
        return 'BREAK';
      case TachoActivity.work:
        return 'WORKING';
      case TachoActivity.loading:
        return 'LOADING';
      case TachoActivity.unloading:
        return 'UNLOADING';
      case TachoActivity.availability:
        return 'AVAILABILITY';
    }
  }

  Future<void> _setActivity(TachoActivity activity) async {
    setState(() {
      _currentActivity = activity;
      _activityStartTime = DateTime.now();
      _secondsElapsed = 0;
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isLoggedIn) return;

    try {
      final dio = Dio();
      await dio.post(
        '$kApiUrl/telematics/mobile/activity',
        data: {'activity': _mapActivityToString(activity)},
        options: Options(headers: {'Authorization': 'Bearer ${auth.token}'}),
      );
    } catch (_) {}
  }

  String _formatDuration(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  String _formatHoursMins(int seconds) {
    final hrs = seconds ~/ 3600;
    final mins = (seconds % 3600) ~/ 60;
    return '${hrs}h ${mins.toString().padLeft(2, '0')}m';
  }

  Color _getActivityColor(TachoActivity act) {
    switch (act) {
      case TachoActivity.driving:
        return const Color(0xFF10B981); // Emerald
      case TachoActivity.breakRest:
        return const Color(0xFFF59E0B); // Amber
      case TachoActivity.work:
        return const Color(0xFF3B82F6); // Blue
      case TachoActivity.loading:
        return const Color(0xFF8B5CF6); // Purple
      case TachoActivity.unloading:
        return const Color(0xFFD946EF); // Fuchsia
      case TachoActivity.availability:
        return const Color(0xFF64748B); // Slate
    }
  }

  IconData _getActivityIcon(TachoActivity act) {
    switch (act) {
      case TachoActivity.driving:
        return Icons.directions_bus_rounded;
      case TachoActivity.breakRest:
        return Icons.coffee_rounded;
      case TachoActivity.work:
        return Icons.handyman_rounded;
      case TachoActivity.loading:
        return Icons.move_to_inbox_rounded;
      case TachoActivity.unloading:
        return Icons.outbox_rounded;
      case TachoActivity.availability:
        return Icons.schedule_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final lang = l.locale.languageCode;
    final breakMins = _breakRequiredIn ~/ 60;
    final isBreakSoon = breakMins <= 18 && breakMins > 0;
    final isBreakOverdue = breakMins <= 0 && _currentActivity == TachoActivity.driving;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          l.translate('tacho_title'),
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F172A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF64748B)),
            onPressed: () {
              _fetchLiveTelemetry();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Telemetry refreshed'), duration: Duration(seconds: 1)),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── 1. Live Telemetry & CAN-Bus Status Card ───
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.18),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.local_shipping_rounded, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _plateNumber,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 17,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              Text(
                                _truckModel,
                                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _connectionStatus == 'LIVE'
                              ? const Color(0xFF10B981).withOpacity(0.2)
                              : const Color(0xFFEF4444).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: _connectionStatus == 'LIVE'
                                ? const Color(0xFF10B981)
                                : const Color(0xFFEF4444),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 7,
                              height: 7,
                              decoration: BoxDecoration(
                                color: _connectionStatus == 'LIVE'
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFEF4444),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              _connectionStatus,
                              style: TextStyle(
                                color: _connectionStatus == 'LIVE'
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFEF4444),
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.speed_rounded, color: Color(0xFF38BDF8), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              '${fmtNum(_speed.round(), lang)} km/h',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            const Icon(Icons.location_on_rounded, color: Color(0xFFF472B6), size: 16),
                            const SizedBox(width: 4),
                            Text(
                              '${_lat.toStringAsFixed(3)}, ${_lng.toStringAsFixed(3)}',
                              style: const TextStyle(color: Colors.white70, fontSize: 11, fontFamily: 'monospace'),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            const Icon(Icons.credit_card_rounded, color: Color(0xFFA78BFA), size: 16),
                            const SizedBox(width: 4),
                            const Text(
                              'Smart 2 OK',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ─── 2. Active Activity & Real-time Stopwatch ───
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Text(
                    l.translate('current_activity').toUpperCase(),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(_getActivityIcon(_currentActivity), color: _getActivityColor(_currentActivity), size: 26),
                      const SizedBox(width: 8),
                      Text(
                        _mapActivityToString(_currentActivity),
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: _getActivityColor(_currentActivity),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _formatDuration(_secondsElapsed),
                    style: const TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                      color: Color(0xFF0F172A),
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quick Activity Switcher Pills
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      _buildActivityPill(TachoActivity.driving, 'DRIVING', Icons.directions_bus_rounded),
                      _buildActivityPill(TachoActivity.breakRest, 'BREAK', Icons.coffee_rounded),
                      _buildActivityPill(TachoActivity.work, 'WORK', Icons.handyman_rounded),
                      _buildActivityPill(TachoActivity.loading, 'LOAD', Icons.move_to_inbox_rounded),
                      _buildActivityPill(TachoActivity.unloading, 'UNLOAD', Icons.outbox_rounded),
                      _buildActivityPill(TachoActivity.availability, 'AVAIL', Icons.schedule_rounded),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // ─── 3. Modern Circular Gauges Grid (CE 561/2006) ───
            Text(
              'CONFORMITATE CE 561/2006',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: Color(0xFF64748B),
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: _buildCircularGaugeCard(
                    title: l.translate('driving_today'),
                    valueText: _formatHoursMins(_drivingToday),
                    subText: 'din max 9h',
                    progress: math.min(1.0, _drivingToday / (9 * 3600)),
                    color: const Color(0xFF3B82F6),
                    icon: Icons.timer_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildCircularGaugeCard(
                    title: 'Pauză în',
                    valueText: breakMins > 0 ? '${fmtNum(breakMins, lang)}m' : 'Pauză!',
                    subText: 'Limită: 4h 30m',
                    progress: math.max(0.0, math.min(1.0, _continuousDriving / 16200)),
                    color: isBreakOverdue
                        ? const Color(0xFFEF4444)
                        : isBreakSoon
                            ? const Color(0xFFF59E0B)
                            : const Color(0xFF10B981),
                    icon: Icons.coffee_rounded,
                    isAlert: isBreakSoon || isBreakOverdue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildCircularGaugeCard(
                    title: l.translate('weekly_driving'),
                    valueText: _formatHoursMins(_weeklyDriving),
                    subText: 'din max 56h',
                    progress: math.min(1.0, _weeklyDriving / (56 * 3600)),
                    color: const Color(0xFF8B5CF6),
                    icon: Icons.date_range_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildCircularGaugeCard(
                    title: 'Odihnă Zilnică',
                    valueText: _formatHoursMins(_dailyRest),
                    subText: 'minim 11h',
                    progress: 1.0,
                    color: const Color(0xFF0EA5E9),
                    icon: Icons.shield_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // ─── 4. Driver Compliance Legal Guidelines ───
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.gavel_rounded, color: Color(0xFF64748B), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Regulament CE 561/2006 (Ghid Oficial)',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _buildRegulationRow('• Conducere continuă maximă:', '4h 30m'),
                  _buildRegulationRow('• Pauză obligatorie:', '45m (sau 15m + 30m)'),
                  _buildRegulationRow('• Conducere zilnică maximă:', '9h (extensibil la 10h de 2x/săpt)'),
                  _buildRegulationRow('• Odihnă zilnică normală:', '11h (redusă: 9h)'),
                  _buildRegulationRow('• Conducere săptămânală maximă:', '56h (90h / 2 săptămâni)'),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityPill(TachoActivity act, String label, IconData icon) {
    final isSelected = _currentActivity == act;
    final color = _getActivityColor(act);

    return InkWell(
      onTap: () => _setActivity(act),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: isSelected ? color : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? color : const Color(0xFFE2E8F0),
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  )
                ]
              : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : const Color(0xFF64748B)),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCircularGaugeCard({
    required String title,
    required String valueText,
    required String subText,
    required double progress,
    required Color color,
    required IconData icon,
    bool isAlert = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isAlert ? color.withOpacity(0.5) : const Color(0xFFE2E8F0),
          width: isAlert ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isAlert ? color.withOpacity(0.12) : Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B)),
              ),
              Icon(icon, size: 14, color: color),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: 76,
            height: 76,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 6.5,
                  strokeCap: StrokeCap.round,
                  backgroundColor: const Color(0xFFF1F5F9),
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      valueText,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: isAlert ? color : const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            subText,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  Widget _buildRegulationRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
          Text(value, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}
