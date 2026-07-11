import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool _acceptTerms = false;
  bool _loading = false;
  bool _success = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _signUp() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_acceptTerms) {
      setState(() {
        _errorMessage = 'You must accept the Terms and Privacy Policy.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      await Supabase.instance.client.auth.signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        data: {
          'full_name': _nameController.text.trim(),
        },
        emailRedirectTo: 'ai-career-agent://auth/callback',
      );

      setState(() {
        _success = true;
      });
    } on AuthException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'An unexpected error occurred. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  InputDecoration _premiumInputDecoration({
    required String labelText,
    required IconData prefixIcon,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return InputDecoration(
      labelText: labelText,
      prefixIcon: Icon(prefixIcon, size: 18, color: theme.colorScheme.primary.withValues(alpha: 0.7)),
      filled: true,
      fillColor: isDark ? Colors.grey[900]?.withValues(alpha: 0.4) : Colors.grey[100]?.withValues(alpha: 0.4),
      labelStyle: const TextStyle(fontSize: 13),
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
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_success) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.mark_email_read_outlined,
                  size: 80,
                  color: Colors.purple,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Verify Your Email',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Text(
                  'We have sent a verification link to:\n${_emailController.text.trim()}\n\nPlease check your inbox and click the link to confirm your account.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey, height: 1.4),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  child: const Text('Back to Login'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Account', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF4338CA), Color(0xFF6D28D9)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6D28D9).withValues(alpha: 0.25),
                          blurRadius: 15,
                          offset: const Offset(0, 5),
                        )
                      ],
                    ),
                    child: const Icon(Icons.person_add_alt_1_outlined, color: Colors.white, size: 28),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Join Job Finder Agent',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Begin automating your career development path.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 32),

                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withValues(alpha: 0.25)),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.red, fontSize: 12),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Name field
                TextFormField(
                  controller: _nameController,
                  decoration: _premiumInputDecoration(
                    labelText: 'Full Name',
                    prefixIcon: Icons.person_outline,
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your name.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                // Email field
                TextFormField(
                  controller: _emailController,
                  decoration: _premiumInputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icons.email_outlined,
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your email.';
                    }
                    if (!RegExp(r'\S+@\S+\.\S+').hasMatch(value)) {
                      return 'Please enter a valid email address.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                // Password field
                TextFormField(
                  controller: _passwordController,
                  decoration: _premiumInputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icons.lock_outline,
                  ),
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a password.';
                    }
                    if (value.length < 8) {
                      return 'Password must be at least 8 characters.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                // Confirm Password field
                TextFormField(
                  controller: _confirmPasswordController,
                  decoration: _premiumInputDecoration(
                    labelText: 'Confirm Password',
                    prefixIcon: Icons.lock_outline,
                  ),
                  obscureText: true,
                  validator: (value) {
                    if (value != _passwordController.text) {
                      return 'Passwords do not match.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                // Terms Switch/Checkbox
                CheckboxListTile(
                  value: _acceptTerms,
                  onChanged: (val) {
                    setState(() {
                      _acceptTerms = val ?? false;
                    });
                  },
                  title: const Text(
                    'I accept the Terms of Service and Privacy Policy.',
                    style: TextStyle(fontSize: 12),
                  ),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 20),

                // Register Button with Indigo-Purple Gradient
                Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4338CA), Color(0xFF6D28D9)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ElevatedButton(
                    onPressed: _loading ? null : _signUp,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      foregroundColor: Colors.white,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : const Text(
                            'Create Account',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
