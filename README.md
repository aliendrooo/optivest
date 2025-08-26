# 📈 Optivest

<div align="center">
  
  **Smart Cryptocurrency Trading Assistant**
  
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![GitHub stars](https://img.shields.io/github/stars/alihanD/optivest.svg)](https://github.com/alihanD/optivest/stargazers)
  [![Trading Bot](https://img.shields.io/badge/Trading-Bot-orange.svg)](https://github.com/alihanD/optivest)
  
</div>

A sophisticated cryptocurrency trading bot with multiple technical analysis strategies, real-time data processing, and comprehensive risk management.

**Paper Trading Agent** - Real prices with virtual money for safe testing!

---

[🇹🇷 Türkçe](#turkish) | [🇺🇸 English](#english)

---

## English

### ✨ Features

- **Multiple Trading Strategies**: Pine Script Follow Line, Bollinger Bands, RSI, MACD
- **Real-time Data**: WebSocket connections to Binance for live price feeds
- **Paper Trading**: Virtual trading with real market data
- **Recall Network Integration**: Connect to Recall competition platform
- **Risk Management**: Automatic Stop Loss and Take Profit
- **Multi-coin Support**: Trade 10+ cryptocurrencies simultaneously
- **Web Dashboard**: Modern responsive interface
- **API Endpoints**: RESTful API for external integrations

### 🛠️ Quick Start

#### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

#### Installation

1. **Clone the repository**
```bash
git clone https://github.com/alihanD/optivest.git
cd optivest
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
# Server Settings
PORT=3000
NODE_ENV=development

# Binance API (Optional - works without for paper trading)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key
```

4. **Start the application**
```bash
npm start
```

The application will be available at `http://localhost:3000`

### 🌐 Available Pages

- **Main Dashboard**: `http://localhost:3000`
- **Paper Trading**: `http://localhost:3000/paper-trading`
- **Live Dashboard**: `http://localhost:3000/dashboard`
- **Trade History**: `http://localhost:3000/trade-history`
- **System Status**: `http://localhost:3000/system-status`

### 🔧 Troubleshooting

#### Common Startup Issues

**Issue 1: PowerShell && Operator Error**
```
The token '&&' is not a valid statement separator in this version.
```
**Solution:** Use individual commands:
```powershell
cd optivest
npm start
```

**Issue 2: Port Already in Use**
```
EADDRINUSE: Port 3000 already in use
```
**Solution:** The app automatically tries ports 3001-3010, or change PORT in `.env`

**Issue 3: Missing Dependencies**
```
Module not found
```
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue 4: WebSocket Connection Issues**
- Check your internet connection
- Firewall may be blocking WebSocket connections
- Try restarting the application

**Issue 5: No Trading Signals**
- This is normal during stable market conditions
- The bot uses conservative parameters for safety
- Check console logs for technical analysis details

### 📊 API Documentation

#### Health Check
```http
GET /health
```

#### Paper Trading Status
```http
GET /api/paper-trading/status
```

#### Start/Stop Trading
```http
POST /api/paper-trading/start
POST /api/paper-trading/stop
```

#### Trade History
```http
GET /api/paper-trading/trades
```

### ⚙️ Configuration

The trading engine uses conservative parameters by default:
- **Position Size**: 15% for BTC, 12% for other coins
- **Stop Loss**: 2-3%
- **Take Profit**: 5-6%
- **Confidence Threshold**: 25%+
- **Trade Interval**: 20 seconds minimum

### 🚨 Disclaimer

This is educational software for learning purposes:
- Start with paper trading to understand the system
- Never invest more than you can afford to lose
- Cryptocurrency trading carries high risk
- Past performance doesn't guarantee future results

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Turkish

### ✨ Özellikler

- **Çoklu Trading Stratejileri**: Pine Script Follow Line, Bollinger Bands, RSI, MACD
- **Gerçek Zamanlı Veri**: Binance WebSocket bağlantıları ile canlı fiyat akışı
- **Sanal Trading**: Gerçek piyasa verileri ile sanal trading
- **Risk Yönetimi**: Otomatik Stop Loss ve Take Profit
- **Çoklu Coin Desteği**: 10+ kripto para birimi ile eş zamanlı işlem
- **Web Panosu**: Modern responsive arayüz
- **API Uç Noktaları**: Harici entegrasyonlar için RESTful API

### 🛠️ Hızlı Başlangıç

#### Gereksinimler
- Node.js 18 veya üzeri
- npm veya yarn paket yöneticisi

#### Kurulum

1. **Depoyu klonlayın**
```bash
git clone https://github.com/alihanD/optivest.git
cd optivest
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Ortam değişkenlerini ayarlayın**
```bash
cp env.example .env
```

`.env` dosyasını yapılandırmanızla düzenleyin:
```env
# Sunucu Ayarları
PORT=3000
NODE_ENV=development

# Binance API (İsteğe bağlı - sanal trading için gerekli değil)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key
```

4. **Uygulamayı başlatın**
```bash
npm start
```

Uygulama `http://localhost:3000` adresinde erişilebilir olacaktır.

### 🌐 Mevcut Sayfalar

- **Ana Panel**: `http://localhost:3000`
- **Sanal Trading**: `http://localhost:3000/paper-trading`
- **Canlı Panel**: `http://localhost:3000/dashboard`
- **İşlem Geçmişi**: `http://localhost:3000/trade-history`
- **Sistem Durumu**: `http://localhost:3000/system-status`

### 🔧 Sorun Giderme

#### Yaygın Başlatma Sorunları

**Sorun 1: PowerShell && Operatörü Hatası**
```
The token '&&' is not a valid statement separator in this version.
```
**Çözüm:** Komutları ayrı ayrı kullanın:
```powershell
cd optivest
npm start
```

**Sorun 2: Port Zaten Kullanımda**
```
EADDRINUSE: Port 3000 already in use
```
**Çözüm:** Uygulama otomatik olarak 3001-3010 portlarını dener, veya `.env` dosyasında PORT değiştirin

**Sorun 3: Eksik Bağımlılıklar**
```
Module not found
```
**Çözüm:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Sorun 4: WebSocket Bağlantı Sorunları**
- İnternet bağlantınızı kontrol edin
- Firewall WebSocket bağlantılarını engelliyor olabilir
- Uygulamayı yeniden başlatmayı deneyin

**Sorun 5: Trading Sinyali Üretilmiyor**
- Bu, istikrarlı piyasa koşullarında normaldir
- Bot güvenlik için muhafazakar parametreler kullanır
- Teknik analiz detayları için konsol loglarını kontrol edin

### 📊 API Dokümantasyonu

#### Sistem Durumu
```http
GET /health
```

#### Sanal Trading Durumu
```http
GET /api/paper-trading/status
```

#### Trading Başlat/Durdur
```http
POST /api/paper-trading/start
POST /api/paper-trading/stop
```

#### İşlem Geçmişi
```http
GET /api/paper-trading/trades
```

### ⚙️ Yapılandırma

Trading motoru varsayılan olarak muhafazakar parametreler kullanır:
- **Pozisyon Boyutu**: BTC için %15, diğer coinler için %12
- **Stop Loss**: %2-3
- **Take Profit**: %5-6
- **Güven Eşiği**: %25+
- **İşlem Aralığı**: Minimum 20 saniye

### 🚨 Sorumluluk Reddi

Bu, öğrenme amaçlı eğitim yazılımıdır:
- Sistemi anlamak için sanal trading ile başlayın
- Kaybetmeyi göze alamayacağınızdan fazlasını yatırım yapmayın
- Kripto para ticareti yüksek risk taşır
- Geçmiş performans gelecekteki sonuçları garanti etmez

### 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**
