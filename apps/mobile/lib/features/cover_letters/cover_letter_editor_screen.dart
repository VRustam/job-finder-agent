import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CoverLetterEditorScreen extends StatefulWidget {
  final String coverLetterId;
  final String initialTitle;
  final String initialContent;

  const CoverLetterEditorScreen({
    super.key,
    required this.coverLetterId,
    required this.initialTitle,
    required this.initialContent,
  });

  @override
  State<CoverLetterEditorScreen> createState() => _CoverLetterEditorScreenState();
}

class _CoverLetterEditorScreenState extends State<CoverLetterEditorScreen> {
  final _supabase = Supabase.instance.client;
  late TextEditingController _titleController;
  late TextEditingController _contentController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialTitle);
    _contentController = TextEditingController(text: widget.initialContent);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    setState(() => _saving = true);
    try {
      await _supabase.from('cover_letters').update({
        'title': _titleController.text.trim(),
        'content': _contentController.text.trim(),
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', widget.coverLetterId);

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

  void _copyToClipboard() {
    Clipboard.setData(ClipboardData(text: _contentController.text.trim()));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copied cover letter to clipboard!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _titleController,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          decoration: const InputDecoration(
            border: InputBorder.none,
            hintText: 'Cover Letter Title',
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy_rounded),
            tooltip: 'Copy to Clipboard',
            onPressed: _copyToClipboard,
          ),
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
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'EDIT CONTENT',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: TextField(
                  controller: _contentController,
                  maxLines: null,
                  expands: true,
                  style: const TextStyle(height: 1.5, fontFamily: 'serif'),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.all(16),
                    filled: true,
                    fillColor: isDark ? Colors.grey[900]?.withValues(alpha: 0.3) : Colors.grey[100]?.withValues(alpha: 0.3),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: theme.colorScheme.primary, width: 1.5),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
