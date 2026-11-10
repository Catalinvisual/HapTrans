import 'package:dio/dio.dart';

import '../utils/constants.dart';
import 'session_manager.dart';

/// Creates the Dio client every authenticated screen and provider uses.
///
/// It attaches the current access token, renews it through the shared
/// [SessionManager] when the server answers 401, and retries the original
/// request exactly once. A failed renewal ends the session instead of looping.
class ApiClient {
  const ApiClient._();

  static Dio create({
    String? baseUrl,
    Duration timeout = const Duration(seconds: 15),
  }) {
    final dio = Dio(BaseOptions(
      baseUrl: baseUrl ?? kApiUrl,
      connectTimeout: timeout,
      receiveTimeout: timeout,
      headers: {'x-client-platform': 'mobile'},
    ));
    dio.interceptors.add(_SessionInterceptor(dio));
    return dio;
  }

  static bool isAuthPath(String path) =>
      path.contains('/auth/login') || path.contains('/auth/refresh');
}

class _SessionInterceptor extends Interceptor {
  _SessionInterceptor(this.dio);

  final Dio dio;

  static const _retriedKey = 'session_retried';

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (ApiClient.isAuthPath(options.path)) {
      handler.next(options);
      return;
    }

    try {
      final token = await SessionManager.instance.ensureFreshAccessToken();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    } catch (_) {
      // The request still proceeds; the server decides whether it is public.
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final options = err.requestOptions;
    final alreadyRetried = options.extra[_retriedKey] == true;

    if (err.response?.statusCode != 401 ||
        alreadyRetried ||
        ApiClient.isAuthPath(options.path)) {
      handler.next(err);
      return;
    }

    final renewed = await SessionManager.instance.refresh();
    if (!renewed) {
      handler.next(err);
      return;
    }

    final token = SessionManager.instance.accessToken;
    if (token == null) {
      handler.next(err);
      return;
    }

    options.extra[_retriedKey] = true;
    options.headers['Authorization'] = 'Bearer $token';
    try {
      final response = await dio.fetch(options);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    } catch (_) {
      handler.next(err);
    }
  }
}
