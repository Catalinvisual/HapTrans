import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../providers/chat_provider.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<AuthProvider>().locale.languageCode;
    final trips = context.watch<TripProvider>().trips;
    final auth = context.watch<AuthProvider>();

    final translations = {
      'ro': {
        'title': 'Mesaje Dispecerat',
        'generalChat': 'Chat General Dispecerat',
        'generalSub': 'Ia legătura cu dispecerul oricând',
        'activeTrips': 'Curse Active',
        'noActive': 'Nicio cursă activă momentan',
      },
      'en': {
        'title': 'Dispatch Messages',
        'generalChat': 'General Dispatch Support',
        'generalSub': 'Contact dispatch at any time',
        'activeTrips': 'Active Trips',
        'noActive': 'No active trips at the moment',
      },
      'nl': {
        'title': 'Berichten Verzending',
        'generalChat': 'Algemene Dispatch Support',
        'generalSub': 'Neem contact op met verzending',
        'activeTrips': 'Actieve Ritten',
        'noActive': 'Geen actieve ritten op dit moment',
      },
      'de': {
        'title': 'Disponent-Nachrichten',
        'generalChat': 'Allgemeiner Support Chat',
        'generalSub': 'Wenden Sie sich jederzeit an den Disponenten',
        'activeTrips': 'Aktive Fahrten',
        'noActive': 'Momentan keine aktiven Fahrten',
      },
      'fr': {
        'title': 'Messages de Dispatch',
        'generalChat': 'Chat Support Général',
        'generalSub': 'Contactez le dispatcheur à tout moment',
        'activeTrips': 'Courses Actives',
        'noActive': 'Aucune course active pour le moment',
      },
    };
    final t = translations[locale] ?? translations['ro']!;

    final generalTrip = {
      'id': 'general',
      'client': {'name': t['generalChat']!}
    };

    return Scaffold(
      appBar: AppBar(title: Text(t['title']!)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ─── GENERAL SUPPORT CARD (ALWAYS VISIBLE) ───
          Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: kPrimary, width: 1.5),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              leading: const CircleAvatar(
                backgroundColor: kPrimaryLight,
                radius: 24,
                child: Icon(Icons.support_agent, color: kPrimary, size: 28),
              ),
              title: Text(
                t['generalChat']!,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kText),
              ),
              subtitle: Text(
                t['generalSub']!,
                style: const TextStyle(fontSize: 12, color: kTextSecondary),
              ),
              trailing: const CircleAvatar(
                backgroundColor: kPrimary,
                radius: 14,
                child: Icon(Icons.arrow_forward_ios, color: Colors.white, size: 12),
              ),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChatScreen(
                    trip: generalTrip,
                    token: auth.token!,
                    locale: locale,
                  ),
                ),
              ),
            ),
          ),
          
          // ─── ACTIVE TRIPS CHAT ───
          Text(
            t['activeTrips']!,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kText),
          ),
          const SizedBox(height: 10),
          
          if (trips.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Column(
                  children: [
                    const Icon(Icons.local_shipping_outlined, size: 48, color: kTextSecondary),
                    const SizedBox(height: 8),
                    Text(t['noActive']!, style: const TextStyle(color: kTextSecondary)),
                  ],
                ),
              ),
            )
          else
            ...trips.map((trip) {
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: kBorder),
                ),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: kPrimaryLight,
                    child: Icon(Icons.headset_mic, color: kPrimary),
                  ),
                  title: Text(
                    trip['client']?['name'] ?? 'Dispecer',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    '${trip['pickupAddress'] != null && trip['pickupAddress'].toString().length > 15 ? trip['pickupAddress'].toString().substring(0, 15) + '…' : trip['pickupAddress'] ?? ''} → ${trip['dropoffAddress'] != null && trip['dropoffAddress'].toString().length > 15 ? trip['dropoffAddress'].toString().substring(0, 15) + '…' : trip['dropoffAddress'] ?? ''}',
                    style: const TextStyle(fontSize: 12, color: kTextSecondary),
                  ),
                  trailing: const Icon(Icons.chevron_right, color: kTextSecondary),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        trip: trip,
                        token: auth.token!,
                        locale: locale,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
        ],
      ),
    );
  }
}

