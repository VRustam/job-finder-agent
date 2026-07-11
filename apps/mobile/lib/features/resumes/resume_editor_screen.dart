import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../../core/config.dart';

class ResumeEditorScreen extends StatefulWidget {
  final String resumeId;
  final String initialTitle;
  final Map<String, dynamic> initialContent;

  const ResumeEditorScreen({
    super.key,
    required this.resumeId,
    required this.initialTitle,
    required this.initialContent,
  });

  @override
  State<ResumeEditorScreen> createState() => _ResumeEditorScreenState();
}

class _ResumeEditorScreenState extends State<ResumeEditorScreen> with SingleTickerProviderStateMixin {
  final _supabase = Supabase.instance.client;
  late TabController _tabController;
  late TextEditingController _titleController;

  // Personal details controllers
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _websiteController;
  late TextEditingController _summaryController;

  // Experience and Education list models
  List<Map<String, dynamic>> _experience = [];
  List<Map<String, dynamic>> _education = [];
  List<Map<String, dynamic>> _projects = [];
  List<String> _skills = [];

  // Controllers for Skills
  final TextEditingController _skillsController = TextEditingController();

  // AI tools state
  final TextEditingController _promptController = TextEditingController();
  final TextEditingController _optJobTitleController = TextEditingController();
  final TextEditingController _optJobDescController = TextEditingController();
  bool _loadingAI = false;
  bool _saving = false;

  String get _serverUrl => AppConfig.backendUrl;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _titleController = TextEditingController(text: widget.initialTitle);

    final personal = widget.initialContent['personal'] ?? {};
    _nameController = TextEditingController(text: personal['name'] ?? '');
    _emailController = TextEditingController(text: personal['email'] ?? '');
    _phoneController = TextEditingController(text: personal['phone'] ?? '');
    _websiteController = TextEditingController(text: personal['website'] ?? '');
    _summaryController = TextEditingController(text: personal['summary'] ?? '');

