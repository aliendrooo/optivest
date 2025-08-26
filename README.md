# 📈 Optivest

<div align="center">
  
  **🏆 Recall Network Competition Trading Agent**
  
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![GitHub stars](https://img.shields.io/github/stars/alihanD/optivest.svg)](https://github.com/alihanD/optivest/stargazers)
  [![Trading Bot](https://img.shields.io/badge/Trading-Bot-orange.svg)](https://github.com/alihanD/optivest)
  [![Production Ready](https://img.shields.io/badge/Production-Ready-success.svg)](https://github.com/alihanD/optivest)
  
</div>

**🚀 Production Ready** - Advanced cryptocurrency trading bot specifically designed for Recall Network competitions with automatic trading capabilities.

**🎯 Competition Focused** - Optimized for Recall Network trading competitions with real-time market analysis and automated execution.

---

[🇹🇷 Türkçe](#turkish) | [🇺🇸 English](#english)

---

## English

### ✨ Features

- **🏆 Recall Network Integration**: Full integration with Recall Network competition platform
- **🤖 Automatic Trading**: Automated trading activated during competition periods
- **📊 Real-time Competition Monitoring**: Live leaderboard and portfolio tracking
- **🎯 Competition-Focused Strategy**: Optimized for Recall Network trading competitions
- **📈 Multiple Trading Strategies**: Pine Script Follow Line, Bollinger Bands, RSI, MACD
- **⚡ Real-time Data**: WebSocket connections for live price feeds
- **🛡️ Risk Management**: Automatic Stop Loss and Take Profit
- **🪙 Multi-coin Support**: Trade 10+ cryptocurrencies simultaneously
- **🌐 Web Dashboard**: Modern responsive interface
- **🔌 API Endpoints**: RESTful API for external integrations

### 🏆 Competition Features

#### Recall Network Integration
- **Automatic Competition Detection**: Monitors competition start/end times
- **Real-time Portfolio Tracking**: Live balance and position monitoring
- **Leaderboard Integration**: Track your ranking in real-time
- **Competition API**: Full access to Recall Network competition APIs

#### Automated Trading System
- **Competition Mode**: Automatically activates during competition periods
- **Smart Signal Processing**: Advanced technical analysis for optimal entry/exit points
- **Risk-Adjusted Position Sizing**: Dynamic position sizing based on market conditions
- **Real-time Execution**: Instant order execution with minimal latency

### 🛠️ Quick Start

#### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Recall Network API Key (for competition features)

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

# Recall Network API (Required for competition features)
RECALL_API_KEY=your_recall_api_key
RECALL_ENVIRONMENT=production  # or sandbox for testing
```

4. **Start the application**
```bash
npm start
```

The application will be available at `http://localhost:3000`

### 🎯 Competition Setup

#### For Recall Network Competitions

1. **Get Your API Key**: Obtain your Recall Network API key from the competition platform
2. **Configure Environment**: Set `RECALL_ENVIRONMENT=production` in your `.env` file
3. **Start the Agent**: Run `npm start` - the agent will automatically:
   - Connect to Recall Network
   - Monitor competition status
   - Activate trading when competition starts
   - Track your portfolio and ranking

#### Competition Workflow

```
🔄 Agent Startup
├── 📡 Connect to Recall Network
├── 🏆 Check Competition Status
├── ⏳ Wait for Competition Start
├── 🚀 Automatic Trading Activation
├── 📊 Real-time Portfolio Monitoring
└── 🏅 Leaderboard Tracking
```

### 🌐 Available Pages

- **Main Dashboard**: `http://localhost:3000`
- **Competition Status**: `http://localhost:3000/dashboard`
- **Portfolio Overview**: `http://localhost:3000/portfolio`
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

**Issue 4: Recall Network Connection Issues**
```
getaddrinfo ENOTFOUND api.recall.network
```
**Solutions:**
- Check your internet connection
- Verify your Recall API key is correct
- Ensure `RECALL_ENVIRONMENT` is set correctly
- Try switching between `production` and `sandbox` environments

**Issue 5: Competition Not Starting**
- Verify competition dates and times
- Check Recall Network platform for competition status
- Ensure API key has proper permissions
- Monitor console logs for detailed error messages

### 📊 API Documentation

#### Health Check
```http
GET /health
```

#### Competition Status
```http
GET /api/competition/status
```

#### Portfolio Information
```http
GET /api/portfolio
```

#### Leaderboard
```http
GET /api/leaderboard
```

#### Trading Status
```http
GET /api/trading/status
POST /api/trading/start
POST /api/trading/stop
```

### ⚙️ Configuration

#### Competition Settings
- **Auto-Start Trading**: Enabled during competition periods
- **Position Size**: 15% for BTC, 12% for other coins
- **Stop Loss**: 2-3%
- **Take Profit**: 5-6%
- **Confidence Threshold**: 25%+
- **Trade Interval**: 20 seconds minimum

#### Environment Variables
```env
# Competition Settings
RECALL_API_KEY=your_api_key
RECALL_ENVIRONMENT=production  # or sandbox

# Trading Parameters
TRADING_ENABLED=true
AUTO_TRADING=true
RISK_LEVEL=medium
```

### 🚨 Disclaimer

This is competition-focused trading software:
- Designed specifically for Recall Network competitions
- Includes automated trading features
- Cryptocurrency trading carries high risk
- Past performance doesn't guarantee future results
- Only use with funds you can afford to lose

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Turkish

### ✨ Özellikler

- **🏆 Recall Network Entegrasyonu**: Recall Network yarışma platformu ile tam entegrasyon
- **🤖 Otomatik Trading**: Yarışma dönemlerinde otomatik trading aktivasyonu
- **📊 Gerçek Zamanlı Yarışma İzleme**: Canlı liderlik tablosu ve portföy takibi
- **🎯 Yarışma Odaklı Strateji**: Recall Network trading yarışmaları için optimize edilmiş
- **📈 Çoklu Trading Stratejileri**: Pine Script Follow Line, Bollinger Bands, RSI, MACD
- **⚡ Gerçek Zamanlı Veri**: Canlı fiyat akışı için WebSocket bağlantıları
- **🛡️ Risk Yönetimi**: Otomatik Stop Loss ve Take Profit
- **🪙 Çoklu Coin Desteği**: 10+ kripto para birimi ile eş zamanlı işlem
- **🌐 Web Panosu**: Modern responsive arayüz
- **🔌 API Uç Noktaları**: Harici entegrasyonlar için RESTful API

### 🏆 Yarışma Özellikleri

#### Recall Network Entegrasyonu
- **Otomatik Yarışma Tespiti**: Yarışma başlangıç/bitiş zamanlarını izler
- **Gerçek Zamanlı Portföy Takibi**: Canlı bakiye ve pozisyon izleme
- **Liderlik Tablosu Entegrasyonu**: Sıralamanızı gerçek zamanlı takip edin
- **Yarışma API**: Recall Network yarışma API'lerine tam erişim

#### Otomatik Trading Sistemi
- **Yarışma Modu**: Yarışma dönemlerinde otomatik olarak aktifleşir
- **Akıllı Sinyal İşleme**: Optimal giriş/çıkış noktaları için gelişmiş teknik analiz
- **Risk-Ayarlı Pozisyon Boyutlandırma**: Piyasa koşullarına göre dinamik pozisyon boyutlandırma
- **Gerçek Zamanlı Yürütme**: Minimal gecikme ile anında emir yürütme

### 🛠️ Hızlı Başlangıç

#### Gereksinimler
- Node.js 18 veya üzeri
- npm veya yarn paket yöneticisi
- Recall Network API Key (yarışma özellikleri için)

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

# Recall Network API (Yarışma özellikleri için gerekli)
RECALL_API_KEY=your_recall_api_key
RECALL_ENVIRONMENT=production  # veya test için sandbox
```

4. **Uygulamayı başlatın**
```bash
npm start
```

Uygulama `http://localhost:3000` adresinde erişilebilir olacaktır.

### 🎯 Yarışma Kurulumu

#### Recall Network Yarışmaları İçin

1. **API Key Alın**: Yarışma platformundan Recall Network API key'inizi alın
2. **Ortamı Yapılandırın**: `.env` dosyasında `RECALL_ENVIRONMENT=production` ayarlayın
3. **Agent'ı Başlatın**: `npm start` çalıştırın - agent otomatik olarak:
   - Recall Network'e bağlanacak
   - Yarışma durumunu izleyecek
   - Yarışma başladığında trading'i aktifleştirecek
   - Portföyünüzü ve sıralamanızı takip edecek

#### Yarışma İş Akışı

```
🔄 Agent Başlatma
├── 📡 Recall Network'e Bağlanma
├── 🏆 Yarışma Durumu Kontrolü
├── ⏳ Yarışma Başlangıcını Bekleme
├── 🚀 Otomatik Trading Aktivasyonu
├── 📊 Gerçek Zamanlı Portföy İzleme
└── 🏅 Liderlik Tablosu Takibi
```

### 🌐 Mevcut Sayfalar

- **Ana Panel**: `http://localhost:3000`
- **Yarışma Durumu**: `http://localhost:3000/dashboard`
- **Portföy Genel Bakış**: `http://localhost:3000/portfolio`
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

**Sorun 4: Recall Network Bağlantı Sorunları**
```
getaddrinfo ENOTFOUND api.recall.network
```
**Çözümler:**
- İnternet bağlantınızı kontrol edin
- Recall API key'inizin doğru olduğunu doğrulayın
- `RECALL_ENVIRONMENT`'ın doğru ayarlandığından emin olun
- `production` ve `sandbox` ortamları arasında geçiş yapmayı deneyin

**Sorun 5: Yarışma Başlamıyor**
- Yarışma tarihlerini ve saatlerini doğrulayın
- Yarışma durumu için Recall Network platformunu kontrol edin
- API key'in uygun izinlere sahip olduğundan emin olun
- Detaylı hata mesajları için konsol loglarını izleyin

### 📊 API Dokümantasyonu

#### Sistem Durumu
```http
GET /health
```

#### Yarışma Durumu
```http
GET /api/competition/status
```

#### Portföy Bilgileri
```http
GET /api/portfolio
```

#### Liderlik Tablosu
```http
GET /api/leaderboard
```

#### Trading Durumu
```http
GET /api/trading/status
POST /api/trading/start
POST /api/trading/stop
```

### ⚙️ Yapılandırma

#### Yarışma Ayarları
- **Otomatik Trading Başlatma**: Yarışma dönemlerinde etkinleştirilir
- **Pozisyon Boyutu**: BTC için %15, diğer coinler için %12
- **Stop Loss**: %2-3
- **Take Profit**: %5-6
- **Güven Eşiği**: %25+
- **İşlem Aralığı**: Minimum 20 saniye

#### Ortam Değişkenleri
```env
# Yarışma Ayarları
RECALL_API_KEY=your_api_key
RECALL_ENVIRONMENT=production  # veya sandbox

# Trading Parametreleri
TRADING_ENABLED=true
AUTO_TRADING=true
RISK_LEVEL=medium
```

### 🚨 Sorumluluk Reddi

Bu, yarışma odaklı trading yazılımıdır:
- Recall Network yarışmaları için özel olarak tasarlanmıştır
- Otomatik trading özellikleri içerir
- Kripto para ticareti yüksek risk taşır
- Geçmiş performans gelecekteki sonuçları garanti etmez
- Sadece kaybetmeyi göze alabileceğiniz fonlarla kullanın

### 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**

🏆 **Recall Network yarışmalarında başarılar dileriz!**