class ChatScreen extends StatefulWidget {
  final Map<String, dynamic> trip;
  final String token;
  final String locale;
  final bool isDirectDriverChat;
  const ChatScreen({super.key, required this.trip, required this.token, required this.locale, this.isDirectDriverChat = false});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  late ChatProvider _chatProvider;
  int _messageCount = 0;

  @override
  void initState() {
    super.initState();
    _chatProvider = context.read<ChatProvider>();
    final auth = context.read<AuthProvider>();
    
    _messageCount = _chatProvider.messages.length;
    _chatProvider.addListener(_onChatUpdate);
    
    _chatProvider.loadMessages(widget.token, widget.trip['id']);
    _chatProvider.connect(widget.token, widget.trip['id'], auth.user?['id'] ?? '');
  }

  void _onChatUpdate() {
    if (!mounted) return;
    if (_chatProvider.messages.length != _messageCount) {
      _messageCount = _chatProvider.messages.length;
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollDown());
    }
  }

  void _scrollDown() {
    if (_scroll.hasClients) {
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _send() {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    final auth = context.read<AuthProvider>();
    _chatProvider.sendMessage(widget.trip['id'], auth.user!['id'], text);
    _ctrl.clear();
  }

  @override
  void dispose() {
    _chatProvider.removeListener(_onChatUpdate);
    _chatProvider.disconnect();
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    final auth = context.watch<AuthProvider>();
    final myId = auth.user?['id'];

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
            widget.isDirectDriverChat
                ? (auth.user?['name'] ?? 'Dispecerat')
                : (widget.trip['client'] != null ? widget.trip['client']['name'] : 'Dispecer'),
            style: const TextStyle(fontSize: 16),
          ),
          Row(children: [
            Container(width: 6, height: 6, decoration: BoxDecoration(color: chat.connected ? kSuccess : kError, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text(chat.connected ? ({'ro':'Conectat','en':'Connected','nl':'Verbonden','de':'Verbunden','fr':'Connecté'}[widget.locale] ?? 'Connected') : 'Offline',
              style: TextStyle(fontSize: 11, color: chat.connected ? kSuccess : kError)),
          ]),
        ]),
      ),
      body: Column(children: [
        Expanded(child: ListView.builder(
          controller: _scroll,
          padding: const EdgeInsets.all(16),
          itemCount: chat.messages.length,
          itemBuilder: (ctx, i) {
            final msg = chat.messages[i];
            final isMe = msg['sender']?['id'] == myId;
            return Align(
              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                constraints: BoxConstraints(maxWidth: MediaQuery.of(ctx).size.width * 0.75),
                decoration: BoxDecoration(
                  color: isMe ? kPrimary : Colors.white,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(isMe ? 16 : 4),
                    bottomRight: Radius.circular(isMe ? 4 : 16),
                  ),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4)],
                ),
                child: Column(crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start, children: [
                  if (!isMe) Text(msg['sender']?['name'] ?? 'Dispecer', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kPrimary)),
                  Text(msg['content'] ?? '', style: TextStyle(color: isMe ? Colors.white : kText, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(
                    msg['createdAt'] != null ? formatAppDateTime(msg['createdAt']) : '',
                    style: TextStyle(fontSize: 10, color: isMe ? Colors.white70 : kTextSecondary),
                  ),
                ]),
              ),
            );
          },
        )),
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
          decoration: const BoxDecoration(color: kCard, border: Border(top: BorderSide(color: kBorder))),
          child: SafeArea(child: Row(children: [
            Expanded(child: TextField(
              controller: _ctrl,
              decoration: InputDecoration(
                hintText: {'ro':'Scrie un mesaj...','en':'Type a message...','nl':'Typ een bericht...','de':'Nachricht schreiben...','fr':'Écrire un message...'}[widget.locale] ?? 'Type a message...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: kBorder)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              onSubmitted: (_) => _send(),
            )),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _send,
              child: Container(
                width: 44, height: 44,
                decoration: const BoxDecoration(color: kPrimary, shape: BoxShape.circle),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ])),
        ),
      ]),
    );
  }
}
