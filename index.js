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

// Environment variables check
console.log('🔧 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   BINANCE_API_KEY: ${process.env.BINANCE_API_KEY ? '✅ Loaded' : '❌ Missing (Not required for virtual trading)'}`);
console.log(`   BINANCE_SECRET_KEY: ${process.env.BINANCE_SECRET_KEY ? '✅ Loaded' : '❌ Missing (Not required for virtual trading)'}`);
console.log(`   PORT: ${process.env.PORT || '3000'}`);
console.log('🎮 Virtual Trading Mode: Real prices + Virtual money');

const apiRoutes = require('./src/routes/api');
const paperTradingRoutes = require('./src/routes/paperTrading');

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
app.use('/api/paper-trading', paperTradingRoutes);

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sanal trading sayfası
app.get('/paper-trading', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'paper-trading.html'));
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

// Otomatik trading başlatma
const paperTrading = require('./src/services/paperTrading');

// Her 15 saniyede bir trading stratejisi çalıştır - Dengeli agresif
setInterval(async () => {
    try {
        if (paperTrading.isTradingRunning()) {
            console.log('🎯 DENGELİ AGRESIF sanal trading kontrolü başlatılıyor...');
            await paperTrading.runPaperTradingStrategy();
        } else {
            console.log('⚠️ Trading durmuş durumda, otomatik olarak başlatılıyor...');
            paperTrading.startTrading();
        }
    } catch (error) {
        console.error('Otomatik trading hatası:', error.message);
    }
}, 15 * 1000); // 15 saniye - Dengeli agresif

// İlk trading'i hemen başlat
setTimeout(async () => {
    try {
        console.log('🚀 HEMEN ULTRA AGRESİF trading başlatılıyor...');
        // Trading'i aktif hale getir
        paperTrading.startTrading(); // startTrading() metodunu kullan
        console.log('✅ Trading aktifleştirildi!');
        await paperTrading.runPaperTradingStrategy();
        console.log('✅ Initial trading strategy executed!');
    } catch (error) {
        console.error('Initial trading error:', error.message);
    }
}, 3000); // Start after 3 seconds - accelerated

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received, shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received, shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app; 