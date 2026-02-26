# Flutter Mobile App Starter Guide

This guide helps you build a Flutter mobile app for the Stock Testing Platform.

## Prerequisites

1. **Flutter SDK** - https://flutter.dev/docs/get-started/install
2. **Dart** (included with Flutter)
3. **Android Studio** or **Xcode** (for emulators)
4. **VS Code** with Flutter extension (optional but recommended)

## Quick Start

### Step 1: Create Flutter Project

```bash
flutter create stock_testing_app
cd stock_testing_app
```

### Step 2: Add Dependencies

Edit `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^0.13.5
  provider: ^6.0.0
  shared_preferences: ^2.0.15
  charts_flutter: ^0.12.0
  jwt_decoder: ^2.0.1
  flutter_local_notifications: ^13.0.0
  connectivity_plus: ^3.0.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_linter: ^2.0.0
```

Run:
```bash
flutter pub get
```

### Step 3: Project Structure

```
lib/
├── main.dart                 # App entry point
├── config/
│   └── api_config.dart      # API configuration
├── models/
│   ├── user.dart
│   ├── bot.dart
│   ├── game_state.dart
│   └── trade.dart
├── services/
│   ├── auth_service.dart
│   ├── api_service.dart
│   ├── storage_service.dart
│   └── notification_service.dart
├── providers/
│   ├── auth_provider.dart
│   ├── game_provider.dart
│   └── bot_provider.dart
├── screens/
│   ├── login_screen.dart
│   ├── register_screen.dart
│   ├── home_screen.dart
│   ├── game_screen.dart
│   ├── bot_dashboard_screen.dart
│   ├── portfolio_screen.dart
│   └── settings_screen.dart
├── widgets/
│   ├── stock_card.dart
│   ├── stat_card.dart
│   ├── trade_history.dart
│   └── navigation_drawer.dart
└── utils/
    ├── constants.dart
    └── helpers.dart
```

## Core Files

### 1. API Configuration (`lib/config/api_config.dart`)

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:8000';
  // Or use environment variable for production
  // static const String baseUrl = 'https://your-render-domain.com';

  static const String authRegister = '$baseUrl/api/auth/register';
  static const String authLogin = '$baseUrl/api/auth/login';
  static const String authVerify = '$baseUrl/api/auth/verify';
  static const String authMe = '$baseUrl/api/auth/me';

  static const String savesCreate = '$baseUrl/api/saves/create';
  static const String bots = '$baseUrl/api/bot';

  static const Duration timeout = Duration(seconds: 30);
}
```

### 2. Authentication Service (`lib/services/auth_service.dart`)

```dart
class AuthService {
  final http.Client client;
  String? _token;

  AuthService({http.Client? client}) : client = client ?? http.Client();

  Future<void> register(String email, String username, String password) async {
    final response = await client.post(
      Uri.parse(ApiConfig.authRegister),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'username': username,
        'password': password,
      }),
    ).timeout(ApiConfig.timeout);

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      _token = data['token'];
      await _saveToken(_token!);
    } else {
      throw Exception(jsonDecode(response.body)['error']);
    }
  }

  Future<void> login(String email, String password) async {
    final response = await client.post(
      Uri.parse(ApiConfig.authLogin),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    ).timeout(ApiConfig.timeout);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _token = data['token'];
      await _saveToken(_token!);
    } else {
      throw Exception(jsonDecode(response.body)['error']);
    }
  }

  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<String?> getToken() async {
    if (_token != null) return _token;

    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    return _token;
  }

  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  bool get isAuthenticated => _token != null;
}
```

### 3. Game State Provider (`lib/providers/game_provider.dart`)

```dart
class GameProvider extends ChangeNotifier {
  final ApiService apiService;
  
  GameState? _gameState;
  String? _saveCode;
  List<Stock> _stocks = [];
  
  GameProvider({required this.apiService});

  GameState? get gameState => _gameState;
  String? get saveCode => _saveCode;
  List<Stock> get stocks => _stocks;

  Future<void> createSaveCode() async {
    try {
      _saveCode = await apiService.createSaveCode();
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> saveGameState(GameState state) async {
    try {
      if (_saveCode == null) await createSaveCode();
      await apiService.saveGameState(_saveCode!, state);
      _gameState = state;
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> loadGameState(String code) async {
    try {
      _gameState = await apiService.loadGameState(code);
      _saveCode = code;
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> loadStocks() async {
    try {
      // Load from embedded data or API
      _stocks = getDefaultStocks(); // Implement in models
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
}
```

### 4. Main App (`lib/main.dart`)

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final authService = AuthService();
  final apiService = ApiService(authService: authService);

  runApp(
    MultiProvider(
      providers: [
        Provider<AuthService>.value(value: authService),
        Provider<ApiService>.value(value: apiService),
        ChangeNotifierProvider(
          create: (_) => AuthProvider(authService),
        ),
        ChangeNotifierProvider(
          create: (_) => GameProvider(apiService: apiService),
        ),
      ],
      child: const StockTestingApp(),
    ),
  );
}

class StockTestingApp extends StatelessWidget {
  const StockTestingApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Stock Testing Platform',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      home: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return authProvider.isLoggedIn
              ? const HomeScreen()
              : const LoginScreen();
        },
      ),
    );
  }
}
```

## Features to Implement

- [ ] **Authentication** - Login/Register
- [ ] **Game Trading** - Simplified game interface
- [ ] **Portfolio View** - View holdings and P&L
- [ ] **Bot Dashboard** - Monitor connected bots
- [ ] **Save/Load System** - Export/import game states
- [ ] **Notifications** - Push notifications for trades
- [ ] **Settings** - User preferences and risk levels
- [ ] **Offline Support** - Cached data for offline play

## Testing

```bash
flutter test
```

## Building for Release

### Android
```bash
flutter build apk --release
flutter build appbundle --release  # For Google Play
```

### iOS
```bash
flutter build ios --release
```

## Deployment

### Google Play Store
1. Create app in Google Play Console
2. Build appbundle
3. Upload to Play Store
4. Set release notes and submit for review

### Apple App Store
1. Create app in App Store Connect
2. Build iOS archive
3. Upload with Xcode or Transporter
4. Submit for review

## Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Dart Language Guide](https://dart.dev/guides)
- [Flutter Packages](https://pub.dev)
- [Material Design](https://material.io/design)

## Support

For issues and bugs, open an issue on GitHub or contact support.

---

**Note**: This is a starter template. Customize for your specific needs and add proper error handling, testing, and analytics.
