import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../core/config.dart';

class TutorialsScreen extends StatefulWidget {
  const TutorialsScreen({super.key});

  @override
  State<TutorialsScreen> createState() => _TutorialsScreenState();
}

class _TutorialsScreenState extends State<TutorialsScreen> {
  final _supabase = Supabase.instance.client;
  final _techController = TextEditingController();
  
  String _selectedProfession = 'Software Engineer';
  bool _loading = false;
  String? _error;

  List<dynamic> _videos = [];
  List<dynamic> _coreConcepts = [];
  List<dynamic> _interviewQuestions = [];
  String _cheatsheet = '';

  final List<String> _professions = [
    'AI Engineer',
    'Software Engineer',
    'Data Scientist',
    'Prompt Engineer',
    'Product Manager',
    'UI/UX Designer',
    'DevOps Engineer',
  ];

  String get _serverUrl => AppConfig.backendUrl;

  Future<void> _fetchTutorials() async {
    final tech = _techController.text.trim();
    if (tech.isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
      _videos = [];
      _coreConcepts = [];
      _interviewQuestions = [];
      _cheatsheet = '';
    });

    try {
      final token = _supabase.auth.currentSession?.accessToken;

      final response = await http.post(
        Uri.parse('$_serverUrl/api/interview/tutorials'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'profession': _selectedProfession,
          'technology': tech,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _videos = data['videos'] ?? [];
          final written = data['written'] ?? {};
          _coreConcepts = written['coreConcepts'] ?? [];
          _interviewQuestions = written['interviewQuestions'] ?? [];
          _cheatsheet = written['cheatsheet'] ?? '';
        });
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Server error');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _launchYouTube(String query) async {
    final url = Uri.parse('https://www.youtube.com/results?search_query=${Uri.encodeComponent(query)}');
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch $url';
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to open YouTube: $err')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasData = _videos.isNotEmpty || _cheatsheet.isNotEmpty;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Interview Tutorials'),
          bottom: hasData && !_loading
              ? const TabBar(
                  tabs: [
                    Tab(icon: Icon(Icons.play_circle_fill), text: 'Videos'),
                    Tab(icon: Icon(Icons.book), text: 'Concept Guides'),
                  ],
                )
              : null,
        ),
        body: Column(
          children: [
            // Filter form card
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Card(
                elevation: 1,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: _selectedProfession,
                        decoration: const InputDecoration(
                          labelText: 'Profession Filter',
                          border: OutlineInputBorder(),
                        ),
                        items: _professions.map((prof) {
                          return DropdownMenuItem(value: prof, child: Text(prof));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedProfession = val);
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _techController,
                        decoration: const InputDecoration(
                          labelText: 'Technology / Topic',
                          hintText: 'e.g. React Hooks, AWS S3...',
                          prefixIcon: Icon(Icons.code),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _loading ? null : _fetchTutorials,
                        icon: const Icon(Icons.auto_awesome),
                        label: Text(_loading ? 'Generating...' : 'Build Study Guide'),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            if (_loading)
              const Expanded(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              )
            else if (!hasData)
              const Expanded(
                child: Center(
                  child: Text(
                    'Search for a topic to build a custom study guide.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              Expanded(
                child: TabBarView(
                  children: [
                    // Tab 1: Video recommendations list
                    ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _videos.length,
                      itemBuilder: (context, idx) {
                        final vid = _videos[idx];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        vid['title'] ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.grey[200],
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        vid['duration'] ?? '',
                                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'By ${vid['channel'] ?? ''}',
                                  style: const TextStyle(color: Colors.purple, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  vid['description'] ?? '',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                                ),
                                const SizedBox(height: 12),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    onPressed: () => _launchYouTube(vid['searchQuery'] ?? ''),
                                    icon: const Icon(Icons.play_circle_fill, color: Colors.red),
                                    label: const Text('Watch on YouTube', style: TextStyle(color: Colors.red)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

                    // Tab 2: Concept guides
                    ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        // Core concepts card
                        Card(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: const [
                                    Icon(Icons.code_rounded, color: Colors.purple),
                                    SizedBox(width: 8),
                                    Text('KEY CONCEPTS TO MASTER', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.purple)),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                ..._coreConcepts.map((concept) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 6.0),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                                        Expanded(child: Text(concept.toString(), style: const TextStyle(fontSize: 12, height: 1.4))),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Interview Questions
                        const Text(
                          'TOP INTERVIEW QUESTIONS',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        ..._interviewQuestions.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final qna = entry.value;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Question ${idx + 1}',
                                    style: const TextStyle(color: Colors.indigo, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    qna['question'] ?? '',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                  const Divider(height: 20),
                                  Text(
                                    qna['answer'] ?? '',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                        const SizedBox(height: 16),

                        // Quick study cheatsheet
                        Container(
                          padding: const EdgeInsets.all(16.0),
                          decoration: BoxDecoration(
                            color: Colors.purple.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.purple.withOpacity(0.15)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: const [
                                  Icon(Icons.notes, color: Colors.purple),
                                  SizedBox(width: 8),
                                  Text('QUICK STUDY GUIDE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.purple)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _cheatsheet,
                                style: const TextStyle(fontSize: 12, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
