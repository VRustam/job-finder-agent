import 'dart:io';

class AppConfig {
  static String get backendUrl {
    const envUrl = String.fromEnvironment('BACKEND_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }
    // Fallback for local development
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
}
