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

  Future<void> loadTrips(String token) async {
    _loading = true;
    notifyListeners();
    try {
      Response res;
      try {
        res = await _dio(token).get('/trips/driver/trips');
      } catch (_) {
        res = await _dio(token).get('/trips');
      }
      if (res.data != null) {
        _trips = List<Map<String, dynamic>>.from(res.data);
      }
      _error = null;
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        _error = '401';
      } else {
        _error = e.toString();
      }
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> silentReloadTrips(String token) async {
    try {
      Response res;
      try {
        res = await _dio(token).get('/trips/driver/trips');
      } catch (_) {
        res = await _dio(token).get('/trips');
      }
      if (res.data != null) {
        _trips = List<Map<String, dynamic>>.from(res.data);
      }
      _error = null;
      notifyListeners();
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        _error = '401';
        notifyListeners();
      }
    }
  }

  /// Driver acknowledges receiving the dispatched trip
  Future<bool> driverReceived(String token, String tripId) async {
    try {
      try {
        await _dio(token).post('/planning/trips/$tripId/driver-received');
      } catch (_) {
        await _dio(token).patch('/trips/$tripId', data: {'status': 'driver_received'});
      }
      await loadTrips(token);
      return true;
    } catch (e) {
      debugPrint('driverReceived error: $e');
      return false;
    }
  }

  /// Driver accepts the trip
  Future<bool> driverAccepted(String token, String tripId) async {
    try {
      try {
        await _dio(token).post('/planning/trips/$tripId/driver-accepted');
      } catch (_) {
        await _dio(token).patch('/trips/$tripId', data: {'status': 'driver_accepted'});
      }
      await loadTrips(token);
      return true;
    } catch (e) {
      debugPrint('driverAccepted error: $e');
      return false;
    }
  }

  /// Driver starts transit
  Future<bool> startTrip(String token, String tripId) async {
    try {
      await _dio(token).patch('/trips/$tripId', data: {'status': 'in_transit'});
      await loadTrips(token);
      return true;
    } catch (e) {
      debugPrint('startTrip error: $e');
      return false;
    }
  }

  Future<bool> updateStatus(String token, String tripId, String status) async {
    try {
      await _dio(token).patch('/trips/$tripId', data: {'status': status});
      await loadTrips(token);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateStopStatus(String token, String stopId, String status) async {
    try {
      await _dio(token).patch('/trips/stops/$stopId/status', data: {'status': status});
      await silentReloadTrips(token);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateTaskStatus(String token, String taskId, String status) async {
    try {
      await _dio(token).patch('/trips/tasks/$taskId/status', data: {'status': status});
      await silentReloadTrips(token);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> reportIssue(
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
      return true;
    } catch (e) {
      debugPrint('reportIssue error: $e');
      return false;
    }
  }

  Future<bool> reportDelay(
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
      return true;
    } catch (e) {
      debugPrint('reportDelay error: $e');
      return false;
    }
  }

  Future<bool> savePod(
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
      return true;
    } catch (e) {
      debugPrint('savePod error: $e');
      return false;
    }
  }

  Future<bool> uploadDocument(String token, String tripId, String filePath, String type) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
        'tripId': tripId,
        'type': type,
      });
      await _dio(token).post('/documents/upload', data: formData);
      return true;
    } catch (e) {
      return false;
    }
  }
}
