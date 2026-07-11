import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import '../../core/config.dart';
import 'cover_letter_editor_screen.dart';

class CoverLettersScreen extends StatefulWidget {
  const CoverLettersScreen({super.key});

  @override
  State<CoverLettersScreen> createState() => _CoverLettersScreenState();
}

class _CoverLettersScreenState extends State<CoverLettersScreen> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _coverLetters = [];
  List<Map<String, dynamic>> _resumes = [];
  bool _loading = true;
  bool _generating = false;
  String? _selectedResumeId;

  // New Cover Letter dialog controllers
  final _jobTitleController = TextEditingController();
  final _companyController = TextEditingController();
  final _jobDescController = TextEditingController();

  String get _serverUrl => AppConfig.backendUrl;

  @override
  void initState() {
    super.initState();
    _loadCoverLetters();
    _loadResumes();
  }

  @override
  void dispose() {
    _jobTitleController.dispose();
    _companyController.dispose();
    _jobDescController.dispose();
    super.dispose();
  }

  Future<void> _loadCoverLetters() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final response = await _supabase
          .from('cover_letters')
          .select('id, title, content, updated_at, resume_id')
          .order('updated_at', ascending: false);

      setState(() {
        _coverLetters = List<Map<String, dynamic>>.from(response);
      });
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load cover letters: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadResumes() async {
    try {
      final response = await _supabase
          .from('resumes')
          .select('id, title')
          .order('updated_at', ascending: false);
      setState(() {
        _resumes = List<Map<String, dynamic>>.from(response);
      });
    } catch (err) {
      debugPrint('Failed to load resumes: $err');
    }
  }

  Future<void> _deleteCoverLetter(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Cover Letter', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to delete this cover letter? This action is permanent.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _supabase.from('cover_letters').delete().eq('id', id);
      setState(() {
        _coverLetters.removeWhere((item) => item['id'] == id);
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cover letter deleted successfully!'), behavior: SnackBarBehavior.floating),
      );
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete: $err')),
      );
    }
  }

  Future<void> _generateCoverLetter() async {
    final jobTitle = _jobTitleController.text.trim();
    final companyName = _companyController.text.trim();
    final jobDesc = _jobDescController.text.trim();

    if (jobTitle.isEmpty || companyName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job Title and Company Name are required')),
      );
      return;
    }

    setState(() => _generating = true);
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('User not logged in');

      final token = _supabase.auth.currentSession?.accessToken;
      final response = await http.post(
        Uri.parse('$_serverUrl/api/cover-letter/generate'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'resumeId': _selectedResumeId,
          'jobTitle': jobTitle,
          'companyName': companyName,
          'jobDescription': jobDesc,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception(jsonDecode(response.body)['error'] ?? 'API failed');
      }

      final data = jsonDecode(response.body);
      final generatedContent = data['content'];

      // Insert cover letter into Supabase DB
      final insertResponse = await _supabase
          .from('cover_letters')
          .insert({
            'user_id': user.id,
            'resume_id': _selectedResumeId,
            'title': '$jobTitle Cover Letter ($companyName)',
            'content': generatedContent,
          })
          .select()
          .single();

      if (!mounted) return;

      // Close Dialog/Bottom Sheet
      Navigator.pop(context);
      _jobTitleController.clear();
      _companyController.clear();
      _jobDescController.clear();

      // Navigate to Editor screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CoverLetterEditorScreen(
            coverLetterId: insertResponse['id'],
            initialTitle: insertResponse['title'],
            initialContent: insertResponse['content'],
          ),
        ),
      ).then((_) => _loadCoverLetters());

    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Generation failed: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _generating = false);
      }
    }
  }

  void _showCreateBottomSheet() {
    _selectedResumeId = _resumes.isNotEmpty ? _resumes.first['id'] : null;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            top: 24,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.auto_awesome, color: Colors.purple, size: 22),
                  const SizedBox(width: 8),
                  const Text(
                    'Generate Cover Letter',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_resumes.isNotEmpty) ...[
                const Text(
                  'LINKED RESUME PROFILE',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.0),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _selectedResumeId,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: [
                    const DropdownMenuItem<String>(
                      value: null,
                      child: Text('No Resume (Generic Letter)'),
                    ),
                    ..._resumes.map((r) => DropdownMenuItem<String>(
                          value: r['id'],
                          child: Text(r['title'] ?? ''),
                        )),
                  ],
                  onChanged: (val) {
                    setModalState(() {
                      _selectedResumeId = val;
                    });
                  },
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _jobTitleController,
                decoration: InputDecoration(
                  labelText: 'Job Title *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _companyController,
                decoration: InputDecoration(
                  labelText: 'Company Name *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _jobDescController,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: 'Job Description (Optional)',
                  hintText: 'Paste target job details here...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _generating ? null : _generateCoverLetter,
                icon: _generating
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.auto_awesome, size: 16),
                label: Text(_generating ? 'Generating Letter...' : 'Generate with Gemini'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.purple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'AI Cover Letters',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _coverLetters.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.mail_outline_rounded, size: 64, color: theme.colorScheme.primary.withValues(alpha: 0.5)),
                        const SizedBox(height: 16),
                        const Text(
                          'No Cover Letters Yet',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Generate a professionally tailored müraciət məktubu for your next job application.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: _showCreateBottomSheet,
                          icon: const Icon(Icons.add),
                          label: const Text('Generate First Letter'),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _coverLetters.length,
                  itemBuilder: (context, index) {
                    final cl = _coverLetters[index];
                    final updatedDate = DateTime.parse(cl['updated_at']);
                    final formattedDate = DateFormat.yMMMd().format(updatedDate);

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: theme.colorScheme.outlineVariant, width: 0.5),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey[900] : Colors.grey[100],
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.mail, color: theme.colorScheme.primary),
                        ),
                        title: Text(
                          cl['title'] ?? 'Cover Letter',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(
                            'Updated $formattedDate',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                          onPressed: () => _deleteCoverLetter(cl['id']),
                        ),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => CoverLetterEditorScreen(
                                coverLetterId: cl['id'],
                                initialTitle: cl['title'] ?? '',
                                initialContent: cl['content'] ?? '',
                              ),
                            ),
                          ).then((_) => _loadCoverLetters());
                        },
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateBottomSheet,
        icon: const Icon(Icons.add),
        label: const Text('New Letter'),
      ),
    );
  }
}
