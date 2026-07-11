import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'daily_digest_screen.dart';

class ApplicationsScreen extends StatefulWidget {
  const ApplicationsScreen({super.key});

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _applications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadApplications();
  }

  Future<void> _loadApplications() async {
    setState(() => _loading = true);
    try {
      final response = await _supabase
          .from('applications')
          .select('*')
          .order('updated_at', ascending: false);

      if (response != null) {
        setState(() {
          _applications = List<Map<String, dynamic>>.from(response);
        });
      }
    } catch (err) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load applications: $err')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(String id, String newStatus) async {
    try {
      await _supabase
          .from('applications')
          .update({'status': newStatus, 'updated_at': DateTime.now().toIso8601String()})
          .eq('id', id);
      
      _loadApplications();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Application status updated!')),
      );
    } catch (err) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Update failed: $err')),
      );
    }
  }

  void _showAddDialog() {
    final companyController = TextEditingController();
    final titleController = TextEditingController();
    final salaryController = TextEditingController();
    final notesController = TextEditingController();
    String selectedStatus = 'applied';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Add Job Application',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: companyController,
                  decoration: const InputDecoration(
                    labelText: 'Company Name *',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    labelText: 'Job Title *',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: salaryController,
                  decoration: const InputDecoration(
                    labelText: 'Salary/Compensation (Optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedStatus,
                  decoration: const InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'applied', child: Text('Applied')),
                    DropdownMenuItem(value: 'interviewing', child: Text('Interviewing')),
                    DropdownMenuItem(value: 'offer', child: Text('Offer')),
                    DropdownMenuItem(value: 'rejected', child: Text('Rejected')),
                  ],
                  onChanged: (val) {
                    if (val != null) selectedStatus = val;
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Notes / Description',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () async {
                    if (companyController.text.trim().isEmpty ||
                        titleController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Company and Job Title are required')),
                      );
                      return;
                    }

                    try {
                      final userId = _supabase.auth.currentUser?.id;
                      if (userId == null) return;

                      await _supabase.from('applications').insert({
                        'user_id': userId,
                        'company_name': companyController.text.trim(),
                        'job_title': titleController.text.trim(),
                        'status': selectedStatus,
                        'salary': salaryController.text.trim().isEmpty
                            ? null
                            : salaryController.text.trim(),
                        'notes': notesController.text.trim().isEmpty
                            ? null
                            : notesController.text.trim(),
                      });

                      if (!mounted) return;

                      Navigator.of(context).pop();
                      _loadApplications();
                    } catch (err) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Insert failed: $err')),
                      );
                    }
                  },
                  child: const Text('Add Job'),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAppList(String status) {
    final filtered = _applications.where((app) => app['status'] == status).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Text(
          'No job müraciəti in $status state',
          style: const TextStyle(color: Colors.grey, fontSize: 13),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final app = filtered[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 1,
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
                        app['job_title'] ?? '',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, size: 20),
                      onSelected: (newStatus) => _updateStatus(app['id'], newStatus),
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: 'applied', child: Text('Move to Applied')),
                        PopupMenuItem(value: 'interviewing', child: Text('Move to Interviewing')),
                        PopupMenuItem(value: 'offer', child: Text('Move to Offer')),
                        PopupMenuItem(value: 'rejected', child: Text('Move to Rejected')),
                      ],
                    ),
                  ],
                ),
                Text(
                  app['company_name'] ?? '',
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (app['salary'] != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Salary: ${app['salary']}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ],
                if (app['notes'] != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    app['notes'],
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Job Applications'),
          actions: [
            IconButton(
              icon: const Icon(Icons.auto_awesome, color: Colors.purple),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const DailyDigestScreen()),
                );
              },
              tooltip: 'Daily AI Digest',
            ),
          ],
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Applied'),
              Tab(text: 'Interviewing'),
              Tab(text: 'Offer'),
              Tab(text: 'Rejected'),
            ],
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [
                  _buildAppList('applied'),
                  _buildAppList('interviewing'),
                  _buildAppList('offer'),
                  _buildAppList('rejected'),
                ],
              ),
        floatingActionButton: FloatingActionButton(
          onPressed: _showAddDialog,
          child: const Icon(Icons.add),
        ),
      ),
    );
  }
}
