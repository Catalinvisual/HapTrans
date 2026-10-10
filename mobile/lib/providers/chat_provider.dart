import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../utils/constants.dart';
import '../utils/trip_status.dart';
import '../services/notification_service.dart';

class ChatProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _messages = [];
  IO.Socket? _socket;
  bool _connected = false;
  int _unreadCount = 0;
  bool _isChatScreenActive = false;

  List<Map<String, dynamic>> get messages => _messages;
  bool get connected => _connected;
  int get unreadCount => _unreadCount;

  void setChatScreenActive(bool active) {
    _isChatScreenActive = active;
    if (active) {
      _unreadCount = 0;
      notifyListeners();
    }
  }

  // Translation maps for push notifications
  static const Map<String, Map<String, String>> _notifTranslations = {
    'ro': {
      'notif_chat_title': 'Mesaj Nou',
      'notif_chat_file': 'Fișier primit',
      'notif_trip_title': 'Actualizare Cursă',
      'notif_alert_title': 'Document Expiră Curând',
      'notif_document_title': 'Document Nou Încărcat',
    },
    'en': {
      'notif_chat_title': 'New Message',
      'notif_chat_file': 'File received',
      'notif_trip_title': 'Trip Status Update',
      'notif_alert_title': 'Document Expiring Soon',
      'notif_document_title': 'New Document Uploaded',
    },
    'nl': {
      'notif_chat_title': 'Nieuw Bericht',
      'notif_chat_file': 'Bestand ontvangen',
      'notif_trip_title': 'Rit Status Update',
      'notif_alert_title': 'Document Verloopt Binnenkort',
      'notif_document_title': 'Nieuw Document Geüpload',
    },
    'de': {
      'notif_chat_title': 'Neue Nachricht',
      'notif_chat_file': 'Datei empfangen',
      'notif_trip_title': 'Fahrt Status Aktualisierung',
      'notif_alert_title': 'Dokument Läuft Bald Ab',
      'notif_document_title': 'Neues Dokument Hochgeladen',
    },
    'fr': {
      'notif_chat_title': 'Nouveau Message',
      'notif_chat_file': 'Fichier reçu',
      'notif_trip_title': 'Mise à Jour Statut Course',
      'notif_alert_title': 'Document Expire Bientôt',
      'notif_document_title': 'Nouveau Document Téléversé',
    },
   'es': { 'notif_chat_title': 'Nuevo Mensaje', 'notif_chat_file': 'Archivo recibido', 'notif_trip_title': 'Actualización de Ruta', 'notif_alert_title': 'Documento por Vencer', 'notif_document_title': 'Documento Nuevo Subido' }, 'pl': { 'notif_chat_title': 'Nowa wiadomość', 'notif_chat_file': 'Otrzymano plik', 'notif_trip_title': 'Aktualizacja kursu', 'notif_alert_title': 'Dokument wkrótce wygasa', 'notif_document_title': 'Przesłano nowy dokument' } };

  String _tr(String key, String locale) {
    return _notifTranslations[locale]?[key] ?? _notifTranslations['en']![key] ?? key;
  }

  void connectGlobal(String token, String currentUserId, {String locale = 'ro'}) {
    if (_socket != null && _socket!.connected) return;

    _socket = IO.io(kWsUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .setExtraHeaders({'Authorization': 'Bearer $token'})
      .build());

    _socket!.onConnect((_) {
      _connected = true;
      notifyListeners();
    });

    _socket!.on('newMessageGlobal', (data) {
      if (data['sender']?['id'] != currentUserId) {
        if (!_isChatScreenActive) {
          _unreadCount++;
          final isFile = data['content'] == null || (data['content'] as String).isEmpty;
          NotificationService().showNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: _tr('notif_chat_title', locale),
            body: isFile ? _tr('notif_chat_file', locale) : (data['content'] as String),
          );
          notifyListeners();
        }
      }
    });

    // Listen for trip status updates from admin (via REST → Socket.IO broadcast)
    _socket!.on('tripUpdated', (data) {
      final driverUserId = data['driverUserId'];
      final isDriver = data['isDriver'] ?? false;
      // Only notify if this update is for the current driver and was NOT initiated by a driver
      if (!isDriver && (driverUserId == null || driverUserId == currentUserId)) {
        final status = data['status'] ?? '';
        final label = tripStatusLabel(status, locale);
        final titles = {
          'ro': 'Cursă actualizată', 'en': 'Trip Updated',
          'nl': 'Rit bijgewerkt', 'de': 'Fahrt aktualisiert', 'fr': 'Trajet mis à jour',
         'es': 'Ruta actualizada', 'pl': 'Kurs zaktualizowany' };
        final title = titles[locale] ?? 'Trip Updated';
        NotificationService().showNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: title,
          body: label.isNotEmpty ? 'Status: $label' : 'Cursa ta a fost actualizată',
        );
        notifyListeners();
      }
    });

    _socket!.onDisconnect((_) {
      _connected = false;
      notifyListeners();
    });

    _socket!.connect();
  }

  void connect(String token, String tripId, String currentUserId) {
    _socket = IO.io(kWsUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .setExtraHeaders({'Authorization': 'Bearer $token'})
      .build());

    _socket!.onConnect((_) {
      _connected = true;
      if (tripId.isNotEmpty && tripId != 'general') {
        _socket!.emit('joinTrip', {'tripId': tripId});
      }
      notifyListeners();
    });

    _socket!.on('newMessage', (data) {
      // Check if message is already in list to avoid duplicates from global listener
      if (!_messages.any((m) => m['id'] == data['id'])) {
        _messages.add(Map<String, dynamic>.from(data));
      }
      notifyListeners();
    });

    _socket?.emit('joinTrip', {'tripId': tripId});
  }

  void sendMessage(String tripId, String senderId, String content) {
    _socket?.emit('sendMessage', {
      'tripId': tripId,
      'senderId': senderId,
      'content': content,
    });
  }

  void sendLocation(String driverId, String? truckId, double lat, double lng) {
    _socket?.emit('driverLocation', {
      'driverId': driverId,
      'truckId': truckId,
      'lat': lat,
      'lng': lng,
    });
  }

  Future<void> loadMessages(String token, String tripId) async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: kApiUrl,
        headers: {'Authorization': 'Bearer $token'},
      ));
      final res = await dio.get('/chat/$tripId');
      _messages = List<Map<String, dynamic>>.from(res.data);
      notifyListeners();
    } catch (_) {}
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _messages = [];
    _connected = false;
  }
}
