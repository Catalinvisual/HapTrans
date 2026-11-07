import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../utils/constants.dart';

class TripProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _trips = [];
  bool _loading = false;
  String? _error;

  List<Map<String, dynamic>> get trips => _trips;
  bool get loading => _loading;
  String? get error => _error;

  Dio _dio(String token) => Dio(BaseOptions(
    baseUrl: kApiUrl,
    headers: {'Authorization': 'Bearer $token'},
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
  ));

  /// The driver endpoint is the only source of assigned jobs. It is scoped to
  /// the authenticated account on the server, so there is deliberately no
  /// fallback to the fleet-wide /trips list: a failure must surface as an
  /// error, never as a silently different (and less restricted) result set.
  Future<void> loadTrips(String token) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await _dio(token).get('/trips/driver/trips');
      _trips = res.data is List
          ? List<Map<String, dynamic>>.from(res.data)
          : <Map<String, dynamic>>[];
      _error = null;
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        _error = '401';
      } else {
        // Keep the last known assignment visible instead of emptying the app.
        _error = _errorText(e);
      }
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> silentReloadTrips(String token) async {
    try {
      final res = await _dio(token).get('/trips/driver/trips');
      _trips = res.data is List
          ? List<Map<String, dynamic>>.from(res.data)
          : <Map<String, dynamic>>[];
      _error = null;
      notifyListeners();
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        _error = '401';
        notifyListeners();
      }
    }
  }

  Map<String, dynamic>? tripById(String tripId) {
    for (final t in _trips) {
      if (t['id'] == tripId) return t;
    }
    return null;
  }

  /// Server message when available (it explains invalid transitions in the
  /// driver's language), otherwise a short generic reason.
  String? _errorText(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        final m = data['message'];
        return m is List ? m.join(' ') : m.toString();
      }
      if (e.response?.statusCode != null) return 'HTTP ${e.response!.statusCode}';
      return e.message ?? e.type.name;
    }
    return e.toString();
  }

  /// Driver acknowledges receiving the dispatched trip.
  Future<String?> driverReceived(String token, String tripId) async {
    try {
      await _dio(token).post('/planning/trips/$tripId/driver-received');
      await silentReloadTrips(token);
      return null;
    } catch (e) {
      debugPrint('driverReceived error: $e');
      return _errorText(e);
    }
  }

  /// Driver accepts the trip.
  Future<String?> driverAccepted(String token, String tripId) async {
    try {
      await _dio(token).post('/planning/trips/$tripId/driver-accepted');
      await silentReloadTrips(token);
      return null;
    } catch (e) {
      debugPrint('driverAccepted error: $e');
      return _errorText(e);
    }
  }

  /// Starts the journey to the pickup. The backend validates ownership and the
  /// lifecycle transition and records the event as coming from the driver app.
  Future<String?> startTrip(String token, String tripId) async {
    try {
      await _dio(token).patch('/trips/$tripId', data: {'status': 'started'});
      await silentReloadTrips(token);
      return null;
    } catch (e) {
      debugPrint('startTrip error: $e');
      return _errorText(e);
    }
  }

  Future<String?> updateStatus(String token, String tripId, String status) async {
    try {
      await _dio(token).patch('/trips/$tripId', data: {'status': status});
      await silentReloadTrips(token);
      return null;
    } catch (e) {
      return _errorText(e);
    }
  }

  /// Advances a stop. The server updates stop, trip and order state together,
  /// so the TMS is correct immediately after this call returns.
  Future<String?> updateStopStatus(String token, String stopId, String status) async {
    try {
      await _dio(token).patch('/trips/stops/$stopId/status', data: {'status': status});
      await silentReloadTrips(token);
      return null;
    } catch (e) {
      return _errorText(e);
    }
  }

  Future<String?> updateTaskStatus(String token, String taskId, String status) async {
    try {
      await _dio(token).patch('/trips/tasks/$taskId/status', data: {'status': status});
      await silentReloadTrips(token);
      return null;
    } catch (e) {
      return _errorText(e);
    }
  }

  /// Attributed status history for the trip detail timeline.
  Future<List<Map<String, dynamic>>> statusHistory(String token, String tripId) async {
    try {
      final res = await _dio(token).get('/trips/$tripId/status-history');
      if (res.data is List) {
        return List<Map<String, dynamic>>.from(res.data);
      }
    } catch (e) {
      debugPrint('statusHistory error: $e');
    }
    return <Map<String, dynamic>>[];
  }

  Future<String?> reportIssue(
    String token,
    String tripId, {
    required String category,
    required String description,
    String? stopId,
    List<String>? photoUrls,
  }) async {
    try {
      await _dio(token).post('/trips/$tripId/report-issue', data: {
        'category': category,
        'description': description,
        'stopId': stopId,
        'photoUrls': photoUrls ?? [],
      });
      return null;
    } catch (e) {
      debugPrint('reportIssue error: $e');
      return _errorText(e);
    }
  }

  Future<String?> reportDelay(
    String token,
    String tripId, {
    required String reason,
    required int estimatedDelayMinutes,
    String? stopId,
  }) async {
    try {
      await _dio(token).post('/trips/$tripId/report-delay', data: {
        'reason': reason,
        'estimatedDelayMinutes': estimatedDelayMinutes,
        'stopId': stopId,
      });
      return null;
    } catch (e) {
      debugPrint('reportDelay error: $e');
      return _errorText(e);
    }
  }

  Future<String?> savePod(
    String token,
    String tripId, {
    required String recipientName,
    String? signatureBase64,
    List<String>? photoUrls,
    String? notes,
    String? orderId,
    String? stopId,
  }) async {
    try {
      await _dio(token).post('/trips/$tripId/pod', data: {
        'recipientName': recipientName,
        'signatureBase64': signatureBase64,
        'photoUrls': photoUrls ?? [],
        'notes': notes,
        'orderId': orderId,
        'stopId': stopId,
      });
      await loadTrips(token);
      return null;
    } catch (e) {
      debugPrint('savePod error: $e');
      return _errorText(e);
    }
  }

  /// Short-lived signed URL for one document, after the server has verified
  /// that the document belongs to a trip this driver runs.
  /// `null` means the request failed; an empty list is a successful response
  /// with no documents, so the UI never reports files as missing after an error.
  Future<List<Map<String, dynamic>>?> documentsForTrip(String token, String tripId) async {
    try {
      final res = await _dio(token).get('/documents/trip/$tripId');
      if (res.data is List) return List<Map<String, dynamic>>.from(res.data);
      return <Map<String, dynamic>>[];
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>> documentPreview(String token, String documentId) async {
    try {
      final res = await _dio(token).get('/documents/$documentId/preview-url');
      if (res.data is Map) return Map<String, dynamic>.from(res.data as Map);
      return {'error': 'HTTP ${res.statusCode}'};
    } catch (e) {
      return {'error': _errorText(e)};
    }
  }

  Future<String?> uploadDocument(String token, String tripId, String filePath, String type) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
        'tripId': tripId,
        'type': type,
      });
      await _dio(token).post('/documents/upload', data: formData);
      return null;
    } catch (e) {
      return _errorText(e);
    }
  }

  /// Uploads one rejection photograph and returns the persisted Document row.
  /// The incident is not submitted until every evidence id is available, so a
  /// failed upload can be retried without losing the driver's report.
  Future<Map<String, dynamic>> uploadIncidentPhoto(
    String token,
    String tripId,
    String filePath,
  ) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
        'tripId': tripId,
        'type': 'photo',
      });
      final res = await _dio(token).post('/documents/upload', data: formData);
      if (res.data is Map) return Map<String, dynamic>.from(res.data as Map);
      return {'error': 'Unexpected upload response'};
    } catch (e) {
      return {'error': _errorText(e)};
    }
  }

  Future<String?> submitDeliveryIncident(
    String token,
    String tripId, {
    required String clientRequestId,
    required String reason,
    required String outcome,
    String? stopId,
    String? orderId,
    String? notes,
    int? affectedPallets,
    double? affectedQuantity,
    String? quantityUnit,
    String? customerName,
    String? customerExplanation,
    bool signatureRefused = false,
    List<String> photoIds = const [],
    double? latitude,
    double? longitude,
  }) async {
    try {
      await _dio(token).post('/trips/$tripId/delivery-incidents', data: {
        'clientRequestId': clientRequestId,
        'reason': reason,
        'reasonCode': 'OTHER',
        'outcome': outcome,
        'stopId': stopId,
        'orderId': orderId,
        'notes': notes,
        'affectedPallets': affectedPallets,
        'affectedQuantity': affectedQuantity,
        'quantityUnit': quantityUnit,
        'customerName': customerName,
        'customerExplanation': customerExplanation,
        'signatureRefused': signatureRefused,
        'photoIds': photoIds,
        'latitude': latitude,
        'longitude': longitude,
      });
      await silentReloadTrips(token);
      return null;
    } catch (e) {
      return _errorText(e);
    }
  }

  Future<List<Map<String, dynamic>>> deliveryIncidents(String token, String tripId) async {
    try {
      final res = await _dio(token).get('/trips/$tripId/delivery-incidents');
      if (res.data is List) return List<Map<String, dynamic>>.from(res.data);
    } catch (e) {
      debugPrint('deliveryIncidents error: $e');
    }
    return <Map<String, dynamic>>[];
  }
}
