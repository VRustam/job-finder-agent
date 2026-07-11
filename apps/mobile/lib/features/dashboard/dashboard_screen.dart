import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:mobile/services/notification_service.dart';
import 'package:mobile/features/applications/applications_screen.dart';
import 'package:mobile/features/calendar/calendar_agenda_screen.dart';
import 'package:mobile/features/interview/interview_coach_screen.dart';
import 'package:mobile/features/market/market_trends_screen.dart';
import 'package:mobile/features/resumes/resumes_screen.dart';
import 'package:mobile/features/cover_letters/cover_letters_screen.dart';
import 'package:mobile/features/translation/live_translation_screen.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mobile/core/config.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  User? _user;
  String _authProvider = 'email';

  // Floating AI Chat Widget state
  final _chatMessageController = TextEditingController();
  final _chatScrollController = ScrollController();
  final List<Map<String, dynamic>> _chatMessages = [];
  bool _chatLoading = false;
  bool _isChatOpen = false;

  @override
  void initState() {
    super.initState();
    _fetchUser();
    
    // Initialize Local Notifications on application start
    NotificationService().init();

    // Welcome message from AI Agent
    _chatMessages.add({
      'text': "Hello! I am your AI Career Assistant. How can I help you today with your resumes, job applications, calendar, or interview preparation?",
      'isUser': false,
    });
  }

  @override
  void dispose() {
    _chatMessageController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  void _fetchUser() {
    final currentUser = Supabase.instance.client.auth.currentUser;
    setState(() {
      _user = currentUser;
      if (currentUser != null) {
        _authProvider = currentUser.appMetadata['provider'] ?? 'email';
      }
    });
  }

  Future<void> _signOut() async {
    await Supabase.instance.client.auth.signOut();
  }

  void _onModuleTap(_DashboardModule mod) {
    if (mod.status == 'COMING SOON') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${mod.title} is coming soon to mobile! Please use the Web dashboard.')),
      );
      return;
    }

    if (mod.screen != null) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (context) => mod.screen!),
      );
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollController.hasClients) {
        _chatScrollController.animateTo(
          _chatScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendChatMessage() async {
    final text = _chatMessageController.text.trim();
    if (text.isEmpty) return;

    _chatMessageController.clear();
    setState(() {
      _chatMessages.add({'text': text, 'isUser': true});
      _chatLoading = true;
    });
    _scrollToBottom();

    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      
      // Build history for Gemini api context
      final history = _chatMessages
          .where((m) => (m['text'] as String).isNotEmpty)
          .map((m) => {
                'role': m['isUser'] == true ? 'user' : 'model',
                'text': m['text'],
              })
          .toList();

      // Remove the last added user message from history array to avoid duplicating
      if (history.isNotEmpty) {
        history.removeLast();
      }

      final response = await http.post(
        Uri.parse('${AppConfig.backendUrl}/api/agent/chat'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'message': text,
          'history': history,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to connect to AI Agent backend');
      }

      final data = jsonDecode(response.body);
      final reply = data['message'] ?? 'Sorry, I could not understand that.';
      final action = data['action'];
      final target = data['target'];

      setState(() {
        _chatMessages.add({
          'text': reply,
          'isUser': false,
          'action': action,
          'target': target,
        });
      });
    } catch (err) {
      setState(() {
        _chatMessages.add({
          'text': "Error: Could not connect to the AI Career Agent backend. Please ensure your backend server is running.",
          'isUser': false,
        });
      });
    } finally {
      setState(() => _chatLoading = false);
      _scrollToBottom();
    }
  }

  Widget _buildFloatingChatWidget() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_isChatOpen) ...[
          // Chat Drawer Window
          Container(
            width: 300,
            height: 400,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF17382F) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.1),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Column(
                children: [
                  // Header
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF0F0C20), Color(0xFF2E0854)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.purple.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.smart_toy_outlined, color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 8),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'AI Career Agent',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              'Online',
                              style: TextStyle(
                                color: Colors.green,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white, size: 16),
                          onPressed: () => setState(() => _isChatOpen = false),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  ),
                  // Message Area
                  Expanded(
                    child: ListView.builder(
                      controller: _chatScrollController,
                      padding: const EdgeInsets.all(12),
                      itemCount: _chatMessages.length,
                      itemBuilder: (context, index) {
                        final msg = _chatMessages[index];
                        final isUser = msg['isUser'] == true;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10.0),
                          child: Align(
                            alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              constraints: const BoxConstraints(
                                maxWidth: 200,
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: isUser
                                    ? const Color(0xFF4F46E5)
                                    : (isDark ? const Color(0xFF2C5E50) : Colors.grey[200]),
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(14),
                                  topRight: const Radius.circular(14),
                                  bottomLeft: Radius.circular(isUser ? 14 : 0),
                                  bottomRight: Radius.circular(isUser ? 0 : 14),
                                ),
                              ),
                              child: Text(
                                msg['text'] ?? '',
                                style: TextStyle(
                                  color: isUser
                                      ? Colors.white
                                      : (isDark ? Colors.white : Colors.black87),
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  if (_chatLoading)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: isDark ? const Color(0xFF4F46E5) : Colors.purple,
                        ),
                      ),
                    ),
                  // Input bar
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF17382F) : Colors.grey[50],
                      border: Border(
                        top: BorderSide(
                          color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05),
                          width: 1,
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _chatMessageController,
                            decoration: InputDecoration(
                              hintText: 'Ask your AI Agent...',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              hintStyle: const TextStyle(fontSize: 11),
                            ),
                            style: const TextStyle(fontSize: 12),
                            onSubmitted: (_) => _sendChatMessage(),
                          ),
                        ),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.send, size: 16),
                          color: isDark ? const Color(0xFF4F46E5) : Colors.purple,
                          onPressed: _sendChatMessage,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
        // Floating circular button with web-like gradient
        GestureDetector(
          onTap: () => setState(() {
            _isChatOpen = !_isChatOpen;
            if (_isChatOpen) {
              _scrollToBottom();
            }
          }),
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF4F46E5), Color(0xFF9333EA), Color(0xFFEC4899)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.purple.withValues(alpha: 0.4),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Icon(
              _isChatOpen ? Icons.close : Icons.message,
              color: Colors.white,
              size: 24,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final displayName = _user?.userMetadata?['full_name'] ?? _user?.email ?? 'User';
    final displayEmail = _user?.email ?? '';

    final modules = [
      _DashboardModule(
        title: 'Resume Builder',
        description: 'Optimize content for ATS systems and tailor resumes with AI.',
        icon: Icons.description_outlined,
        status: 'ACTIVE',
        screen: const ResumesScreen(),
      ),
      _DashboardModule(
        title: 'Cover Letters',
        description: 'Generate job-specific müraciət məktubları from your CV details.',
        icon: Icons.mail_outline_rounded,
        status: 'ACTIVE',
        screen: const CoverLettersScreen(),
      ),
      _DashboardModule(
        title: 'Job Applications',
        description: 'Track submissions, recruiter emails, and app status in a list view.',
        icon: Icons.work_outline_rounded,
        status: 'ACTIVE',
        screen: const ApplicationsScreen(),
      ),
      _DashboardModule(
        title: 'Calendar Scheduler',
        description: 'Coordinate interview openings and schedule local alerts reminder.',
        icon: Icons.calendar_today_outlined,
        status: 'ACTIVE',
        screen: const CalendarAgendaScreen(),
      ),
      _DashboardModule(
        title: 'Interview Coach',
        description: 'Practice behavioral or technical mock reviews with AI evaluation.',
        icon: Icons.explore_outlined,
        status: 'ACTIVE',
        screen: const InterviewCoachScreen(),
      ),
      _DashboardModule(
        title: 'Live Translation',
        description: 'Get real-time audio translation and captions for video interviews.',
        icon: Icons.translate_rounded,
        status: 'ACTIVE',
        screen: const LiveTranslationScreen(),
      ),
      _DashboardModule(
        title: 'Market Analysis',
        description: 'Research daily high-demand sectors and skills powered by Gemini AI.',
        icon: Icons.trending_up_rounded,
        status: 'ACTIVE',
        screen: const MarketTrendsScreen(),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Job Finder Agent',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: _signOut,
          ),
        ],
      ),
      body: Stack(
        children: [
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                // Welcome Card Banner with Indigo-Purple Gradient
                Container(
                  padding: const EdgeInsets.all(24.0),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: isDark
                          ? [const Color(0xFF2E0854), const Color(0xFF0F0C20)]
                          : [const Color(0xFF4338CA), const Color(0xFF6D28D9)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6D28D9).withValues(alpha: 0.25),
                        blurRadius: 15,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome back,',
                        style: TextStyle(
                          color: isDark ? Colors.grey[400] : Colors.white70,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        displayName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                      if (displayEmail != displayName) ...[
                        const SizedBox(height: 2),
                        Text(
                          displayEmail,
                          style: TextStyle(
                            color: isDark ? Colors.grey[500] : Colors.white60,
                            fontSize: 12,
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Provider: ${_authProvider.toUpperCase()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Modules header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Career Modules',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        letterSpacing: -0.5,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.purple.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Phases 1-6 Active',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.purple,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Modules Grid view
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: modules.length,
                  itemBuilder: (context, index) {
                    final mod = modules[index];
                    final isActive = mod.status == 'ACTIVE';

                    return StaggeredFadeTransition(
                      delay: Duration(milliseconds: index * 60),
                      child: ScaleOnTap(
                        onTap: () => _onModuleTap(mod),
                        child: Card(
                          margin: EdgeInsets.zero,
                          color: isDark ? const Color(0xFF2C5E50).withValues(alpha: 0.7) : Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.08)
                                  : Colors.black.withValues(alpha: 0.08),
                              width: 1.0,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: isActive
                                            ? theme.colorScheme.primaryContainer
                                            : theme.colorScheme.surfaceContainerHighest,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        mod.icon,
                                        size: 20,
                                        color: isActive
                                            ? theme.colorScheme.onPrimaryContainer
                                            : Colors.grey,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isActive
                                            ? const Color(0xFF4ADE80).withValues(alpha: 0.15)
                                            : (isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.05)),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        mod.status,
                                        style: TextStyle(
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                          color: isActive
                                              ? const Color(0xFF4ADE80)
                                              : (isDark ? Colors.white60 : Colors.black45),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        mod.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: isDark ? Colors.white : const Color(0xFF1F493D),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Expanded(
                                        child: Text(
                                          mod.description,
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: isDark
                                                ? Colors.white.withValues(alpha: 0.75)
                                                : const Color(0xFF1F493D).withValues(alpha: 0.75),
                                            fontSize: 10.5,
                                            height: 1.25,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          // Sticky Floating AI Chat Widget
          Positioned(
            bottom: 20,
            right: 20,
            child: _buildFloatingChatWidget(),
          ),
        ],
      ),
    );
  }
}

class _DashboardModule {
  final String title;
  final String description;
  final IconData icon;
  final String status;
  final Widget? screen;

  _DashboardModule({
    required this.title,
    required this.description,
    required this.icon,
    required this.status,
    this.screen,
  });
}

class ScaleOnTap extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;

  const ScaleOnTap({super.key, required this.child, required this.onTap});

  @override
  State<ScaleOnTap> createState() => _ScaleOnTapState();
}

class _ScaleOnTapState extends State<ScaleOnTap> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onTap();
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scale,
        child: widget.child,
      ),
    );
  }
}

class StaggeredFadeTransition extends StatefulWidget {
  final Widget child;
  final Duration delay;

  const StaggeredFadeTransition({
    super.key,
    required this.child,
    required this.delay,
  });

  @override
  State<StaggeredFadeTransition> createState() => _StaggeredFadeTransitionState();
}

class _StaggeredFadeTransitionState extends State<StaggeredFadeTransition> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _slideAnimation = Tween<Offset>(begin: const Offset(0.0, 0.15), end: Offset.zero)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    Future.delayed(widget.delay, () {
      if (mounted) {
        _controller.forward();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: FadeTransition(
        opacity: _animation,
        child: widget.child,
      ),
    );
  }
}

