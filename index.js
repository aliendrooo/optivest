const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Environment file check
if (!fs.existsSync('.env')) {
    console.log('⚠️ .env file not found! Copy env.example to .env.');
    console.log('📝 Command: cp env.example .env');
    console.log('🔑 Then add your real API keys to the .env file.');
}

require('dotenv').config();

// 🏆 Environment variables check - COMPETITION MODE
console.log('🏆 COMPETITION Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   BINANCE_API_KEY: ${process.env.BINANCE_API_KEY ? '✅ Loaded' : '❌ Missing (Not required for virtual trading)'}`);
console.log(`   BINANCE_SECRET_KEY: ${process.env.BINANCE_SECRET_KEY ? '✅ Loaded' : '❌ Missing (Not required for virtual trading)'}`);
console.log(`   RECALL_API_KEY: ${process.env.RECALL_API_KEY ? '🏆 COMPETITION READY' : '❌ Missing (Required for Recall Network Competition)'}`);
console.log(`   RECALL_ENVIRONMENT: ${process.env.RECALL_ENVIRONMENT || 'production'} 🎯`);
console.log(`   PORT: ${process.env.PORT || '3000'}`);
console.log('🏆 COMPETITION MODE: Production endpoints + Real trading');
console.log('⏰ Competition starts in 30 minutes!');

const apiRoutes = require('./src/routes/api');

// 🏆 Recall Trading Client'i yükle - COMPETITION MODE
let recallTradingClient = null;
try {
    const RecallTradingClient = require('./src/services/recallTradingClient');
    const recallApiKey = process.env.RECALL_API_KEY;
    const recallEnvironment = process.env.RECALL_ENVIRONMENT || 'production';

    if (recallApiKey && recallApiKey !== 'your_recall_api_key_here') {
        recallTradingClient = new RecallTradingClient(recallApiKey, recallEnvironment);
        global.recallTradingClient = recallTradingClient; // Global erişim için
        console.log('🏆 Recall Trading Client yüklendi - COMPETITION MODE');
        console.log('🎯 Production endpoints aktif');
        console.log('⏰ Competition başlangıcına hazır!');
        
        // Bağlantı testi
        recallTradingClient.testConnection().then((result) => {
            if (result.success) {
                console.log('🚀 Recall Network bağlantısı başarılı!');
                console.log('🏆 Competition API hazır!');
            } else {
                console.log('⚠️ Recall Network bağlantı hatası:', result.error);
            }
        }).catch(error => {
            console.error('❌ Recall Network bağlantı testi hatası:', error.message);
        });
    } else {
        console.log('⚠️ Recall API key bulunamadı - Recall Network özellikleri devre dışı');
        global.recallTradingClient = null;
    }
} catch (error) {
    console.error('❌ Recall Trading Client yüklenirken hata:', error.message);
    global.recallTradingClient = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.binance.com", "https://api.coingecko.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    }
}));
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 1000, // IP başına maksimum 1000 istek (artırıldı)
    message: {
        error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
    }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// İşlem Geçmişi sayfası
app.get('/trade-history', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trade-history.html'));
});

// Live Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Sistem Durumu sayfası
app.get('/system-status', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'system-status.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint bulunamadı'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global hata:', error);
    
    res.status(error.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 
            'Sunucu hatası' : error.message
    });
});

// Port kontrolü ve server başlatma
function startServer(port) {
    // Port numarasının geçerli aralıkta olduğunu kontrol et
    if (port > 65535) {
        console.error('❌ Geçersiz port numarası. Maksimum port: 65535');
        process.exit(1);
    }
    
    const server = app.listen(port, () => {
        console.log(`🚀 Optivest - Smart Trading Assistant başlatıldı!`);
        console.log(`📍 Port: ${port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(`📊 API: http://localhost:${port}/api`);
        console.log(`🏠 Web: http://localhost:${port}`);
        console.log('='.repeat(50));
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} kullanımda, ${port + 1} deneniyor...`);
            // Port aralığını kontrol et
            if (port >= 3010) {
                console.error('❌ Uygun port bulunamadı (3000-3010 aralığı dolu)');
                process.exit(1);
            }
            startServer(port + 1);
        } else {
            console.error('Server başlatma hatası:', error);
        }
    });

    return server;
}

// Server'ı başlat
const server = startServer(PORT);

// Otomatik trading - Sadece Recall Network yarışmasında aktif olacak
console.log('🎯 OTOMATİK TRADING - Sadece Recall Network yarışmasında aktif olacak');
console.log('⏳ YARIŞMA BAŞLANGICINI BEKLİYOR...');

// Recall Network yarışma durumu kontrolü
setInterval(async () => {
    try {
        const recallClient = global.recallTradingClient;
        if (!recallClient) {
            console.log('⚠️ Recall Network bağlantısı yok - Trading bekleniyor');
            return;
        }
        const competitionStatus = await recallClient.getCompetitionStatus();
        if (competitionStatus.isActive) {
            console.log('🏆 YARIŞMA AKTİF - Otomatik trading başlatılıyor...');
            await recallClient.runTradingStrategy();
        } else {
            console.log('⏳ YARIŞMA HENÜZ BAŞLAMADI - Bekleniyor...');
        }
    } catch (error) {
        console.error('Recall Network trading kontrolü hatası:', error.message);
    }
}, 30 * 1000); // 30 saniyede bir kontrol et

module.exports = app; 
