# Stock Testing Platform - Flutter Mobile App

## Overview

This Flutter app provides a mobile version of the Stock Testing Platform, allowing users to trade on-the-go, monitor bot performance, and receive notifications.

## Quick Start

### Prerequisites
- Flutter SDK 3.0+ ([Download](https://flutter.dev/docs/get-started/install))
- Dart 3.0+
- Android Studio or Xcode

### Setup

```bash
# Clone the repository
git clone https://github.com/notgonnahackyou111/Stock-Testing-DEV-ENV.git
cd Stock-Testing-DEV-ENV/mobile

# Install dependencies
flutter pub get

# Run on device or emulator
flutter run

# Build for production
flutter build apk        # Android
flutter build ios        # iOS
```

## Architecture

The app uses:
- **Flutter**: UI Framework
- **Provider**: State Management
- **HTTP**: API Communication
- **WebSocket**: Real-time Updates
- **SQLite**: Local Caching
- **Firebase Cloud Messaging**: Push Notifications

## File Structure

```
mobile/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── models/
│   │   ├── user.dart            # User data model
│   │   ├── game.dart            # Game session model
│   │   ├── bot.dart             # Bot model
│   │   └── trade.dart           # Trade model
│   ├── screens/
│   │   ├── login_screen.dart    # Login/Registration
│   │   ├── home_screen.dart     # Main dashboard
│   │   ├── trading_screen.dart  # Live trading
│   │   ├── bot_screen.dart      # Bot management
│   │   ├── profile_screen.dart  # User profile
│   │   └── backtest_screen.dart # Backtesting
│   ├── providers/
│   │   ├── auth_provider.dart   # Authentication state
│   │   ├── game_provider.dart   # Game state
│   │   ├── market_provider.dart # Market data
│   │   └── bot_provider.dart    # Bot state
│   ├── services/
│   │   ├── api_service.dart     # API calls
│   │   ├── websocket_service.dart # Real-time data
│   │   ├── notification_service.dart # Notifications
│   │   └── storage_service.dart # Local storage
│   └── widgets/
│       ├── stock_card.dart      # Stock display
│       ├── portfolio_widget.dart # Portfolio view
│       └── trade_button.dart    # Trade UI
├── pubspec.yaml                 # Dependencies
└── README.md                    # Documentation
```

## Core Features

### 1. Authentication
```dart
// Login
final authProvider = Provider.of<AuthProvider>(context, listen: false);
await authProvider.login(email, password);

// Registration
await authProvider.register(email, password, username);

// Logout
await authProvider.logout();
```

### 2. Live Trading
```dart
// Place order
await gameProvider.placeTrade(
  symbol: 'AAPL',
  action: 'buy',
  quantity: 10
);
```

### 3. Bot Management
```dart
// Connect bot
await botProvider.connectBot(botName, apiKey);

// View performance
final stats = await botProvider.getBotStats(botId);
```

### 4. Real-time Updates
```dart
// Subscribe to price updates
websocketService.subscribeToPrice('AAPL', (price) {
  setState(() => _currentPrice = price);
});
```

### 5. Notifications
```dart
// Setup notifications
await notificationService.initialize();

// Handle notification tap
notificationService.onNotificationTap.listen((notification) {
  // Navigate to relevant screen
});
```

## Configuration

### Environment Variables
Create `lib/config/environment.dart`:

```dart
class Environment {
  static const String apiBaseUrl = 'http://localhost:8000';
  static const String websocketUrl = 'ws://localhost:8000';
  static const String firebaseProjectId = 'your-project-id';
}
```

### Firebase Setup
1. Create Firebase project: https://console.firebase.google.com
2. Add Android & iOS apps
3. Download configuration files:
   - `google-services.json` → `android/app/`
   - `GoogleService-Info.plist` → `ios/Runner/`

## Key Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  provider: ^6.0.0
  
  # HTTP & WebSocket
  http: ^1.1.0
  web_socket_channel: ^2.4.0
  
  # UI
  flutter_screenutil: ^5.9.0
  shimmer: ^3.0.0
  
  # Local Storage
  sqflite: ^2.2.0
  
  # Push Notifications
  firebase_messaging: ^14.6.0
  
  # Authentication
  shared_preferences: ^2.1.0
  jwt_decoder: ^2.0.1
  
  # Charts
  fl_chart: ^0.65.0
  
  # Date/Time
  intl: ^0.18.1
```

## API Integration

### Authentication APIs
```dart
// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}
```

### Game APIs
```dart
// Get game session
GET /api/games/:gameId

// Place trade
POST /api/games/:gameId/trades
{
  "symbol": "AAPL",
  "action": "buy",
  "quantity": 10
}

// Get portfolio
GET /api/games/:gameId/portfolio
```

### Bot APIs
```dart
// List bots
GET /api/bots

// Get bot stats
GET /api/bots/:botId/stats

// Connect bot
POST /api/bots/connect
{
  "name": "My Bot",
  "apiKey": "key123"
}
```

## Testing

```bash
# Run tests
flutter test

# Generate coverage
flutter test --coverage

# Test specific file
flutter test test/lib/models/user_test.dart
```

## Publishing

### Android
```bash
# Create signed APK
flutter build apk --release

# Create AAB for Play Store
flutter build appbundle --release
```

### iOS
```bash
# Create iOS build
flutter build ios --release

# Create IPA for App Store
flutter build ipa --release
```

## Performance Tips

1. **Use const constructors** where possible
2. **Implement virtual scrolling** for long lists
3. **Cache API responses** with SQLite
4. **Use lazy loading** for images
5. **Implement pagination** for trades/history

## Troubleshooting

### Build Issues
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run
```

### WebSocket Connection Issues
- Verify API server is running
- Check firewall settings
- Ensure WebSocket URL is correct

### Notification Issues
- Verify Firebase setup
- Check device permissions
- Enable notifications in app settings

## Next Steps

1. **Setup development environment** - Install Flutter SDK
2. **Clone mobile folder** to your machine
3. **Configure Firebase** credentials
4. **Run on simulator** - `flutter run`
5. **Build debug APK** - `flutter build apk --debug`
6. **Deploy to stores** - Follow publishing guides

## Resources

- [Flutter Docs](https://flutter.dev/docs)
- [Dart Language](https://dart.dev)
- [Firebase Flutter](https://firebase.flutter.dev)
- [Provider Package](https://pub.dev/packages/provider)

## Support

For issues:
1. Check Flutter logs: `flutter logs`
2. Review API health: `curl http://localhost:8000/health`
3. Check network connection
4. Clear app data and rebuild

---

**Happy Mobile Trading! 📱📈**
