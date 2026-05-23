import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  LatLng? _pos;
  final _mapCtrl = MapController();
  bool _tracking = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getLocation();
    });
  }

  Future<void> _getLocation() async {
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

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
    final chat = context.read<ChatProvider>();
    final tripProv = context.read<TripProvider>();
    setState(() => _tracking = !_tracking);
    if (_tracking) {
      if (!chat.connected) {
        chat.connect(auth.token!, '', auth.user?['id'] ?? '');
      }

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

      // Send initial location immediately if already available
      if (_pos != null) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (_tracking && _pos != null) {
            chat.sendLocation(auth.user!['id'], activeTruckId, _pos!.latitude, _pos!.longitude);
          }
        });
      } else {
        try {
          final p = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: const Duration(seconds: 5),
          );
          final ll = LatLng(p.latitude, p.longitude);
          setState(() => _pos = ll);
          _mapCtrl.move(ll, 15);
          Future.delayed(const Duration(milliseconds: 500), () {
            if (_tracking) {
              chat.sendLocation(auth.user!['id'], activeTruckId, p.latitude, p.longitude);
            }
          });
        } catch (e) {
          debugPrint('Error getting immediate position: $e');
        }
      }

      Geolocator.getPositionStream(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10)).listen((p) {
        if (!_tracking) return;
        final ll = LatLng(p.latitude, p.longitude);
        setState(() => _pos = ll);
        _mapCtrl.move(ll, 15);
        chat.sendLocation(auth.user!['id'], activeTruckId, p.latitude, p.longitude);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<AuthProvider>().locale.languageCode;
    return Scaffold(
      appBar: AppBar(title: Text({'ro':'Hartă Live','en':'Live Map','nl':'Live Kaart','de':'Live-Karte','fr':'Carte en direct'}[locale] ?? 'Live Map')),
      body: Stack(children: [
        FlutterMap(
          mapController: _mapCtrl,
          options: MapOptions(initialCenter: _pos ?? const LatLng(45.9, 25.0), initialZoom: _pos != null ? 15 : 7),
          children: [
            TileLayer(
              urlTemplate: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.haptrans.driver'
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
          onPressed: _getLocation,
          backgroundColor: Colors.white,
          child: const Icon(Icons.my_location, color: kPrimary),
        )),
        // Start/Stop Tracking Button
        Positioned(bottom: 24, right: 16, child: FloatingActionButton.extended(
          heroTag: 'tracking_btn',
          onPressed: _toggleTracking,
          backgroundColor: _tracking ? kSuccess : kPrimary,
          icon: Icon(_tracking ? Icons.stop : Icons.play_arrow),
          label: Text(_tracking ? 'Stop' : ({'ro':'Pornește tracking','en':'Start tracking','nl':'Starten','de':'Tracking starten','fr':'Démarrer le suivi'}[locale] ?? 'Start tracking')),
        )),
      ]),
    );
  }
}
