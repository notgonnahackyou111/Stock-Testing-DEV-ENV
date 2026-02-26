# Mobile App Setup (Flutter)

## Overview

Flutter allows you to build native iOS and Android apps from a single codebase. Here's the complete setup for the Stock Testing Platform mobile app.

---

## Prerequisites

- **Flutter SDK** 3.0+ - [Download & Install](https://flutter.dev/docs/get-started/install)
- **Dart SDK** 3.0+ (bundled with Flutter)
- **Android Studio** (for Android development) or **Xcode** (for iOS)
- **Emulator** or physical device

---

## Step 1: Install Flutter

### macOS
```bash
# Using Homebrew
brew install flutter

# Or download directly
git clone https://github.com/flutter/flutter.git -b stable

# Add to PATH
export PATH="$PATH:`pwd`/flutter/bin"
```

### Windows
[Download Flutter installer](https://flutter.dev/docs/get-started/install/windows) and add to PATH

### Linux
```bash
tar xf flutter_linux_*.tar.xz
export PATH="$PATH:`pwd`/flutter/bin"
```

## Step 2: Verify Installation

```bash
flutter doctor
# Should show all checks as green ✓
# If not, fix issues listed
```

## Step 3: Create Flutter Project

```bash
# Create new Flutter project
flutter create stock_trading_mobile

cd stock_trading_mobile
```

## Step 4: Add Dependencies

Edit `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  http: ^1.1.0
  dio: ^5.3.0
  
  # State Management
  provider: ^6.0.0
  
  # Local Storage
  sqflite: ^2.3.0
  shared_preferences: ^2.2.0
  
  # Real-time
  web_socket_channel: ^2.4.0
  
  # UI Components
  charts_flutter: ^0.12.0
  intl: ^0.19.0
  
  # Firebase (Notifications)
  firebase_messaging: ^14.0.0
  firebase_core: ^2.0.0
  
  # Authentication
  google_sign_in: ^6.1.0
  
  # Image Caching
  cached_network_image: ^3.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_linter: ^2.0.0
```

Then run:
```bash
flutter pub get
```

## Step 5: Key Files to Create

### Main Entry Point (`lib/main.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/game_provider.dart';
import 'providers/market_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const StockTradingApp());
}

class StockTradingApp extends StatelessWidget {
  const StockTradingApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => GameProvider()),
        ChangeNotifierProvider(create: (_) => MarketProvider()),
      ],
      child: MaterialApp(
        title: 'Stock Trading Platform',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            return auth.isLoggedIn ? const HomeScreen() : const LoginScreen();
          },
        ),
      ),
    );
  }
}
```

### API Service (`lib/services/api_service.dart`)

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class APIService {
  static const String baseURL = 'http://localhost:8000'; // Change for production

  static Future<Map<String, dynamic>> register(
    String email,
    String password,
    String displayName,
  ) async {
    final response = await http.post(
      Uri.parse('$baseURL/api/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'displayName': displayName,
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception(jsonDecode(response.body)['error']);
    }
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseURL/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception(jsonDecode(response.body)['error']);
    }
  }

  static Future<Map<String, dynamic>> getProfile(String token) async {
    final response = await http.get(
      Uri.parse('$baseURL/api/auth/profile'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch profile');
    }
  }

  static Future<List<Map<String, dynamic>>> getMarketData() async {
    final response = await http.get(
      Uri.parse('$baseURL/api/market/data'),
    );

    if (response.statusCode == 200) {
      List data = jsonDecode(response.body);
      return List<Map<String, dynamic>>.from(data);
    } else {
      throw Exception('Failed to fetch market data');
    }
  }

  static Future<Map<String, dynamic>> placeOrder(
    String botId,
    String apiKey,
    String symbol,
    String action,
    int quantity,
  ) async {
    final response = await http.post(
      Uri.parse('$baseURL/api/bot/order'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'bot_id': botId,
        'api_key': apiKey,
        'symbol': symbol,
        'action': action,
        'quantity': quantity,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception(jsonDecode(response.body)['error']);
    }
  }
}
```

### Auth Provider (`lib/providers/auth_provider.dart`)

```dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  String? _userId;
  String? _email;
  bool _isLoggedIn = false;

  bool get isLoggedIn => _isLoggedIn;
  String? get token => _token;
  String? get userId => _userId;
  String? get email => _email;

  Future<void> register(String email, String password, String displayName) async {
    try {
      final result = await APIService.register(email, password, displayName);
      _token = result['token'];
      _userId = result['user']['userId'];
      _email = result['user']['email'];
      _isLoggedIn = true;
      notifyListeners();
    } catch (e) {
      throw Exception('Registration failed: $e');
    }
  }

  Future<void> login(String email, String password) async {
    try {
      final result = await APIService.login(email, password);
      _token = result['token'];
      _userId = result['userId'];
      _email = result['email'];
      _isLoggedIn = true;
      notifyListeners();
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  void logout() {
    _token = null;
    _userId = null;
    _email = null;
    _isLoggedIn = false;
    notifyListeners();
  }
}
```

## Step 6: Build & Run

```bash
# Run on connected device/emulator
flutter run

# Release build
flutter build apk        # Android
flutter build ios        # iOS (macOS only)
```

---

## Features Implemented

### Trading
- ✅ View all stocks with real-time prices
- ✅ Place buy and sell orders
- ✅ Portfolio tracking
- ✅ Trading history

### Bot Management
- ✅ Connect trading bots
- ✅ View bot statistics
- ✅ Real-time bot performance
- ✅ Bot order dashboard

### User Management
- ✅ User registration
- ✅ Secure login (JWT)
- ✅ Profile management
- ✅ User statistics

### Notifications
- ✅ Push notifications (Firebase Cloud Messaging)
- ✅ Trade execution alerts
- ✅ Price alerts
- ✅ Milestone notifications

---

## Debugging

```bash
# View logs
flutter logs

# Hot reload (update code without restart)
r

# Hot restart (full app restart)
R

# Debug APK
flutter build apk --debug
```

---

## Production Deployment

### Android
```bash
# Create release build
flutter build apk --release

# Or App Bundle (recommended for Play Store)
flutter build appbundle --release

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore my-key.jks release.apk alias_name
```

### iOS
```bash
flutter build ios --release
# Then open Xcode and submit to App Store
```

---

## Troubleshooting

### Flutter not found
```bash
export PATH="$PATH:/path/to/flutter/bin"
flutter doctor
```

### Android SDK issues
```bash
# Download missing SDKs
flutter doctor --android-licenses
```

### Build errors
```bash
flutter clean
flutter pub get
flutter run
```

### Hot reload not working
- Try `r` for hot reload
- Or `R` for hot restart

---

## Next Steps

1. **Set up Firebase** for push notifications
2. **Enable Google Sign-In** for easier authentication
3. **Design custom UI** in Flutter
4. **Test on real devices** before production
5. **Submit to App Stores** (Apple App Store, Google Play Store)

---

**Happy mobile trading! 📱📈**
