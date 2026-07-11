import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../../core/config.dart';
import 'tutorials_screen.dart';

class InterviewCoachScreen extends StatefulWidget {
  const InterviewCoachScreen({super.key});

  @override
  State<InterviewCoachScreen> createState() => _InterviewCoachScreenState();
}

class _InterviewCoachScreenState extends State<InterviewCoachScreen> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _resumes = [];
  String? _selectedResumeId;
  final _roleController = TextEditingController();
  final _descriptionController = TextEditingController();

  bool _loading = true;
  bool _practiceStarted = false;
  List<dynamic> _questions = [];
  int _currentQuestionIndex = 0;
  final _answerController = TextEditingController();

  bool _submittingAnswer = false;
  Map<String, dynamic>? _currentFeedback;
  final List<Map<String, dynamic>> _historyFeedbacks = [];

  String get _serverUrl => AppConfig.backendUrl;

  @override
  void initState() {
    super.initState();
    _loadResumes();
  }

  Future<void> _loadResumes() async {
    try {
      final response = await _supabase
          .from('resumes')
          .select('id, title')
          .order('updated_at', ascending: false);

      setState(() {
        _resumes = List<Map<String, dynamic>>.from(response);
        if (_resumes.isNotEmpty) {
          _selectedResumeId = _resumes.first['id'];
        }
      });
    } catch (err) {
      debugPrint('Failed to load resumes: $err');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _startPractice() async {
    if (_roleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter target role/job title')),
      );
      return;
    }

    setState(() => _loading = true);

    final token = _supabase.auth.currentSession?.accessToken;

    try {
      final response = await http.post(
        Uri.parse('$_serverUrl/api/interview/start'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'resumeId': _selectedResumeId,
          'jobTitle': _roleController.text.trim(),
          'jobDescription': _descriptionController.text.trim(),
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _questions = data['questions'] ?? [];
          _practiceStarted = true;
          _currentQuestionIndex = 0;
          _currentFeedback = null;
          _answerController.clear();
          _historyFeedbacks.clear();
        });
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Server error');
      }
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to start practice: $err')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _submitAnswer() async {
    if (_answerController.text.trim().isEmpty) return;

    setState(() => _submittingAnswer = true);

    final token = _supabase.auth.currentSession?.accessToken;

    try {
      final currentQuestion = _questions[_currentQuestionIndex];

      final response = await http.post(
        Uri.parse('$_serverUrl/api/interview/submit-answer'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'question': currentQuestion['question'],
          'type': currentQuestion['type'],
          'answer': _answerController.text.trim(),
          'jobTitle': _roleController.text.trim(),
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _currentFeedback = data;
        });
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Server grading error');
      }
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit answer: $err')),
      );
    } finally {
      setState(() => _submittingAnswer = false);
    }
  }

  void _nextQuestion() {
    if (_currentFeedback == null) return;

    _historyFeedbacks.add({
      'question': _questions[_currentQuestionIndex]['question'],
      'answer': _answerController.text.trim(),
      'score': _currentFeedback!['score'] ?? 0,
      'feedback': _currentFeedback!['feedback'] ?? '',
    });

    if (_currentQuestionIndex < _questions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
        _currentFeedback = null;
        _answerController.clear();
      });
    } else {
      _finishPractice();
    }
  }

  Future<void> _finishPractice() async {
    setState(() => _loading = true);
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      final double avgScore = _historyFeedbacks.map((f) => f['score'] as int).reduce((a, b) => a + b) / _historyFeedbacks.length;

      await _supabase.from('interview_sessions').insert({
        'user_id': userId,
        'job_title': _roleController.text.trim(),
        'questions': _historyFeedbacks,
        'score': avgScore.round(),
      });

      if (!mounted) return;

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Practice Completed!'),
          content: Text(
            'Average Score: ${avgScore.round()}/100\nYour practice session has been successfully logged to Supabase history!',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                setState(() {
                  _practiceStarted = false;
                });
              },
              child: const Text('Back to Setup'),
            ),
          ],
        ),
      );
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save session: $err')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Widget _buildSetup() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Configure Mock Session',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Simulate dynamic interview panel questions based on your resume profile.',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 24),

          // Resume select
          const Text(
            'SELECT RESUME BASE',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _selectedResumeId,
            decoration: const InputDecoration(border: OutlineInputBorder()),
            items: _resumes.map((res) {
              return DropdownMenuItem<String>(
                value: res['id'],
                child: Text(res['title'] ?? 'Untitled Resume'),
              );
            }).toList(),
            onChanged: (val) {
              setState(() => _selectedResumeId = val);
            },
          ),
          const SizedBox(height: 16),

          // Role Title
          const Text(
            'TARGET JOB TITLE *',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _roleController,
            decoration: const InputDecoration(
              hintText: 'e.g. Flutter Developer / Product Manager',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),

          // Job Description
          const Text(
            'JOB DESCRIPTION (OPTIONAL)',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _descriptionController,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Paste requirements to align custom questions...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 28),

          ElevatedButton(
            onPressed: _startPractice,
            child: const Text('Start Mock Practice'),
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          // Tutorials Card
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            color: Colors.purple.withOpacity(0.03),
            elevation: 0,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.book, color: Colors.purple),
                      SizedBox(width: 8),
                      Text(
                        'Interview Tutorials',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Study core technology concepts, cheatsheets, and common interview questions before starting your mock session.',
                    style: TextStyle(color: Colors.grey, fontSize: 11, height: 1.4),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const TutorialsScreen()),
                      );
                    },
                    child: const Text('Study Preparation Guides'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimulator() {
    final currentQuestion = _questions[_currentQuestionIndex];
    final progress = (_currentQuestionIndex + 1) / _questions.length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Question ${_currentQuestionIndex + 1} of ${_questions.length}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              Text(
                '${(progress * 100).round()}%',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.purple),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.grey[200],
            color: Colors.purple,
          ),
          const SizedBox(height: 24),

          // Question Card
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      (currentQuestion['type'] ?? 'general').toString().toUpperCase(),
                      style: const TextStyle(color: Colors.purple, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    currentQuestion['question'] ?? '',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, height: 1.4),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Feedback or Input area
          if (_currentFeedback == null) ...[
            const Text(
              'YOUR RESPONSE',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _answerController,
              maxLines: 5,
              decoration: const InputDecoration(
                hintText: 'Type your answer here...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _submittingAnswer ? null : _submitAnswer,
              child: _submittingAnswer
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Submit Response'),
            ),
          ] else ...[
            // Grading score
            Row(
              children: [
                const Text(
                  'Score: ',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  '${_currentFeedback!['score'] ?? 0}/100',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: (_currentFeedback!['score'] ?? 0) >= 70 ? Colors.green : Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'FEEDBACK & GAP ANALYSIS',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Text(
              _currentFeedback!['feedback'] ?? '',
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 16),
            const Text(
              'SUGGESTED ANSWER DRAFT',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _currentFeedback!['suggestedAnswer'] ?? '',
                style: const TextStyle(fontSize: 12, height: 1.4, fontStyle: FontStyle.italic),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _nextQuestion,
              child: Text(_currentQuestionIndex < _questions.length - 1 ? 'Next Question' : 'Complete Practice'),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Interview Coach'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _practiceStarted
              ? _buildSimulator()
              : _buildSetup(),
    );
  }
}
