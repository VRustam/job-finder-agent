import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../../core/config.dart';

class MarketTrendsScreen extends StatefulWidget {
  const MarketTrendsScreen({super.key});

  @override
  State<MarketTrendsScreen> createState() => _MarketTrendsScreenState();
}

class _MarketTrendsScreenState extends State<MarketTrendsScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String? _error;
  String _dailyInsight = '';
  List<dynamic> _sectors = [];
  List<dynamic> _emergingSkills = [];

  // Search states
  final _searchController = TextEditingController();
  String _selectedProfession = 'All';
  bool _searchLoading = false;
  Map<String, dynamic>? _searchResult;
  String? _searchError;

  final List<String> _professions = [
    'All',
    'AI Engineer',
    'Machine Learning Engineer',
    'Prompt Engineer',
    'NLP Scientist',
    'Software Engineer',
    'Data Scientist',
    'Product Manager',
    'UI/UX Designer',
    'DevOps Engineer',
    'Data Engineer',
    'Cloud Architect',
    'Marketing Specialist',
  ];

  String get _serverUrl => AppConfig.backendUrl;

  @override
  void initState() {
    super.initState();
    _fetchTrends();
  }

  Future<void> _fetchTrends() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final token = _supabase.auth.currentSession?.accessToken;

      final response = await http.post(
        Uri.parse('$_serverUrl/api/market/trends'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _dailyInsight = data['dailyInsight'] ?? '';
          _sectors = data['sectors'] ?? [];
          _emergingSkills = data['emergingSkills'] ?? [];
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

  Future<void> _searchMarket() async {
    setState(() {
      _searchLoading = true;
      _searchError = null;
      _searchResult = null;
    });

    try {
      final token = _supabase.auth.currentSession?.accessToken;

      final response = await http.post(
        Uri.parse('$_serverUrl/api/market/search'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'query': _searchController.text.trim(),
          'profession': _selectedProfession == 'All' ? '' : _selectedProfession,
        }),
      );

      if (response.statusCode == 200) {
        setState(() {
          _searchResult = jsonDecode(response.body);
        });
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to analyze');
      }
    } catch (err) {
      setState(() {
        _searchError = err.toString();
      });
    } finally {
      setState(() => _searchLoading = false);
    }
  }

  Color _getDemandColor(String demand) {
    switch (demand.toLowerCase()) {
      case 'critical':
        return Colors.red;
      case 'high':
        return Colors.purple;
      default:
        return Colors.amber;
    }
  }

  IconData _getTrendIcon(String trend) {
    switch (trend.toLowerCase()) {
      case 'up':
        return Icons.trending_up_rounded;
      case 'down':
        return Icons.trending_down_rounded;
      default:
        return Icons.trending_flat_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Market Analysis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchTrends,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 16),
                        const Text(
                          'Failed to load market trends',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: _fetchTrends,
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Daily Insight Banner
                      Container(
                        padding: const EdgeInsets.all(20.0),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.insights_rounded,
                                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                                    size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Daily AI briefing',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _dailyInsight,
                              style: TextStyle(
                                fontSize: 14,
                                height: 1.5,
                                color: Theme.of(context).colorScheme.onPrimaryContainer,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Sectors
                      const Text(
                        'HIGH DEMAND SECTORS',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 12),
                      ..._sectors.map((sec) {
                        final demandColor = _getDemandColor(sec['demand'] ?? 'high');
                        final trendIcon = _getTrendIcon(sec['trend'] ?? 'up');

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        sec['name'] ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: demandColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        (sec['demand'] ?? 'high').toString().toUpperCase(),
                                        style: TextStyle(
                                          color: demandColor,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  sec['description'] ?? '',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(trendIcon, size: 16, color: Colors.green),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Trend: ${sec['trend']}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 16),

                      // Emerging Skills
                      const Text(
                        'FASTEST GROWING SKILLS',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _emergingSkills.map((skill) {
                          return Chip(
                            backgroundColor: Colors.purple.withOpacity(0.05),
                            side: BorderSide(color: Colors.purple.withOpacity(0.15)),
                            label: Text(
                              skill.toString(),
                              style: const TextStyle(fontSize: 12, color: Colors.purple),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 24),

                      const Divider(),
                      const SizedBox(height: 16),

                      // AI Live Search and Filter
                      const Text(
                        'AI LIVE SEARCH & FILTER',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 16),

                      // Profession filter drop
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

                      // Search text input
                      TextField(
                        controller: _searchController,
                        decoration: const InputDecoration(
                          labelText: 'Custom Search Query',
                          hintText: 'e.g. Remote Flutter demand in USA...',
                          prefixIcon: Icon(Icons.search),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),

                      ElevatedButton.icon(
                        onPressed: _searchLoading ? null : _searchMarket,
                        icon: const Icon(Icons.online_prediction_rounded),
                        label: Text(_searchLoading ? 'Analyzing...' : 'Search Market Demand'),
                      ),

                      // Search output rendering
                      if (_searchLoading) ...[
                        const SizedBox(height: 24),
                        const Center(child: CircularProgressIndicator()),
                      ],

                      if (_searchError != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _searchError!,
                          style: const TextStyle(color: Colors.red, fontSize: 13),
                        ),
                      ],

                      if (_searchResult != null) ...[
                        const SizedBox(height: 24),
                        Card(
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(color: Colors.purple.withOpacity(0.2)),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _searchResult!['profession'] ?? '',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    Text(
                                      '${_searchResult!['demandScore'] ?? 0}%',
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w900,
                                        color: (_searchResult!['demandScore'] ?? 0) >= 80
                                            ? Colors.green
                                            : Colors.amber,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                LinearProgressIndicator(
                                  value: (_searchResult!['demandScore'] ?? 0) / 100,
                                  color: (_searchResult!['demandScore'] ?? 0) >= 80
                                      ? Colors.green
                                      : Colors.amber,
                                  backgroundColor: Colors.grey[200],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _searchResult!['summary'] ?? '',
                                  style: const TextStyle(fontSize: 13, height: 1.4),
                                ),
                                const SizedBox(height: 16),

                                // Required skills
                                const Text(
                                  'REQUIRED SKILLS',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: ((_searchResult!['requiredSkills'] ?? []) as List).map((skill) {
                                    return Chip(
                                      backgroundColor: Colors.grey[100],
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                                      label: Text(
                                        skill.toString(),
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                                      ),
                                    );
                                  }).toList(),
                                ),
                                const SizedBox(height: 16),

                                // Salary range
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'SALARY RANGE',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                                    ),
                                    Text(
                                      _searchResult!['salaryRange'] ?? '',
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // Top regions
                                const Text(
                                  'TOP HIRING REGIONS',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: ((_searchResult!['topRegions'] ?? []) as List).map((reg) {
                                    return Chip(
                                      backgroundColor: Colors.blue.withOpacity(0.05),
                                      side: BorderSide(color: Colors.blue.withOpacity(0.15)),
                                      label: Text(
                                        reg.toString(),
                                        style: const TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.bold),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}
