import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../services/background_location_service.dart';

class MapScreen extends StatefulWidget {
  final bool isActive;
  const MapScreen({super.key, this.isActive = false});
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  LatLng? _pos;
  final _mapCtrl = MapController();
  bool _tracking = false;
  StreamSubscription<Position>? _localGpsSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getLocation(forcePrompt: false);
    });
  }

  @override
  void didUpdateWidget(covariant MapScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !oldWidget.isActive) {
      _getLocation(forcePrompt: false);
    }
  }

  Future<void> _getLocation({bool forcePrompt = false}) async {
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        if (forcePrompt) {
          perm = await Geolocator.requestPermission();
        } else {
          return;
        }
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

      if (mounted) {
        if (forcePrompt) {
          await BackgroundLocationService.requestAlwaysLocationPermission(context);
        }
      }

      // Fetch last known location instantly for zero delay centering
      final lastPos = await Geolocator.getLastKnownPosition();
      if (lastPos != null) {
        final ll = LatLng(lastPos.latitude, lastPos.longitude);
        setState(() => _pos = ll);
        _mapCtrl.move(ll, 15);
      }

      // Query current high-accuracy position in background
      final p = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
      final ll = LatLng(p.latitude, p.longitude);
      setState(() => _pos = ll);
      _mapCtrl.move(ll, 15);
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  void _toggleTracking() async {
    final auth = context.read<AuthProvider>();
    final tripProv = context.read<TripProvider>();
    
    final granted = await BackgroundLocationService.requestAlwaysLocationPermission(context);
    if (!granted) return;

    setState(() => _tracking = !_tracking);
    if (_tracking) {
      String? activeTruckId;
      try {
        final activeTrip = tripProv.trips.firstWhere(
          (t) => t['status'] == 'in_progress',
          orElse: () => tripProv.trips.firstWhere(
            (t) => t['status'] == 'confirmed',
            orElse: () => <String, dynamic>{},
          ),
        );
        if (activeTrip.isNotEmpty && activeTrip['truck'] != null) {
          activeTruckId = activeTrip['truck']['id'];
        }
      } catch (_) {}

      await BackgroundLocationService.start(
        token: auth.token!,
        userId: auth.user!['id'],
        truckId: activeTruckId,
      );

      _localGpsSub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).listen((p) {
        if (!_tracking) return;
        final ll = LatLng(p.latitude, p.longitude);
        setState(() => _pos = ll);
        _mapCtrl.move(ll, 15);
      });
    } else {
      await BackgroundLocationService.stop();
      _localGpsSub?.cancel();
      _localGpsSub = null;
    }
  }

  @override
  void dispose() {
    _localGpsSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<AuthProvider>().locale.languageCode;
    final tripProv = context.watch<TripProvider>();
    final bool hasActiveTrip = tripProv.trips.any((t) => t['status'] == 'in_progress' || t['status'] == 'confirmed');

    return Scaffold(
      appBar: AppBar(title: Text({'ro':'Hartă Live','en':'Live Map','nl':'Live Kaart','de':'Live-Karte','fr':'Carte en direct'}[locale] ?? 'Live Map')),
      body: Stack(children: [
        FlutterMap(
          mapController: _mapCtrl,
          options: MapOptions(initialCenter: _pos ?? const LatLng(45.9, 25.0), initialZoom: _pos != null ? 15 : 7),
          children: [
            TileLayer(
              urlTemplate: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.hapcargo.driver'
            ),
            if (_pos != null) MarkerLayer(markers: [
              Marker(point: _pos!, width: 48, height: 48, child: Container(
                decoration: BoxDecoration(color: kPrimary, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3), boxShadow: [BoxShadow(color: kPrimary.withOpacity(0.4), blurRadius: 12)]),
                child: const Icon(Icons.local_shipping, color: Colors.white, size: 24),
              )),
            ]),
          ],
        ),
        // Recenter Button
        Positioned(bottom: 24, left: 16, child: FloatingActionButton(
          heroTag: 'recenter_btn',
          onPressed: () => _getLocation(forcePrompt: true),
          backgroundColor: Colors.white,
          child: const Icon(Icons.my_location, color: kPrimary),
        )),
        // Start/Stop Tracking Button
        Positioned(bottom: 24, right: 16, child: FloatingActionButton.extended(
          heroTag: 'tracking_btn',
          onPressed: hasActiveTrip ? null : _toggleTracking,
          backgroundColor: (hasActiveTrip || _tracking) ? kSuccess : kPrimary,
          icon: Icon((hasActiveTrip || _tracking) ? Icons.gps_fixed : Icons.play_arrow),
          label: Text(hasActiveTrip 
            ? ({'ro':'Tracking automat','en':'Auto tracking','nl':'Automatisch tr.'}[locale] ?? 'Auto tracking')
            : (_tracking ? 'Stop' : ({'ro':'Pornește tracking','en':'Start tracking','nl':'Starten','de':'Tracking starten','fr':'Démarrer le suivi'}[locale] ?? 'Start tracking'))),
        )),
      ]),
    );
  }
}
