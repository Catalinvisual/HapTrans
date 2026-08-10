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
  ));

  Future<void> loadTrips(String token) async {
    _loading = true; notifyListeners();
    try {
      final res = await _dio(token).get('/driver/trips');
      _trips = List<Map<String, dynamic>>.from(res.data);
      _error = null;
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        _error = '401';
      } else {
        _error = e.toString();
      }
    }
    _loading = false; notifyListeners();
  }

  Future<void> silentReloadTrips(String token) async {
    try {
      final res = await _dio(token).get('/driver/trips');
      _trips = List<Map<String, dynamic>>.from(res.data);
      _error = null;
      notifyListeners();
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        _error = '401';
        notifyListeners();
      }
    }
  }

  Future<bool> updateStatus(String token, String tripId, String status) async {
    try {
      await _dio(token).patch('/driver/trips/$tripId/status', data: {'status': status});
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
