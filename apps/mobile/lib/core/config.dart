import 'dart:io';

class AppConfig {
  static String get backendUrl {
    const envUrl = String.fromEnvironment('BACKEND_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }
    // Production server Vercel deployment URL
    return 'https://job-finder-agent-phi.vercel.app';
  }
}
