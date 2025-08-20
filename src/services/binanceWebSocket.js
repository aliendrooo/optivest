const WebSocket = require('ws');
const EventEmitter = require('events');

class BinanceWebSocketService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.subscriptions = new Set();
        this.isConnected = false;
        this.priceCache = new Map();
        this.lastUpdate = new Map();
        
        // Binance WebSocket endpoint
        this.baseUrl = 'wss://stream.binance.com:9443/ws/';
        
        // Auto-reconnect ayarları
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
    }

    // Bağlantı başlat
    connect(symbols = ['btcusdt', 'ethusdt', 'bnbusdt', 'adausdt', 'solusdt', 'dotusdt', 'dogeusdt', 'avaxusdt', 'linkusdt', 'polusdt', 'ftmusdt', 'vetusdt', 'icpusdt', 'atomusdt']) {
        try {
            console.log('🚀 Binance WebSocket bağlantısı başlatılıyor...');
            
            // Stream URL'yi oluştur (24hr ticker için)
            const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
            const wsUrl = `${this.baseUrl}${streams}`;
            
            console.log(`📡 WebSocket URL: ${wsUrl}`);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.on('open', () => {
                console.log('✅ Binance WebSocket bağlantısı açıldı');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                this.emit('connected');
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('📨 WebSocket mesaj parse hatası:', error);
                }
            });

            this.ws.on('close', (code, reason) => {
                console.log(`❌ Binance WebSocket bağlantısı kapandı. Code: ${code}, Reason: ${reason}`);
                this.isConnected = false;
                this.stopHeartbeat();
                this.emit('disconnected');
                this.handleReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('🚨 Binance WebSocket hatası:', error);
                this.emit('error', error);
            });

        } catch (error) {
            console.error('🚨 WebSocket bağlantı hatası:', error);
            this.emit('error', error);
        }
    }

    // Mesaj işleme
    handleMessage(message) {
        try {
            // 24hr ticker mesajı
            if (message.e === '24hrTicker') {
                const symbol = message.s; // BTCUSDT formatında
                const price = parseFloat(message.c); // Current price
                const change24h = parseFloat(message.P); // 24hr price change percentage
                const volume = parseFloat(message.v); // Volume
                const high = parseFloat(message.h); // 24hr high
                const low = parseFloat(message.l); // 24hr low
                
                // Trading pair formatına çevir (BTC/USDT)
                const tradingPair = this.formatSymbol(symbol);
                
                const priceData = {
                    symbol: tradingPair,
                    price: price,
                    change_24h: change24h,
                    volume: volume,
                    high: high,
                    low: low,
                    timestamp: Date.now()
                };
                
                // Cache'e kaydet
                this.priceCache.set(tradingPair, priceData);
                this.lastUpdate.set(tradingPair, Date.now());
                
                // Event emit et
                this.emit('priceUpdate', priceData);
                
                // Log (sadece bazı coinler için)
                if (['BTC/USDT', 'ETH/USDT', 'POL/USDT'].includes(tradingPair)) {
                    console.log(`📊 ${tradingPair}: $${price.toFixed(6)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)`);
                }
            }
            
            // Heartbeat güncelle
            this.lastHeartbeat = Date.now();
            
        } catch (error) {
            console.error('🚨 Mesaj işleme hatası:', error);
        }
    }

    // Symbol formatını düzenle (BTCUSDT -> BTC/USDT)
    formatSymbol(binanceSymbol) {
        // USDT ile biten coinleri ayır
        if (binanceSymbol.endsWith('USDT')) {
            const base = binanceSymbol.replace('USDT', '');
            return `${base}/USDT`;
        }
        return binanceSymbol;
    }

    // Heartbeat sistemi
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
            
            // 30 saniyeden fazla mesaj gelmezse reconnect
            if (timeSinceLastHeartbeat > 30000) {
                console.log('💓 Heartbeat timeout, reconnecting...');
                this.reconnect();
            }
        }, 10000); // Her 10 saniyede kontrol et
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Yeniden bağlanma
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            
            console.log(`🔄 ${delay}ms sonra yeniden bağlanma denemesi (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.reconnect();
            }, delay);
        } else {
            console.error('❌ Maksimum yeniden bağlanma denemesi aşıldı');
            this.emit('maxReconnectReached');
        }
    }

    reconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connect();
    }

    // Fiyat verilerini al
    getPrices() {
        const prices = {};
        for (const [symbol, data] of this.priceCache.entries()) {
            prices[symbol] = data;
        }
        return prices;
    }

    // Belirli bir coin'in fiyatını al
    getPrice(symbol) {
        return this.priceCache.get(symbol);
    }

    // Son güncellenme zamanı
    getLastUpdate(symbol) {
        return this.lastUpdate.get(symbol);
    }

    // Bağlantı durumu
    isWebSocketConnected() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // Bağlantıyı kapat
    disconnect() {
        console.log('🔌 Binance WebSocket bağlantısı kapatılıyor...');
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        this.priceCache.clear();
        this.lastUpdate.clear();
    }

    // Cache istatistikleri
    getCacheStats() {
        return {
            connectedPairs: this.priceCache.size,
            isConnected: this.isConnected,
            lastHeartbeat: this.lastHeartbeat,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

module.exports = BinanceWebSocketService;
