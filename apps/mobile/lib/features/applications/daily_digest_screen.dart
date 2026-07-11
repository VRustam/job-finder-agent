import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../core/config.dart';

class DailyDigestScreen extends StatefulWidget {
  const DailyDigestScreen({super.key});

  @override
  State<DailyDigestScreen> createState() => _DailyDigestScreenState();
}

class _DailyDigestScreenState extends State<DailyDigestScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String? _error;
  List<dynamic> _jobs = [];

  String get _serverUrl => AppConfig.backendUrl;

  @override
  void initState() {
    super.initState();
    _fetchDailyDigest();
  }

  Future<void> _fetchDailyDigest() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final token = _supabase.auth.currentSession?.accessToken;

      final response = await http.get(
        Uri.parse('$_serverUrl/api/applications/daily-digest'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _jobs = data['jobs'] ?? [];
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

  Future<void> _launchUrl(String urlStr) async {
    final url = Uri.parse(urlStr);
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch $url';
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to open link: $err')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily AI Digest'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _fetchDailyDigest,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : _jobs.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.work_outline, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            const Text(
                              'No Jobs Synced Today',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Scrape job listings on LinkedIn using the Chrome Extension on your computer to sync jobs here in real-time.',
                              style: TextStyle(color: Colors.grey[600], fontSize: 12),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _jobs.length,
                      itemBuilder: (context, idx) {
                        final job = _jobs[idx];
                        final score = job['match_score'] ?? 0;
                        
                        Color scoreColor = Colors.amber;
                        if (score >= 80) {
                          scoreColor = Colors.green;
                        } else if (score < 60) {
                          scoreColor = Colors.red;
                        }

                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            job['title'] ?? '',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 15,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              Icon(Icons.business, size: 14, color: Colors.grey[600]),
                                              const SizedBox(width: 4),
                                              Text(
                                                job['company'] ?? '',
                                                style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                              ),
                                              const SizedBox(width: 12),
                                              Icon(Icons.location_on, size: 14, color: Colors.grey[600]),
                                              const SizedBox(width: 4),
                                              Text(
                                                job['location'] ?? '',
                                                style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: scoreColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        '$score%',
                                        style: TextStyle(
                                          color: scoreColor,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (job['match_reason'] != null) ...[
                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.indigo.withOpacity(0.02),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.indigo.withOpacity(0.1)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: const [
                                            Icon(Icons.auto_awesome, size: 12, color: Colors.indigo),
                                            SizedBox(width: 4),
                                            Text(
                                              'AI Match Analysis',
                                              style: TextStyle(
                                                color: Colors.indigo,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          job['match_reason'] ?? '',
                                          style: const TextStyle(fontSize: 12, height: 1.4),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => _launchUrl(job['link'] ?? ''),
                                      icon: const Icon(Icons.open_in_new, size: 14),
                                      label: const Text('Apply on LinkedIn'),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