    _experience = List<Map<String, dynamic>>.from(widget.initialContent['experience'] ?? []);
    _education = List<Map<String, dynamic>>.from(widget.initialContent['education'] ?? []);
    _projects = List<Map<String, dynamic>>.from(widget.initialContent['projects'] ?? []);
    _skills = List<String>.from(widget.initialContent['skills'] ?? []);
    _skillsController.text = _skills.join(', ');
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _websiteController.dispose();
    _summaryController.dispose();
    _skillsController.dispose();
    _promptController.dispose();
    _optJobTitleController.dispose();
    _optJobDescController.dispose();
    super.dispose();
  }

  InputDecoration _premiumInputDecoration({
    required String labelText,
    required IconData prefixIcon,
    String? hintText,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return InputDecoration(
      labelText: labelText,
      hintText: hintText,
      prefixIcon: Icon(prefixIcon, size: 18, color: theme.colorScheme.primary.withValues(alpha: 0.7)),
      filled: true,
      fillColor: isDark ? Colors.grey[900]?.withValues(alpha: 0.4) : Colors.grey[100]?.withValues(alpha: 0.4),
      labelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 13, color: isDark ? Colors.grey[400] : Colors.grey[600]),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.transparent, width: 0),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: theme.colorScheme.primary, width: 1.5),
      ),
      alignLabelWithHint: true,
    );
  }

  Map<String, dynamic> _buildContentMap() {
    final skillsList = _skillsController.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    return {
      'personal': {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim(),
        'phone': _phoneController.text.trim(),
        'website': _websiteController.text.trim(),
        'summary': _summaryController.text.trim(),
      },
      'experience': _experience,
      'education': _education,
      'skills': skillsList,
      'projects': _projects,
    };
  }

  Future<void> _saveChanges() async {
    setState(() => _saving = true);
    try {
      final content = _buildContentMap();
      await _supabase.from('resumes').update({
        'title': _titleController.text.trim(),
        'content': content,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', widget.resumeId);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Changes saved successfully!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _generateResumeAI() async {
    final prompt = _promptController.text.trim();
    if (prompt.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a description for the AI')),
      );
      return;
    }

    setState(() => _loadingAI = true);
    try {
      final token = _supabase.auth.currentSession?.accessToken;
      final response = await http.post(
        Uri.parse('$_serverUrl/api/resume/generate'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'prompt': prompt}),
      );

      if (response.statusCode != 200) {
        throw Exception(jsonDecode(response.body)['error'] ?? 'API failed');
      }

      final data = jsonDecode(response.body);
      _updateFields(data);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Resume generated successfully! Review the tabs.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      _tabController.animateTo(0);
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Generation failed: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _loadingAI = false);
      }
    }
  }

  Future<void> _optimizeResumeAI() async {
    final jobTitle = _optJobTitleController.text.trim();
    final jobDesc = _optJobDescController.text.trim();

    if (jobTitle.isEmpty && jobDesc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please specify a target Job Title or Description to optimize against')),
      );
      return;
    }

    setState(() => _loadingAI = true);
    try {
      final currentContent = _buildContentMap();
      final token = _supabase.auth.currentSession?.accessToken;
      final response = await http.post(
        Uri.parse('$_serverUrl/api/resume/optimize'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'content': currentContent,
          'targetJobTitle': jobTitle,
          'targetJobDescription': jobDesc,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception(jsonDecode(response.body)['error'] ?? 'API failed');
      }

      final data = jsonDecode(response.body);
      final optimizedContent = data['content'] ?? data;
      _updateFields(optimizedContent);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Resume optimized for ATS keywords!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      _tabController.animateTo(0);
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Optimization failed: $err')),
      );
    } finally {
      if (mounted) {
        setState(() => _loadingAI = false);
      }
    }
  }

  void _updateFields(Map<String, dynamic> data) {
    setState(() {
      final personal = data['personal'] ?? {};
      _nameController.text = personal['name'] ?? '';
      _emailController.text = personal['email'] ?? '';
      _phoneController.text = personal['phone'] ?? '';
      _websiteController.text = personal['website'] ?? '';
      _summaryController.text = personal['summary'] ?? '';

      _experience = List<Map<String, dynamic>>.from(data['experience'] ?? []);
      _education = List<Map<String, dynamic>>.from(data['education'] ?? []);
      _projects = List<Map<String, dynamic>>.from(data['projects'] ?? []);
      _skills = List<String>.from(data['skills'] ?? []);
      _skillsController.text = _skills.join(', ');
    });
  }

  void _addExperienceItem() {
    setState(() {
      _experience.add({
        'company': '',
        'position': '',
        'startDate': '',
        'endDate': '',
        'description': '',
      });
    });
  }

  void _addEducationItem() {
    setState(() {
      _education.add({
        'school': '',
        'degree': '',
        'startDate': '',
        'endDate': '',
        'description': '',
      });
    });
  }

  void _addProjectItem() {
    setState(() {
      _projects.add({
        'name': '',
        'description': '',
        'link': '',
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _titleController,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, letterSpacing: -0.5),
          decoration: const InputDecoration(
            border: InputBorder.none,
            hintText: 'Resume Title',
          ),
        ),
        actions: [
          IconButton(
            icon: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.save),
            tooltip: 'Save Changes',
            onPressed: _saving ? null : _saveChanges,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 13),
          indicatorColor: theme.colorScheme.primary,
          tabs: const [
            Tab(text: 'Personal'),
            Tab(text: 'Experience'),
            Tab(text: 'Education'),
            Tab(text: 'Skills & Projects'),
            Tab(text: 'AI Tools'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPersonalTab(),
          _buildExperienceTab(),
          _buildEducationTab(),
          _buildSkillsProjectsTab(),
          _buildAITab(),
        ],
      ),
    );
  }

  Widget _buildPersonalTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Personal Details',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.5),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: _premiumInputDecoration(labelText: 'Full Name', prefixIcon: Icons.person_outline),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _emailController,
            decoration: _premiumInputDecoration(labelText: 'Email Address', prefixIcon: Icons.email_outlined),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneController,
            decoration: _premiumInputDecoration(labelText: 'Phone Number', prefixIcon: Icons.phone_android_outlined),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _websiteController,
            decoration: _premiumInputDecoration(labelText: 'Website / Portfolio URL', prefixIcon: Icons.link_outlined),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _summaryController,
            maxLines: 5,
            decoration: _premiumInputDecoration(labelText: 'Professional Summary', prefixIcon: Icons.notes_outlined),
          ),
        ],
      ),
    );
  }

  Widget _buildExperienceTab() {
    final theme = Theme.of(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Work History',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.5),
              ),
              ElevatedButton.icon(
                onPressed: _addExperienceItem,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add Job'),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _experience.isEmpty
              ? const Center(child: Text('No experience items. Add one!'))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  itemCount: _experience.length,
                  itemBuilder: (context, index) {
                    final item = _experience[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16.0),
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: theme.colorScheme.outlineVariant, width: 0.5),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Position #${index + 1}',
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                                  onPressed: () {
                                    setState(() {
                                      _experience.removeAt(index);
                                    });
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              initialValue: item['company'] ?? '',
                              decoration: _premiumInputDecoration(labelText: 'Company / Employer', prefixIcon: Icons.business),
                              onChanged: (val) => item['company'] = val,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              initialValue: item['position'] ?? '',
                              decoration: _premiumInputDecoration(labelText: 'Job Title', prefixIcon: Icons.work_outline),
                              onChanged: (val) => item['position'] = val,
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    initialValue: item['startDate'] ?? '',
                                    decoration: _premiumInputDecoration(labelText: 'Start Date', prefixIcon: Icons.date_range_outlined),
                                    onChanged: (val) => item['startDate'] = val,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: TextFormField(
                                    initialValue: item['endDate'] ?? '',
                                    decoration: _premiumInputDecoration(labelText: 'End Date', prefixIcon: Icons.date_range),
                                    onChanged: (val) => item['endDate'] = val,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              initialValue: item['description'] ?? '',
                              maxLines: 3,
                              decoration: _premiumInputDecoration(labelText: 'Key Duties & Achievements', prefixIcon: Icons.article_outlined),
                              onChanged: (val) => item['description'] = val,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildEducationTab() {
    final theme = Theme.of(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Education Details',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.5),
              ),
              ElevatedButton.icon(
                onPressed: _addEducationItem,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add School'),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _education.isEmpty
              ? const Center(child: Text('No education items. Add one!'))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  itemCount: _education.length,
                  itemBuilder: (context, index) {
                    final item = _education[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16.0),
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: theme.colorScheme.outlineVariant, width: 0.5),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Education #${index + 1}',
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                                  onPressed: () {
                                    setState(() {
                                      _education.removeAt(index);
                                    });
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              initialValue: item['school'] ?? '',
                              decoration: _premiumInputDecoration(labelText: 'School / University', prefixIcon: Icons.school_outlined),
                              onChanged: (val) => item['school'] = val,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              initialValue: item['degree'] ?? '',
                              decoration: _premiumInputDecoration(labelText: 'Degree / Certificate', prefixIcon: Icons.card_membership_outlined),
                              onChanged: (val) => item['degree'] = val,
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    initialValue: item['startDate'] ?? '',
                                    decoration: _premiumInputDecoration(labelText: 'Start Date', prefixIcon: Icons.calendar_today),
                                    onChanged: (val) => item['startDate'] = val,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: TextFormField(
                                    initialValue: item['endDate'] ?? '',
                                    decoration: _premiumInputDecoration(labelText: 'End Date', prefixIcon: Icons.calendar_view_day),
                                    onChanged: (val) => item['endDate'] = val,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              initialValue: item['description'] ?? '',
                              maxLines: 2,
                              decoration: _premiumInputDecoration(labelText: 'Additional Info / GPA', prefixIcon: Icons.description_outlined),
                              onChanged: (val) => item['description'] = val,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildSkillsProjectsTab() {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Core Skills',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.5),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _skillsController,
            maxLines: 2,
            decoration: _premiumInputDecoration(
              labelText: 'Skills (comma-separated)',
              prefixIcon: Icons.star_border,
              hintText: 'e.g. React, Node.js, Python, Project Management',
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Personal Projects',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.5),
              ),
              ElevatedButton.icon(
                onPressed: _addProjectItem,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add Project'),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_projects.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24.0),
              child: Center(child: Text('No projects added yet')),
            )
          else
            ...List.generate(_projects.length, (index) {
              final item = _projects[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 16.0),
                elevation: 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: theme.colorScheme.outlineVariant, width: 0.5),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Project #${index + 1}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.red),
                            onPressed: () {
                              setState(() {
                                _projects.removeAt(index);
                              });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        initialValue: item['name'] ?? '',
                        decoration: _premiumInputDecoration(labelText: 'Project Name', prefixIcon: Icons.folder_open),
                        onChanged: (val) => item['name'] = val,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: item['link'] ?? '',
                        decoration: _premiumInputDecoration(labelText: 'Project Link / GitHub URL', prefixIcon: Icons.insert_link),
                        onChanged: (val) => item['link'] = val,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: item['description'] ?? '',
                        maxLines: 2,
                        decoration: _premiumInputDecoration(labelText: 'Short Description', prefixIcon: Icons.chat_bubble_outline),
                        onChanged: (val) => item['description'] = val,
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildAITab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Loading Overlay State
          if (_loadingAI) ...[
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.purple.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.purple.withValues(alpha: 0.2)),
              ),
              child: const Column(
                children: [
                  CircularProgressIndicator(color: Colors.purple),
                  SizedBox(height: 16),
                  Text(
                    'Gemini is building your resume...',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.purple),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Parsing structure, bullet points, and skills.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
          Card(
            color: Colors.purple.withValues(alpha: 0.03),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.purple.withValues(alpha: 0.25), width: 1.0),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.auto_awesome, color: Colors.purple, size: 22),
                      SizedBox(width: 8),
                      Text(
                        'AI Resume Auto-Generator',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.purple, letterSpacing: -0.5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Provide a description of your target role and background. Gemini will auto-generate your complete resume.',
                    style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.3),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _promptController,
                    maxLines: 3,
                    decoration: _premiumInputDecoration(
                      labelText: 'AI Prompt / Instructions',
                      prefixIcon: Icons.question_answer_outlined,
                      hintText: 'e.g. Write a professional resume for a Mobile Developer with 3 years of Flutter experience...',
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loadingAI ? null : _generateResumeAI,
                    icon: const Icon(Icons.auto_awesome, size: 16),
                    label: const Text('Generate Resume'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.purple,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            color: Colors.blue.withValues(alpha: 0.03),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.blue.withValues(alpha: 0.25), width: 1.0),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.bolt, color: Colors.blue, size: 22),
                      SizedBox(width: 8),
                      Text(
                        'AI ATS Keyword Optimizer',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.blue, letterSpacing: -0.5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Input your target job title and description. Gemini will optimize your resume with high-ranking keywords.',
                    style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.3),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _optJobTitleController,
                    decoration: _premiumInputDecoration(labelText: 'Target Job Title', prefixIcon: Icons.title_outlined),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _optJobDescController,
                    maxLines: 3,
                    decoration: _premiumInputDecoration(labelText: 'Target Job Description', prefixIcon: Icons.text_snippet_outlined),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loadingAI ? null : _optimizeResumeAI,
                    icon: const Icon(Icons.bolt, size: 16),
                    label: const Text('Optimize Resume'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
