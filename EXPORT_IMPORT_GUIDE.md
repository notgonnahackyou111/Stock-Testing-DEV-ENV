# Export/Import Game Save Guide

## 🚀 Quick Start

### For Players
1. **Play your game** - Build your portfolio, make trades, accumulate returns
2. **Click Export (💾)** - Get a unique save code like `ABC123XYZ`
3. **Copy the code** - Keep it safe (text file, notes, email, etc.)
4. **Leave anytime** - Your session data is uploaded to the server
5. **Come back later** - Click Import (📥), enter your code
6. **Resume instantly** - Your entire game state is restored exactly as you left it

---

## 🎮 Gameplay Features

### What Gets Saved?
✅ All your stock holdings and quantities  
✅ Complete trade history  
✅ Current cash balance  
✅ Portfolio P&L and percentages  
✅ Game configuration (capital, risk level, difficulty)  
✅ Date and time (simulated days played)  
✅ All game statistics  

### What Doesn't Get Saved?
❌ UI preferences (won't save your scroll position, etc.)  
❌ Market data beyond current state  
❌ Browser history  

---

## 💾 Export Save Codes

### How to Export
1. During any game, click the **💾 Export** button (top-right)
2. A modal appears with your **9-character save code**
3. Click **Copy Code** to copy to clipboard
4. Share it, email it, write it down!

**Example Code**: `PAUNFG502`

### Save Code Format
- 9 characters (A-Z, 0-9)
- Unique and permanent
- Can have multiple presets per code
- Valid forever (until you delete manually)

### Multiple Presets
Each save code can have **multiple presets**:
- **default** - Auto-created when you first export
- **milestone1** - Optional save before risky trades
- **backup** - Safety copy before big decisions

**Example**:
```
Code: ABC123XYZ
├── default (May 25, 10AM)
├── milestone1 (May 25, 3PM) 
└── backup (May 26, 9AM)
```

To save to a different preset, the system automatically creates it on export.

---

## 📥 Import Game Saves

### How to Import
1. Go to **home page** (or click home button in game)
2. Click the **📥 Import** button
3. Enter your **save code** (e.g., `ABC123XYZ`)
4. System fetches your presets
5. Select which preset to load
6. Click **Load** - game is restored!

### After Importing
- Your portfolio is exactly restored
- Stock prices are from when you saved
- All trades are visible in history
- Resume playing from where you left off

**Can I lose my save?**
- No! Save data is stored on our servers
- Deleting from browser doesn't affect it
- Your code is your access key

---

## 🔌 API Integration (Developers)

### Create Save Code
```bash
curl -X POST http://localhost:8000/api/saves/create
```

Response:
```json
{
  "success": true,
  "code": "ABC123XYZ",
  "storage": "Firebase"
}
```

### Save Game State
```bash
curl -X POST http://localhost:8000/api/saves/ABC123XYZ \
  -H "Content-Type: application/json" \
  -d '{
    "gameState": {
      "config": {
        "startingCapital": 50000,
        "riskLevel": 1.0
      },
      "simulator": {
        "portfolio": {"cash": 25000},
        "stocks": {
          "AAPL": {
            "quantity": 10,
            "avgPrice": 150
          }
        },
        "trades": [
          {
            "symbol": "AAPL",
            "action": "buy",
            "quantity": 10,
            "price": 150,
            "timestamp": "2026-02-25T12:00:00Z"
          }
        ]
      }
    },
    "presetName": "default"
  }'
```

### Load Game State
```bash
curl http://localhost:8000/api/saves/ABC123XYZ/preset/default
```

Response:
```json
{
  "code": "ABC123XYZ",
  "presetName": "default",
  "gameState": {
    "config": {...},
    "simulator": {...}
  },
  "createdAt": "2026-02-25T12:00:00.000Z",
  "updatedAt": "2026-02-25T15:30:00.000Z"
}
```

### List All Presets
```bash
curl http://localhost:8000/api/saves/ABC123XYZ
```

Response:
```json
{
  "code": "ABC123XYZ",
  "createdAt": "2026-02-25T12:00:00.000Z",
  "lastUpdatedAt": "2026-02-25T15:30:00.000Z",
  "activePreset": "default",
  "presets": [
    {
      "name": "default",
      "createdAt": "2026-02-25T12:00:00.000Z"
    },
    {
      "name": "milestone1",
      "createdAt": "2026-02-25T14:20:00.000Z"
    }
  ]
}
```

### Delete Preset
```bash
curl -X DELETE http://localhost:8000/api/saves/ABC123XYZ/preset/default
```

---

## 🔒 Data & Privacy

### Is My Save Code Secure?
- **Code-based access** (not user accounts yet)
- Anyone with your code can load your game
- Treat like a password (don't share publicly)
- No personal data required

### Where Is Data Stored?
- **Firebase Firestore** (Google's cloud database)
- Encrypted at rest
- Daily automatic backups
- Same service used by millions of apps

### Data Deletion
- Export/delete your presets manually via API
- Server automatically cleanup old saves (future feature)
- Request complete deletion: email support

---

## 🎯 Use Cases

### Competitive Gaming
```
Friend 1 saves after great day: ABC123XYZ
Friend 2 loads and tries to beat it
Both compare final scores!
```

### Milestone Saving
```
Game #1: ABC123XYZ preset "day1"
Game #2: ABC123XYZ preset "day2"  
Game #3: ABC123XYZ preset "day3"
Track progress over time!
```

### Strategy Testing
```
Save baseline: ABC123XYZ preset "baseline"
Make risky trades
If bad, reload baseline and try different strategy
No real consequences!
```

### Teaching/Sharing
```
Expert saves their strategy: XYZ789ABC
Students load and see expert's trades
Learn by reverse-engineering success
```

---

## 🐛 Troubleshooting

### "Code not found"
**Problem**: Entered wrong code  
**Solution**: Double-check code spelling (case-insensitive, but A-Z 0-9 only)  
**Example**: `ABC123XYZ` not `ABC-123-XYZ`

### "Preset not found"
**Problem**: Preset was deleted or typo  
**Solution**: Check available presets via API or home page

### "Failed to save"
**Problem**: Server or network error  
**Solution**:
1. Check internet connection
2. Try refresh page
3. Try again in a few minutes
4. Check `/health` endpoint

### "Save data looks corrupted"
**Problem**: Text was modified accidentally  
**Solution**: Try a different preset or export fresh copy

### "Lost my save code"
**Problem**: Deleted the code by accident  
**Solution**: 
- Code is permanent on server
- Try to remember it (write it down if you find it)
- If lost forever, you'll need to re-export fresh game

**Prevention**: 
- Screenshot your code
- Email code to yourself
- Save to password manager
- Write in physical notebook

---

## 📱 Mobile & Cross-Device

### Same Device, Different Browser?
Yes! Your code works anywhere:
- Export on Chrome
- Import on Firefox
- Same game restored!

### Phone to Computer?
Yes! Export on phone, import on desktop, continues perfectly.

### Different Devices?
Yes! Export code is device-independent:
1. Save on laptop
2. Open on phone
3. Resume on tablet
4. Everyone sees same game!

---

## 🚀 Pro Tips

### Backup Your Code
```
- Screenshot it
- Email yourself
- Save to Notes app
- Write in document
- Save to password manager
```

### Share Friendly Competition
```
1. Expert saves and shares code: EXPERT01
2. Friends import and try to beat score
3. Compare final portfolios!
```

### Document Your Strategy
```
Code: MYSTRAT1
Trades: Buy value stocks, hold 50%+ bonds
Result: +23.5% return
```

### Progressive Challenges
```
Challenge 1: Code ABC123
Challenge 2: Code ABC124
Challenge 3: Code ABC125
Difficulty increases each level
```

---

## 📞 Support

Having issues? 

**Check health**:
```bash
curl http://localhost:8000/health
# Look for "firebaseStatus": "Connected"
```

**Check server logs**:
```bash
npm start  # Run directly to see logs
# Look for [Firebase] messages
```

**Common solutions**:
1. Refresh the page
2. Clear browser cache
3. Try incognito/private window
4. Check console errors (F12 > Console)
5. Verify internet connection
6. Try again in 30 seconds

---

**Happy Trading! 📈**

For more info see [FIREBASE_SETUP.md](FIREBASE_SETUP.md) or README.md
