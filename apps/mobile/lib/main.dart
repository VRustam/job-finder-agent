import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'features/auth/auth_gate.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase.
  // We use String.fromEnvironment for configuration variables.
  await Supabase.initialize(
    url: const String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: 'https://placeholder-url.supabase.co',
    ),
    publishableKey: const String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: 'placeholder-anon-key-value',
    ),
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Job Finder Agent',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          primary: const Color(0xFF4F46E5),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1F493D),
          primary: const Color(0xFF1F493D),
          surface: const Color(0xFF17382F),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF1F493D),
        useMaterial3: true,
      ),
      themeMode: ThemeMode.system,
      home: const AuthGate(),
      debugShowCheckedModeBanner: false,
    );
  }
}
