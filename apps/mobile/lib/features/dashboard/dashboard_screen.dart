import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  User? _user;
  String _authProvider = 'email';

  @override
  void initState() {
    super.initState();
    _fetchUser();
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
    // AuthGate will automatically handle navigation back to SignInScreen
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
      ),
      _DashboardModule(
        title: 'Job Applications',
        description: 'Track submissions, recruiter emails, and app status in a Kanban board.',
        icon: Icons.work_outline_rounded,
      ),
      _DashboardModule(
        title: 'Calendar Scheduler',
        description: 'Coordinate interview openings and allocate preparation time.',
        icon: Icons.calendar_today_outlined,
      ),
      _DashboardModule(
        title: 'Interview Coach',
        description: 'Practice behavioral or technical mock reviews with AI evaluation.',
        icon: Icons.explore_outlined,
      ),
      _DashboardModule(
        title: 'Live Translation',
        description: 'Get real-time audio translation and captions for video interviews.',
        icon: Icons.translate_rounded,
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
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Welcome Card Banner
            Container(
              padding: const EdgeInsets.all(24.0),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[900] : Colors.black,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back,',
                    style: TextStyle(
                      color: isDark ? Colors.grey[400] : Colors.grey[300],
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    displayName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (displayEmail != displayName) ...[
                    const SizedBox(height: 2),
                    Text(
                      displayEmail,
                      style: TextStyle(
                        color: Colors.grey[500],
                        fontSize: 12,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    'Auth provider: $_authProvider',
                    style: TextStyle(
                      color: isDark ? Colors.grey[600] : Colors.grey[500],
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Modules header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Career Modules',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Phase 1 Active',
                    style: TextStyle(
                      fontSize: 10,
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Modules Grid/List
            ...modules.map((mod) {
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: theme.colorScheme.outlineVariant,
                    width: 0.5,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          mod.icon,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  mod.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[200],
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'COMING SOON',
                                    style: TextStyle(
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black54,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              mod.description,
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
}

class _DashboardModule {
  final String title;
  final String description;
  final IconData icon;

  _DashboardModule({
    required this.title,
    required this.description,
    required this.icon,
  });
}
