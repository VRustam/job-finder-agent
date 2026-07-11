import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'resume_editor_screen.dart';

class ResumesScreen extends StatefulWidget {
  const ResumesScreen({super.key});

  @override
  State<ResumesScreen> createState() => _ResumesScreenState();
}

class _ResumesScreenState extends State<ResumesScreen> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _resumes = [];
  bool _loading = true;
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    _loadResumes();
  }

  Future<void> _loadResumes() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final response = await _supabase
          .from('resumes')
          .select('id, title, updated_at, content')
          .order('updated_at', ascending: false);

      setState(() {
        _resumes = List<Map<String, dynamic>>.from(response);
      });
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load resumes: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _createResume() async {
    setState(() => _creating = true);
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('User not logged in');

      final blankContent = {
        'personal': {
          'name': '',
          'email': user.email ?? '',
          'phone': '',
          'website': '',
          'summary': ''
        },
        'experience': [],
        'education': [],
        'skills': [],
        'projects': []
      };

      final response = await _supabase
          .from('resumes')
          .insert({
            'user_id': user.id,
            'title': 'Untitled Resume',
            'content': blankContent,
          })
          .select()
          .single();

      if (!mounted) return;

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => ResumeEditorScreen(
            resumeId: response['id'],
            initialTitle: response['title'],
            initialContent: response['content'],
          ),
        ),
      ).then((_) => _loadResumes());

    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create resume: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _creating = false);
      }
    }
  }

  Future<void> _deleteResume(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Resume'),
        content: const Text('Are you sure you want to delete this resume? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _supabase.from('resumes').delete().eq('id', id);
      _loadResumes();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Resume deleted successfully')),
      );
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete resume: $err')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Resumes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadResumes,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _resumes.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.description_outlined,
                          size: 64,
                          color: isDark ? Colors.grey[700] : Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No Resumes Yet',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Create a professional resume and optimize it using our AI helpers.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _creating ? null : _createResume,
                          icon: const Icon(Icons.add),
                          label: const Text('Create Your First Resume'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? Colors.white : Colors.black,
                            foregroundColor: isDark ? Colors.black : Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16.0),
                  itemCount: _resumes.length,
                  itemBuilder: (context, index) {
                    final resume = _resumes[index];
                    final String title = resume['title'] ?? 'Untitled Resume';
                    final String updatedAtStr = resume['updated_at'] ?? '';
                    DateTime? updatedAt;
                    if (updatedAtStr.isNotEmpty) {
                      updatedAt = DateTime.parse(updatedAtStr);
                    }

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.purple.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.description, color: Colors.purple),
                        ),
                        title: Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          updatedAt != null
                              ? 'Updated: ${DateFormat('yMMMd').format(updatedAt)}'
                              : 'No date info',
                          style: const TextStyle(fontSize: 12),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.edit, color: Colors.blue),
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (context) => ResumeEditorScreen(
                                      resumeId: resume['id'],
                                      initialTitle: title,
                                      initialContent: resume['content'] ?? {},
                                    ),
                                  ),
                                ).then((_) => _loadResumes());
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () => _deleteResume(resume['id']),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: _resumes.isEmpty
          ? null
          : FloatingActionButton(
              onPressed: _creating ? null : _createResume,
              backgroundColor: isDark ? Colors.white : Colors.black,
              foregroundColor: isDark ? Colors.black : Colors.white,
              child: _creating
                  ? const CircularProgressIndicator(color: Colors.purple)
                  : const Icon(Icons.add),
            ),
    );
  }
}
