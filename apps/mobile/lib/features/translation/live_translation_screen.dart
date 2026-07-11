import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../../core/config.dart';

class LiveTranslationScreen extends StatefulWidget {
  const LiveTranslationScreen({super.key});

  @override
  State<LiveTranslationScreen> createState() => _LiveTranslationScreenState();
}

class _LiveTranslationScreenState extends State<LiveTranslationScreen> {
  final _supabase = Supabase.instance.client;
  final List<Map<String, String>> _messages = [];
  final _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _translating = false;

  String _sourceLang = 'English';
  String _targetLang = 'Azerbaijani';

  final List<String> _languages = [
    'English',
    'Spanish',
    'Azerbaijani',
    'Turkish',
    'Russian',
    'German',
  ];

  String get _serverUrl => AppConfig.backendUrl;

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _translateSpeech() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    _textController.clear();
    setState(() {
      _messages.add({
        'role': 'user',
        'text': text,
        'lang': _sourceLang,
      });
      _translating = true;
    });
    _scrollToBottom();

    try {
      final token = _supabase.auth.currentSession?.accessToken;
      final response = await http.post(
        Uri.parse('$_serverUrl/api/translation/translate'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'text': text,
          'sourceLang': _sourceLang,
          'targetLang': _targetLang,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception(jsonDecode(response.body)['error'] ?? 'API failed');
      }

      final data = jsonDecode(response.body);
      final translated = data['translatedText'];

      setState(() {
        _messages.add({
          'role': 'bot',
          'text': translated,
          'lang': _targetLang,
        });
      });
      _scrollToBottom();
    } catch (err) {
      setState(() {
        _messages.add({
          'role': 'error',
          'text': 'Translation failed: $err',
          'lang': '',
        });
      });
      _scrollToBottom();
    } finally {
      setState(() => _translating = false);
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Live Translation',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5),
        ),
      ),
      body: Column(
        children: [
          // Language Selectors Header Card
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[900]?.withValues(alpha: 0.5) : Colors.grey[100]?.withValues(alpha: 0.5),
              border: Border(bottom: BorderSide(color: theme.colorScheme.outlineVariant, width: 0.5)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _sourceLang,
                    decoration: InputDecoration(
                      labelText: 'From',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: _languages
                        .map((l) => DropdownMenuItem<String>(value: l, child: Text(l)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _sourceLang = val);
                    },
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12.0),
                  child: Icon(Icons.arrow_forward, size: 16, color: Colors.grey),
                ),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _targetLang,
                    decoration: InputDecoration(
                      labelText: 'To',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: _languages
                        .map((l) => DropdownMenuItem<String>(value: l, child: Text(l)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _targetLang = val);
                    },
                  ),
                ),
              ],
            ),
          ),

          // Messages View
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.translate, size: 56, color: theme.colorScheme.primary.withValues(alpha: 0.5)),
                          const SizedBox(height: 16),
                          const Text(
                            'Real-Time Speech Polisher',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Type or tap the keyboard microphone to speak. Gemini will polish your sentences for formal job interviews.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final msg = _messages[index];
                      final isUser = msg['role'] == 'user';
                      final isError = msg['role'] == 'error';

                      if (isError) {
                        return Center(
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.red.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              msg['text'] ?? '',
                              style: const TextStyle(color: Colors.red, fontSize: 12),
                            ),
                          ),
                        );
                      }

                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                          decoration: BoxDecoration(
                            gradient: isUser
                                ? LinearGradient(
                                    colors: [theme.colorScheme.primary, theme.colorScheme.primary.withValues(alpha: 0.8)],
                                  )
                                : null,
                            color: isUser ? null : (isDark ? Colors.grey[900] : Colors.grey[100]),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                              bottomRight: isUser ? Radius.zero : const Radius.circular(16),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    (msg['lang'] ?? '').toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isUser ? Colors.white60 : Colors.grey,
                                    ),
                                  ),
                                  if (!isUser)
                                    GestureDetector(
                                      onTap: () {
                                        Clipboard.setData(ClipboardData(text: msg['text'] ?? ''));
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Translation copied to clipboard!'),
                                            duration: Duration(seconds: 1),
                                          ),
                                        );
                                      },
                                      child: const Icon(Icons.copy, size: 14, color: Colors.grey),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                msg['text'] ?? '',
                                style: TextStyle(
                                  color: isUser ? Colors.white : (isDark ? Colors.white : Colors.black87),
                                  fontSize: 13,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Translating spinner
          if (_translating)
            Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 1.5),
                  ),
                  const SizedBox(width: 8),
                  Text('Polishing translation...', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ],
              ),
            ),

          // Input Box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[950] : Colors.white,
              border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant, width: 0.5)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: 'Type or use keyboard speech dictation...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      filled: true,
                      fillColor: isDark ? Colors.grey[900]?.withValues(alpha: 0.3) : Colors.grey[100]?.withValues(alpha: 0.3),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _translateSpeech(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  icon: const Icon(Icons.translate_rounded),
                  onPressed: _translateSpeech,
                  style: IconButton.styleFrom(
                    padding: const EdgeInsets.all(12),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
