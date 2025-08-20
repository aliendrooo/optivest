const ccxt = require('ccxt');
const { SMA, RSI, MACD } = require('technicalindicators');
const BinanceWebSocketService = require('./binanceWebSocket');

// Pine Script Follow Line Stratejisi Sınıfı
class FollowLineStrategy {
    constructor() {
        this.atrPeriod = 5;
        this.bbPeriod = 21;
        this.bbDeviation = 1.0;
        this.useATRFilter = true;
    }

    // ATR (Average True Range) hesaplama
    calculateATR(data, period = 5) {
        if (data.length < period + 1) return null;
        
        const trueRanges = [];
        for (let i = 1; i < data.length; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i - 1].close;
            
            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            const trueRange = Math.max(tr1, tr2, tr3);
            trueRanges.push(trueRange);
        }
        
        // ATR hesaplama (SMA kullanarak)
        const atrValues = SMA.calculate({ period, values: trueRanges });
        return atrValues[atrValues.length - 1];
    }

    // Bollinger Bands hesaplama
    calculateBollingerBands(data, period = 21, deviation = 1.0) {
        if (data.length < period) return null;
        
        const closes = data.map(candle => candle.close);
        const sma = SMA.calculate({ period, values: closes });
        const smaValue = sma[sma.length - 1];
        
        // Standart sapma hesaplama
        const recentCloses = closes.slice(-period);
        const mean = recentCloses.reduce((sum, val) => sum + val, 0) / period;
        const variance = recentCloses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        return {
            upper: smaValue + (stdDev * deviation),
            middle: smaValue,
            lower: smaValue - (stdDev * deviation)
        };
    }

    // Follow Line hesaplama
    calculateFollowLine(data) {
        if (data.length < Math.max(this.atrPeriod, this.bbPeriod) + 1) {
            return {
                followLine: null,
                trend: 'NEUTRAL',
                signal: 'HOLD',
                confidence: 0,
                support: null,
                resistance: null,
                atrValue: null,
                bbSignal: 'NEUTRAL'
            };
        }

        const currentCandle = data[data.length - 1];
        const atrValue = this.calculateATR(data, this.atrPeriod);
        const bb = this.calculateBollingerBands(data, this.bbPeriod, this.bbDeviation);
        
        if (!atrValue || !bb) {
            return {
                followLine: null,
                trend: 'NEUTRAL',
                signal: 'HOLD',
                confidence: 0,
                support: null,
                resistance: null,
                atrValue: null,
                bbSignal: 'NEUTRAL'
            };
        }

        // Bollinger Bands sinyali
        let bbSignal = 'NEUTRAL';
        if (currentCandle.close > bb.upper) {
            bbSignal = 'BULLISH';
        } else if (currentCandle.close < bb.lower) {
            bbSignal = 'BEARISH';
        }

        // Follow Line hesaplama
        let followLine = null;
        let trend = 'NEUTRAL';
        let signal = 'HOLD';
        let confidence = 0;

        // Önceki Follow Line değerini al (simülasyon için)
        const prevFollowLine = this.getPreviousFollowLine(data);
        
        if (bbSignal === 'BULLISH') {
            // Buy sinyali
            if (this.useATRFilter) {
                followLine = currentCandle.low - atrValue;
            } else {
                followLine = currentCandle.low;
            }
            
            if (prevFollowLine && followLine < prevFollowLine) {
                followLine = prevFollowLine;
            }
            
            signal = 'BUY';
            confidence = 0.8; // Daha yüksek güven
            trend = 'BULLISH';
            
        } else if (bbSignal === 'BEARISH') {
            // Sell sinyali
            if (this.useATRFilter) {
                followLine = currentCandle.high + atrValue;
            } else {
                followLine = currentCandle.high;
            }
            
            if (prevFollowLine && followLine > prevFollowLine) {
                followLine = prevFollowLine;
            }
            
            signal = 'SELL';
            confidence = 0.8; // Daha yüksek güven
            trend = 'BEARISH';
        } else {
            // HOLD durumu
            followLine = prevFollowLine || currentCandle.close;
            signal = 'HOLD';
            confidence = 0.1;
            
            // Trend yönünü belirle
            if (prevFollowLine) {
                if (followLine > prevFollowLine) {
                    trend = 'BULLISH';
                } else if (followLine < prevFollowLine) {
                    trend = 'BEARISH';
                }
            }
        }

        // Support ve Resistance seviyeleri
        const support = followLine - atrValue;
        const resistance = followLine + atrValue;

        return {
            followLine,
            trend,
            signal,
            confidence,
            support,
            resistance,
            atrValue,
            bbSignal,
            bollingerBands: bb
        };
    }

    // Önceki Follow Line değerini al (simülasyon)
    getPreviousFollowLine(data) {
        if (data.length < 2) return null;
        
        // Basit simülasyon - gerçek uygulamada bu değer saklanmalı
        const prevCandle = data[data.length - 2];
        return prevCandle.close;
    }

    // Trend değişimi kontrolü
    checkTrendChange(currentTrend, previousTrend) {
        if (previousTrend === 'BEARISH' && currentTrend === 'BULLISH') {
            return 'BUY';
        } else if (previousTrend === 'BULLISH' && currentTrend === 'BEARISH') {
            return 'SELL';
        }
        return 'HOLD';
    }
}

class PaperTrading {
    constructor() {
        // Kalıcı veri saklama için dosya sistemi kullan
        this.dataFile = './paper_trading_data.json';
        
        // Verileri yükle veya varsayılan değerleri kullan
        this.loadData();
        
        this.isSimulationMode = true;
        this.lastTradeTime = {}; // Son trade zamanı takibi
        this.minTradeInterval = 20000; // 20 saniye minimum trade aralığı - Dengeli agresif
        // tradingRunning değeri loadData() ile yüklendi, üzerine yazma!
        
        // Follow Line stratejisi instance'ı
        this.followLineStrategy = new FollowLineStrategy();
        
        // Binance WebSocket service'i
        this.binanceWS = new BinanceWebSocketService();
        this.wsConnected = false;
        this.wsInitialized = false;
        
        // Gerçek market verilerini almak için
        this.exchanges = {
            binance: new ccxt.binance({
                sandbox: false, // Gerçek API kullan
                enableRateLimit: true,
                timeout: 30000
            })
        };
        
        console.log('📊 Sanal Trading sistemi başlatıldı!');
        console.log(`💰 Mevcut bakiye: $${this.virtualBalance.USDT}`);
        console.log(`📈 Toplam işlem: ${this.tradeHistory.length}`);
        console.log(`🔄 Trading durumu: ${this.tradingRunning ? 'AKTİF' : 'DURMUŞ'}`);
        console.log('🎯 Pine Script Follow Line Stratejisi aktif');
        
        // WebSocket bağlantısını başlat
        this.initializeWebSocket();
        
        // Geçersiz emirleri temizle
        setTimeout(() => {
            this.cleanupInvalidOrders();
        }, 2000); // 2 saniye sonra temizle (sistem tam başlatıldıktan sonra)
    }

    // WebSocket bağlantısını başlat
    initializeWebSocket() {
        if (this.wsInitialized) {
            console.log('⚠️ WebSocket zaten başlatılmış, atlıyor...');
            return;
        }
        
        try {
            console.log('🚀 Binance WebSocket bağlantısı başlatılıyor...');
            this.wsInitialized = true;
            
            // Seçili coinlerin symbol'larını al
            const symbols = [
                'btcusdt', 'ethusdt', 'bnbusdt', 'adausdt', 'solusdt', 
                'dotusdt', 'dogeusdt', 'avaxusdt', 'linkusdt', 'polusdt', 
                'ftmusdt', 'vetusdt', 'icpusdt', 'atomusdt'
            ];
            
            // WebSocket event'lerini dinle
            this.binanceWS.on('connected', () => {
                console.log('✅ Binance WebSocket bağlandı!');
                this.wsConnected = true;
            });
            
            this.binanceWS.on('disconnected', () => {
                console.log('❌ Binance WebSocket bağlantısı kesildi');
                this.wsConnected = false;
            });
            
            this.binanceWS.on('priceUpdate', (priceData) => {
                // Fiyat güncellemesi geldiğinde işlem yap (isteğe bağlı)
                // console.log(`📊 ${priceData.symbol}: $${priceData.price}`);
            });
            
            this.binanceWS.on('error', (error) => {
                console.error('🚨 Binance WebSocket hatası:', error.message);
            });
            
            // Bağlantıyı başlat
            this.binanceWS.connect(symbols);
            
        } catch (error) {
            console.error('🚨 WebSocket başlatma hatası:', error.message);
        }
    }

    // Veri yükleme fonksiyonu
    loadData() {
        try {
            const fs = require('fs');
            if (fs.existsSync(this.dataFile)) {
                const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
                this.virtualBalance = data.virtualBalance || {
                    USDT: 10000,
                    BTC: 0,
                    ETH: 0,
                    BNB: 0,
                    ADA: 0,
                    LINK: 0
                };
                this.tradeHistory = data.tradeHistory || [];
                this.tradingRunning = data.tradingRunning || false;
                this.stopLossOrders = data.stopLossOrders || []; // Stop Loss emirleri
                this.takeProfitOrders = data.takeProfitOrders || []; // Take Profit emirleri
                console.log('✅ Veriler dosyadan yüklendi');
            } else {
                // Varsayılan değerler
                this.virtualBalance = {
                    USDT: 10000, // 10k başlangıç bakiyesi
                    BTC: 0,
                    ETH: 0,
                    BNB: 0,
                    DOT: 0,
                    ADA: 0,
                    AVAX: 0,
                    LINK: 0,
                    ATOM: 0,
                    ICP: 0,
                    VET: 0,
                    FTM: 0,
                    POL: 0
                };
                this.tradeHistory = [];
                this.tradingRunning = false;
                this.stopLossOrders = []; // Stop Loss emirleri
                this.takeProfitOrders = []; // Take Profit emirleri
                console.log('🆕 Yeni veri dosyası oluşturuldu');
            }
        } catch (error) {
            console.error('Veri yükleme hatası:', error.message);
            // Hata durumunda varsayılan değerler
            this.virtualBalance = {
                USDT: 10000, // 10k başlangıç bakiyesi
                BTC: 0,
                ETH: 0,
                BNB: 0,
                DOT: 0,
                ADA: 0,
                AVAX: 0,
                LINK: 0,
                ATOM: 0,
                ICP: 0,
                VET: 0,
                FTM: 0,
                POL: 0
            };
            this.tradeHistory = [];
            this.tradingRunning = false;
            this.stopLossOrders = []; // Stop Loss emirleri
            this.takeProfitOrders = []; // Take Profit emirleri
        }
    }

    // Veri kaydetme fonksiyonu
    saveData() {
        try {
            const fs = require('fs');
            const data = {
                virtualBalance: this.virtualBalance,
                tradeHistory: this.tradeHistory,
                tradingRunning: this.tradingRunning,
                stopLossOrders: this.stopLossOrders, // Stop Loss emirleri
                takeProfitOrders: this.takeProfitOrders, // Take Profit emirleri
                lastUpdate: new Date().toISOString()
            };
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Veri kaydetme hatası:', error.message);
        }
    }

    // Sanal bakiye durumu
    async getBalance() {
        const totalValue = await this.calculateTotalValue();
        const initialBalance = 10000; // Başlangıç bakiyesi
        
        // Kar/zarar hesaplama: Sadece başlangıç bakiyesinin üzerindeki kısım
        const totalPnL = totalValue - initialBalance;
        
        // Başarı oranı hesaplama
        const successRate = this.calculateSuccessRate();
        
        return {
            ...this.virtualBalance,
            totalValue: isNaN(totalValue) ? this.virtualBalance.USDT : totalValue,
            totalBalance: this.virtualBalance.USDT,
            availableBalance: this.virtualBalance.USDT,
            totalPnL: isNaN(totalPnL) ? 0 : totalPnL, // Kar/zarar 0'dan başlar
            successRate: successRate
        };
    }

    // Başarı oranı hesaplama fonksiyonu
    calculateSuccessRate() {
        if (this.tradeHistory.length === 0) {
            return 0;
        }

        // Trade'leri çiftler halinde grupla (BUY-SELL)
        const completedTrades = [];
        const positions = {};

        for (const trade of this.tradeHistory) {
            const symbol = trade.symbol;
            const baseCurrency = symbol.split('/')[0];

            if (!positions[baseCurrency]) {
                positions[baseCurrency] = { 
                    totalAmount: 0, 
                    totalCost: 0, 
                    trades: [] 
                };
            }

            positions[baseCurrency].trades.push(trade);

            if (trade.side === 'BUY') {
                positions[baseCurrency].totalAmount += trade.amount;
                positions[baseCurrency].totalCost += (trade.amount * trade.price);
            } else if (trade.side === 'SELL') {
                const soldAmount = trade.amount;
                const soldValue = trade.amount * trade.price;
                
                if (positions[baseCurrency].totalAmount > 0) {
                    // Ortalama maliyet hesapla
                    const avgCost = positions[baseCurrency].totalCost / positions[baseCurrency].totalAmount;
                    const profit = soldValue - (soldAmount * avgCost);
                    
                    completedTrades.push({
                        symbol: baseCurrency,
                        profit: profit,
                        profitable: profit > 0
                    });

                    // Pozisyonu güncelle
                    const remainingRatio = (positions[baseCurrency].totalAmount - soldAmount) / positions[baseCurrency].totalAmount;
                    positions[baseCurrency].totalAmount -= soldAmount;
                    positions[baseCurrency].totalCost *= remainingRatio;
                }
            }
        }

        if (completedTrades.length === 0) {
            return 0;
        }

        const profitableTrades = completedTrades.filter(trade => trade.profitable).length;
        return Math.round((profitableTrades / completedTrades.length) * 100);
    }

    // Toplam portföy değeri hesaplama
    async calculateTotalValue() {
        // Sadece USDT bakiyesini döndür
        return this.virtualBalance.USDT;
    }

    // Gerçek market fiyatı alma
    async getCurrentPrice(symbol) {
        try {
            console.log(`📊 ${symbol} için gerçek fiyat alınıyor...`);
            
            // Önce Binance WebSocket'ten dene
            if (this.wsConnected && this.binanceWS) {
                const wsPrice = this.binanceWS.getPrice(symbol);
                if (wsPrice && wsPrice.price) {
                    console.log(`✅ ${symbol} WebSocket fiyatı: $${wsPrice.price}`);
                    return wsPrice.price;
                }
            }
            
            // Fallback: Trading engine'den fiyat almayı dene
            const tradingEngine = require('./tradingEngine');
            const syntheticPrices = await tradingEngine.getSyntheticPrices();
            
            if (syntheticPrices[symbol] && syntheticPrices[symbol].price) {
                const price = parseFloat(syntheticPrices[symbol].price);
                console.log(`✅ ${symbol} gerçek fiyatı: $${price}`);
                return price;
            }
            
            // CoinGecko API'den dene (daha fazla coin için)
            const coinIds = {
                'BTC/USDT': 'bitcoin',
                'ETH/USDT': 'ethereum',
                'BNB/USDT': 'binancecoin',
                'ADA/USDT': 'cardano',
                'SOL/USDT': 'solana',
                'DOT/USDT': 'polkadot',
                'DOGE/USDT': 'dogecoin',
                'AVAX/USDT': 'avalanche-2',
                'LINK/USDT': 'chainlink',
                'POL/USDT': 'polygon',
                'XRP/USDT': 'ripple',
                'LTC/USDT': 'litecoin',
                'UNI/USDT': 'uniswap',
                'ATOM/USDT': 'cosmos',
                'FTM/USDT': 'fantom',
                'NEAR/USDT': 'near',
                'ALGO/USDT': 'algorand',
                'VET/USDT': 'vechain',
                'ICP/USDT': 'internet-computer',
                'FIL/USDT': 'filecoin'
            };
            
            const coinId = coinIds[symbol];
            if (coinId) {
                const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
                
                if (response.ok) {
                    const data = await response.json();
                    const price = data[coinId]?.usd;
                    
                    if (price && !isNaN(price)) {
                        console.log(`✅ ${symbol} CoinGecko fiyatı: $${price}`);
                        return parseFloat(price);
                    }
                }
            }
            
            // Binance API'yi dene
            const ticker = await this.exchanges.binance.fetchTicker(symbol);
            const price = parseFloat(ticker.last);
            if (!isNaN(price)) {
                console.log(`✅ ${symbol} Binance fiyatı: $${price}`);
                return price;
            }
            
            throw new Error('Geçerli fiyat alınamadı');
            
        } catch (error) {
            console.error(`Fiyat alınamadı ${symbol}:`, error.message);
            
            // Fallback fiyatlar (daha fazla coin için)
            const fallbackPrices = {
                'BTC/USDT': 45000 + (Math.random() * 2000 - 1000),
                'ETH/USDT': 2800 + (Math.random() * 200 - 100),
                'BNB/USDT': 320 + (Math.random() * 20 - 10),
                'ADA/USDT': 0.45 + (Math.random() * 0.1 - 0.05),
                'SOL/USDT': 95 + (Math.random() * 10 - 5),
                'DOT/USDT': 6.5 + (Math.random() * 1 - 0.5),
                'DOGE/USDT': 0.08 + (Math.random() * 0.02 - 0.01),
                'AVAX/USDT': 25 + (Math.random() * 5 - 2.5),
                'LINK/USDT': 15 + (Math.random() * 3 - 1.5),
                'POL/USDT': 0.7 + (Math.random() * 0.2 - 0.1),
                'XRP/USDT': 0.5 + (Math.random() * 0.1 - 0.05),
                'LTC/USDT': 80 + (Math.random() * 10 - 5),
                'UNI/USDT': 6 + (Math.random() * 1 - 0.5),
                'ATOM/USDT': 8 + (Math.random() * 2 - 1),
                'FTM/USDT': 0.3 + (Math.random() * 0.1 - 0.05),
                'NEAR/USDT': 2 + (Math.random() * 0.5 - 0.25),
                'ALGO/USDT': 0.2 + (Math.random() * 0.05 - 0.025),
                'VET/USDT': 0.02 + (Math.random() * 0.01 - 0.005),
                'ICP/USDT': 5 + (Math.random() * 1 - 0.5),
                'FIL/USDT': 4 + (Math.random() * 1 - 0.5)
            };
            
            const fallbackPrice = fallbackPrices[symbol] || 0;
            console.log(`🔄 ${symbol} fallback fiyatı: $${fallbackPrice}`);
            return isNaN(fallbackPrice) ? 0 : fallbackPrice;
        }
    }

    // Sanal market verisi alma
    async getMarketData(symbol, timeframe = '1h', limit = 100) {
        try {
            // Önce gerçek API'yi dene
            const exchange = this.exchanges.binance;
            const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
            
            return {
                symbol, // Symbol bilgisini ekle
                timeframe,
                data: ohlcv.map(candle => ({
                    timestamp: candle[0],
                    open: candle[1],
                    high: candle[2],
                    low: candle[3],
                    close: candle[4],
                    volume: candle[5]
                }))
            };
        } catch (error) {
            console.log(`⚠️ Market data alınamadı, synthetic data kullanılıyor: ${error.message}`);
            
            // Synthetic data oluştur
            const basePrice = this.getSyntheticPrice(symbol);
            const data = [];
            const now = Date.now();
            
            for (let i = limit - 1; i >= 0; i--) {
                const timestamp = now - (i * 60 * 60 * 1000); // 1 saat aralıklarla
                const priceVariation = (Math.random() - 0.5) * 0.1; // ±5% varyasyon
                const close = basePrice * (1 + priceVariation);
                const open = close * (1 + (Math.random() - 0.5) * 0.02);
                const high = Math.max(open, close) * (1 + Math.random() * 0.01);
                const low = Math.min(open, close) * (1 - Math.random() * 0.01);
                
                data.push({
                    timestamp,
                    open,
                    high,
                    low,
                    close,
                    volume: Math.random() * 1000000
                });
            }
            
            console.log(`📊 Synthetic data oluşturuldu: ${symbol} @ $${basePrice}`);
            
            return {
                symbol, // Symbol bilgisini ekle
                timeframe,
                data
            };
        }
    }

    // Synthetic fiyat oluşturma
    getSyntheticPrice(symbol) {
        const prices = {
            'BTC/USDT': 45000 + (Math.random() - 0.5) * 5000,
            'ETH/USDT': 2800 + (Math.random() - 0.5) * 300,
            'BNB/USDT': 320 + (Math.random() - 0.5) * 30,
            'ADA/USDT': 0.45 + (Math.random() - 0.5) * 0.1,
            'SOL/USDT': 95 + (Math.random() - 0.5) * 10,
            'DOT/USDT': 6.5 + (Math.random() - 0.5) * 1,
            'DOGE/USDT': 0.08 + (Math.random() - 0.5) * 0.02,
            'AVAX/USDT': 25 + (Math.random() - 0.5) * 5,
            'LINK/USDT': 15 + (Math.random() - 0.5) * 3,
            'POL/USDT': 0.7 + (Math.random() - 0.5) * 0.2,
            'XRP/USDT': 0.5 + (Math.random() - 0.5) * 0.1,
            'LTC/USDT': 80 + (Math.random() - 0.5) * 10,
            'UNI/USDT': 6 + (Math.random() - 0.5) * 1,
            'ATOM/USDT': 8 + (Math.random() - 0.5) * 2,
            'FTM/USDT': 0.3 + (Math.random() - 0.5) * 0.1,
            'NEAR/USDT': 2 + (Math.random() - 0.5) * 0.5,
            'ALGO/USDT': 0.2 + (Math.random() - 0.5) * 0.05,
            'VET/USDT': 0.02 + (Math.random() - 0.5) * 0.01,
            'ICP/USDT': 5 + (Math.random() - 0.5) * 1,
            'FIL/USDT': 4 + (Math.random() - 0.5) * 1
        };
        return prices[symbol] || 100;
    }

    // ATR hesaplama (Pine Script Follow Line için)
    calculateATR(highs, lows, closes, period = 5) {
        if (highs.length < period || lows.length < period || closes.length < period) {
            return 0;
        }
        
        const trueRanges = [];
        for (let i = 1; i < highs.length; i++) {
            const hl = highs[i] - lows[i];
            const hc = Math.abs(highs[i] - closes[i - 1]);
            const lc = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(hl, hc, lc));
        }
        
        // ATR = SMA of True Ranges
        const atrValues = [];
        for (let i = period - 1; i < trueRanges.length; i++) {
            const sum = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            atrValues.push(sum / period);
        }
        
        return atrValues[atrValues.length - 1] || 0;
    }

    // Bollinger Bands hesaplama (Pine Script Follow Line için)
    calculateBollingerBands(closes, period = 21, deviation = 1.0) {
        if (closes.length < period) {
            const lastPrice = closes[closes.length - 1];
            return {
                upper: lastPrice * 1.02,
                lower: lastPrice * 0.98,
                middle: lastPrice
            };
        }
        
        // SMA hesaplama
        const smaValues = [];
        for (let i = period - 1; i < closes.length; i++) {
            const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            smaValues.push(sum / period);
        }
        
        // Standard deviation hesaplama
        const currentSMA = smaValues[smaValues.length - 1];
        const recentCloses = closes.slice(-period);
        const variance = recentCloses.reduce((sum, price) => sum + Math.pow(price - currentSMA, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        return {
            upper: currentSMA + (stdDev * deviation),
            lower: currentSMA - (stdDev * deviation),
            middle: currentSMA
        };
    }

    // Pine Script Follow Line stratejisi (SADECE BTC HARİÇ DİĞER COİNLER İÇİN)
    calculatePineScriptFollowLine(closes, highs, lows, symbol) {
        // BTC için bu stratejiyi kullanma
        if (symbol.includes('BTC')) {
            return this.calculateFollowLine(closes, highs, lows); // Eski metodu kullan
        }
        
        const ATRperiod = 5;
        const BBperiod = 21;
        const BBdeviation = 1.0;
        const UseATRfilter = true;
        
        if (closes.length < Math.max(ATRperiod, BBperiod)) {
            return {
                trendDirection: 'NEUTRAL',
                followLine: closes[closes.length - 1],
                signal: 'HOLD',
                confidence: 0
            };
        }
        
        // Bollinger Bands hesaplama
        const bb = this.calculateBollingerBands(closes, BBperiod, BBdeviation);
        
        // ATR hesaplama
        const atrValue = this.calculateATR(highs, lows, closes, ATRperiod);
        
        let followLine = null;
        let bbSignal = 0;
        const currentClose = closes[closes.length - 1];
        const currentHigh = highs[highs.length - 1];
        const currentLow = lows[lows.length - 1];
        
        // BB Signal belirleme
        if (currentClose > bb.upper) {
            bbSignal = 1; // BUY signal
        } else if (currentClose < bb.lower) {
            bbSignal = -1; // SELL signal
        }
        
        // Follow Line hesaplama (Pine Script mantığı)
        if (bbSignal === 1) { // BUY signal logic
            if (UseATRfilter) {
                followLine = currentLow - atrValue;
            } else {
                followLine = currentLow;
            }
        } else if (bbSignal === -1) { // SELL signal logic
            if (UseATRfilter) {
                followLine = currentHigh + atrValue;
            } else {
                followLine = currentHigh;
            }
        } else {
            // Önceki follow line değerini koru
            followLine = closes[closes.length - 1];
        }
        
        // Trend direction belirleme (Follow Line eğimi)
        let iTrend = 0;
        const prevFollowLine = closes[closes.length - 2] || followLine;
        
        if (followLine > prevFollowLine) {
            iTrend = 1; // BULLISH
        } else if (followLine < prevFollowLine) {
            iTrend = -1; // BEARISH
        }
        
        // Buy & Sell conditions (Pine Script mantığı)
        let buy = 0;
        let sell = 0;
        let signal = 'HOLD';
        let confidence = 0;
        
        // Trend değişimi kontrolü
        const prevTrend = bbSignal; // Simplified for this implementation
        
        if (prevTrend === -1 && iTrend === 1) {
            buy = 1;
            signal = 'BUY';
            confidence = 0.6; // Yüksek güven
        } else if (prevTrend === 1 && iTrend === -1) {
            sell = 1;
            signal = 'SELL';
            confidence = 0.6; // Yüksek güven
        }
        
        // BB breakout sinyalleri
        if (bbSignal === 1 && signal === 'HOLD') {
            signal = 'BUY';
            confidence = 0.4;
        } else if (bbSignal === -1 && signal === 'HOLD') {
            signal = 'SELL';
            confidence = 0.4;
        }
        
        const trendDirection = iTrend > 0 ? 'BULLISH' : iTrend < 0 ? 'BEARISH' : 'NEUTRAL';
        
        return {
            trendDirection,
            followLine,
            signal,
            confidence,
            bbSignal,
            atrValue,
            bollingerBands: bb,
            supportLevel: followLine - atrValue,
            resistanceLevel: followLine + atrValue
        };
    }

    // Teknik indikatörleri hesaplama (Follow Line stratejisi ile güncellendi)
    calculateIndicators(marketData) {
        const closes = marketData.data.map(candle => candle.close);
        const highs = marketData.data.map(candle => candle.high);
        const lows = marketData.data.map(candle => candle.low);
        
        const sma20 = SMA.calculate({ period: 20, values: closes });
        const sma50 = SMA.calculate({ period: 50, values: closes });
        const rsi = RSI.calculate({ period: 14, values: closes });
        const macd = MACD.calculate({
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            values: closes
        });

        // Pine Script Follow Line stratejisi hesaplama
        const followLineResult = this.followLineStrategy.calculateFollowLine(marketData.data);
        
        // EMA Crossover (Trend Following)
        const ema9 = this.calculateEMA(closes, 9);
        const ema21 = this.calculateEMA(closes, 21);

        return {
            symbol: marketData.symbol, // Symbol bilgisini ekle
            sma20: sma20[sma20.length - 1],
            sma50: sma50[sma50.length - 1],
            rsi: rsi[rsi.length - 1],
            macd: macd[macd.length - 1],
            followLine: followLineResult,
            ema9: ema9[ema9.length - 1],
            ema21: ema21[ema21.length - 1],
            currentPrice: closes[closes.length - 1]
        };
    }

    // Follow Line hesaplama (Dynamic Trend Line)
    calculateFollowLine(closes, highs, lows) {
        const length = closes.length;
        const lookback = Math.min(20, length); // Son 20 period
        
        if (length < lookback) return { 
            trendDirection: 'NEUTRAL', 
            supportLevel: closes[length - 1], 
            resistanceLevel: closes[length - 1],
            signal: 'HOLD'
        };
        
        const recentData = {
            closes: closes.slice(-lookback),
            highs: highs.slice(-lookback),
            lows: lows.slice(-lookback)
        };
        
        // Trend yönünü belirle
        const firstPrice = recentData.closes[0];
        const lastPrice = recentData.closes[lookback - 1];
        const trendDirection = lastPrice > firstPrice ? 'BULLISH' : 'BEARISH';
        
        // Support/Resistance seviyeleri
        const recentHighs = recentData.highs.slice(-10);
        const recentLows = recentData.lows.slice(-10);
        
        const resistanceLevel = Math.max(...recentHighs);
        const supportLevel = Math.min(...recentLows);
        
        // Follow line sinyali
        let signal = 'HOLD';
        const currentPrice = lastPrice;
        const pricePosition = (currentPrice - supportLevel) / (resistanceLevel - supportLevel);
        
        if (trendDirection === 'BULLISH') {
            if (pricePosition > 0.7 && currentPrice > resistanceLevel * 0.98) {
                signal = 'BUY'; // Direnci kırıyor
            } else if (pricePosition < 0.3) {
                signal = 'BUY'; // Destekten yükseliyor
            }
        } else if (trendDirection === 'BEARISH') {
            if (pricePosition < 0.3 && currentPrice < supportLevel * 1.02) {
                signal = 'SELL'; // Desteği kırıyor
            } else if (pricePosition > 0.7) {
                signal = 'SELL'; // Dirençten düşüyor
            }
        }
        
        return {
            trendDirection,
            supportLevel,
            resistanceLevel,
            signal,
            pricePosition: pricePosition * 100 // Yüzde olarak
        };
    }

    // EMA hesaplama
    calculateEMA(data, period) {
        if (data.length < period) return data;
        
        const ema = [];
        const multiplier = 2 / (period + 1);
        ema[0] = data[0];
        
        for (let i = 1; i < data.length; i++) {
            ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
        }
        
        return ema;
    }

    // Trading sinyali üretme (Follow Line ile güçlendirilmiş)
    generateSignal(indicators) {
        const { symbol, sma20, sma50, rsi, macd, currentPrice, followLine, ema9, ema21 } = indicators;
        
        let signal = 'HOLD';
        let confidence = 0;
        
        // Pine Script Follow Line stratejisini kullan
        if (followLine && followLine.signal) {
            console.log(`🎯 === PINE SCRIPT FOLLOW LINE STRATEJİSİ ===`);
            console.log(`📊 Symbol: ${symbol || 'Unknown'}`);
            console.log(`💹 Trend Direction: ${followLine.trend}`);
            console.log(`📍 Follow Line: $${followLine.followLine?.toFixed(4) || 'N/A'}`);
            console.log(`🔵 Support Level: $${followLine.support?.toFixed(4) || 'N/A'}`);
            console.log(`🔴 Resistance Level: $${followLine.resistance?.toFixed(4) || 'N/A'}`);
            console.log(`📈 BB Signal: ${followLine.bbSignal}`);
            console.log(`⚡ ATR Value: $${followLine.atrValue?.toFixed(4) || 'N/A'}`);
            
            // Pine Script Follow Line sinyalini ana sinyal olarak kullan
            signal = followLine.signal;
            confidence = followLine.confidence || 0;
            
            // Bollinger Bands breakout konfirmasyonu
            if (followLine.bollingerBands) {
                const bb = followLine.bollingerBands;
                console.log(`📊 Bollinger Bands: Upper=$${bb.upper.toFixed(2)}, Lower=$${bb.lower.toFixed(2)}, Middle=$${bb.middle.toFixed(2)}`);
                
                if (currentPrice > bb.upper && signal === 'BUY') {
                    confidence += 0.15;
                    console.log(`🚀 BB Upper Breakout konfirmasyonu (+0.15)`);
                } else if (currentPrice < bb.lower && signal === 'SELL') {
                    confidence += 0.15;
                    console.log(`💥 BB Lower Breakdown konfirmasyonu (+0.15)`);
                }
            }
            
            console.log(`🎯 Pine Script Follow Line Sinyal: ${signal} (Güven: ${(confidence * 100).toFixed(1)}%)`);
        }

        // EMA Crossover sinyali (çok agresif destekleyici)
        if (ema9 > ema21) {
            if (signal === 'BUY') confidence += 0.2; // 0.1'den 0.2'ye artırıldı
            else if (signal === 'HOLD') {
                signal = 'BUY';
                confidence += 0.3; // 0.15'ten 0.3'e artırıldı - çok agresif
            }
            console.log(`📈 EMA Crossover: BULLISH (EMA9: ${ema9?.toFixed(2)} > EMA21: ${ema21?.toFixed(2)})`);
        } else if (ema9 < ema21) {
            if (signal === 'SELL') confidence += 0.2; // 0.1'den 0.2'ye artırıldı
            else if (signal === 'HOLD') {
                signal = 'SELL';
                confidence += 0.3; // 0.15'ten 0.3'e artırıldı - çok agresif
            }
            console.log(`📉 EMA Crossover: BEARISH (EMA9: ${ema9?.toFixed(2)} < EMA21: ${ema21?.toFixed(2)})`);
        }

        // Trend analizi (destekleyici)
        const trend = sma20 > sma50 ? 'BULLISH' : 'BEARISH';
        
        // RSI konfirmasyonu (ULTRA agresif ağırlık)
        if (rsi < 50 && signal === 'BUY') { // 35'ten 50'ye gevşetildi
            confidence += 0.3; // 0.2'den 0.3'e artırıldı
            console.log(`🟢 RSI Oversold konfirmasyonu: ${rsi?.toFixed(1)}`);
        } else if (rsi > 50 && signal === 'SELL') { // 70'ten 50'ye düşürüldü
            confidence += 0.3; // 0.2'den 0.3'e artırıldı
            console.log(`🔴 RSI Overbought konfirmasyonu: ${rsi?.toFixed(1)}`);
        }

        // MACD konfirmasyonu (agresif ağırlık)
        if (macd?.MACD > macd?.signal && signal === 'BUY') {
            confidence += 0.15; // 0.05'ten 0.15'e artırıldı
            console.log(`🚀 MACD BULLISH konfirmasyonu`);
        } else if (macd?.MACD < macd?.signal && signal === 'SELL') {
            confidence += 0.15; // 0.05'ten 0.15'e artırıldı
            console.log(`💥 MACD BEARISH konfirmasyonu`);
        }

        // Trend ile uyum kontrolü (agresif ağırlık)
        if ((signal === 'BUY' && trend === 'BULLISH') || (signal === 'SELL' && trend === 'BEARISH')) {
            confidence += 0.1; // 0.05'ten 0.1'e artırıldı
            console.log(`✅ Trend uyumu: ${trend}`);
        }

        // Support/Resistance seviyeleri logları (Follow Line'dan)
        if (followLine.supportLevel !== undefined) {
            console.log(`📊 Follow Line Analizi:`);
            console.log(`   💹 Trend: ${followLine.trendDirection}`);
            console.log(`   🔵 Destek: $${followLine.supportLevel?.toFixed(2)}`);
            console.log(`   🔴 Direnç: $${followLine.resistanceLevel?.toFixed(2)}`);
            console.log(`   📍 Mevcut Fiyat: $${currentPrice?.toFixed(2)}`);
        }

        // 🚀 GELİŞMİŞ STRATEJİ 1: BOLLINGER BANDS + RSI KOMBINASYONU
        if (followLine && followLine.bollingerBands && rsi) {
            const bb = followLine.bollingerBands;
            console.log(`🎯 === BOLLINGER BANDS + RSI STRATEJİSİ ===`);
            
            // BB Squeeze + RSI Oversold = Güçlü BUY (daha gevşek RSI eşiği)
            if (currentPrice <= bb.lower && rsi <= 50) { // 40'tan 50'ye gevşetildi
                if (signal === 'BUY') confidence += 0.6; // 0.4'ten 0.6'ya artırıldı
                else if (signal === 'HOLD') {
                    signal = 'BUY';
                    confidence += 0.7; // 0.5'ten 0.7'ye artırıldı
                }
                console.log(`🚀 BB Lower + RSI Oversold = GÜÇLÜ BUY! (RSI: ${rsi?.toFixed(1)})`);
            }
            
            // BB Breakout + RSI Overbought = Güçlü SELL (daha gevşek RSI eşiği)
            else if (currentPrice >= bb.upper && rsi >= 55) { // 65'ten 55'e düşürüldü
                if (signal === 'SELL') confidence += 0.6; // 0.4'ten 0.6'ya artırıldı
                else if (signal === 'HOLD') {
                    signal = 'SELL';
                    confidence += 0.7; // 0.5'ten 0.7'ye artırıldı
                }
                console.log(`💥 BB Upper + RSI Overbought = GÜÇLÜ SELL! (RSI: ${rsi?.toFixed(1)})`);
            }
        }

        // 🚀 GELİŞMİŞ STRATEJİ 2: MACD + HISTOGRAM GÜÇLENDİRME
        if (macd && macd.MACD !== undefined && macd.signal !== undefined && macd.histogram !== undefined) {
            console.log(`🎯 === MACD + HISTOGRAM STRATEJİSİ ===`);
            console.log(`   📊 MACD: ${macd.MACD?.toFixed(4)}`);
            console.log(`   📶 Signal: ${macd.signal?.toFixed(4)}`);
            console.log(`   📊 Histogram: ${macd.histogram?.toFixed(4)}`);
            
            // MACD çizgisi sinyal çizgisini yukarı kesiyor + Histogram pozitif büyüyor
            if (macd.MACD > macd.signal && macd.histogram > 0) {
                if (signal === 'BUY') confidence += 0.3;
                else if (signal === 'HOLD') {
                    signal = 'BUY';
                    confidence += 0.4;
                }
                console.log(`🚀 MACD Bullish Crossover + Pozitif Histogram = GÜÇLÜ BUY!`);
            }
            
            // MACD çizgisi sinyal çizgisini aşağı kesiyor + Histogram negatif büyüyor
            else if (macd.MACD < macd.signal && macd.histogram < 0) {
                if (signal === 'SELL') confidence += 0.3;
                else if (signal === 'HOLD') {
                    signal = 'SELL';
                    confidence += 0.4;
                }
                console.log(`💥 MACD Bearish Crossover + Negatif Histogram = GÜÇLÜ SELL!`);
            }
        }

        // 🚀 GELİŞMİŞ STRATEJİ 3: RSI + EMA MOMENTUM KOMBINASYONU
        if (rsi && ema9 && ema21) {
            console.log(`🎯 === RSI + EMA MOMENTUM STRATEJİSİ ===`);
            
            // RSI düşük + EMA9 > EMA21 = Momentum geri dönüş BUY (daha gevşek RSI)
            if (rsi <= 55 && ema9 > ema21) { // 40'tan 55'e gevşetildi
                if (signal === 'BUY') confidence += 0.4; // 0.25'ten 0.4'e artırıldı
                else if (signal === 'HOLD') {
                    signal = 'BUY';
                    confidence += 0.6; // 0.35'ten 0.6'ya artırıldı
                }
                console.log(`🚀 RSI Düşük + EMA Bullish = MOMENTUM BUY! (RSI: ${rsi?.toFixed(1)})`);
            }
            
            // RSI yüksek + EMA9 < EMA21 = Momentum tersine dönüş SELL (daha gevşek RSI)
            else if (rsi >= 45 && ema9 < ema21) { // 60'tan 45'e düşürüldü
                if (signal === 'SELL') confidence += 0.4; // 0.25'ten 0.4'e artırıldı
                else if (signal === 'HOLD') {
                    signal = 'SELL';
                    confidence += 0.6; // 0.35'ten 0.6'ya artırıldı
                }
                console.log(`💥 RSI Yüksek + EMA Bearish = MOMENTUM SELL! (RSI: ${rsi?.toFixed(1)})`);
            }
        }

        // 🚀 GELİŞMİŞ STRATEJİ 4: EMA CROSSOVER (HIZLI & YAVAŞ) GÜÇLENDİRME
        if (ema9 && ema21 && sma20 && sma50) {
            console.log(`🎯 === ÇOKLU EMA CROSSOVER STRATEJİSİ ===`);
            
            // Tüm ortalamalar bullish sıralama = Süper güçlü BUY
            if (ema9 > ema21 && ema21 > sma20 && sma20 > sma50) {
                if (signal === 'BUY') confidence += 0.3;
                else if (signal === 'HOLD') {
                    signal = 'BUY';
                    confidence += 0.4;
                }
                console.log(`🚀 SÜPER BULLISH: EMA9 > EMA21 > SMA20 > SMA50 = GÜÇLÜ BUY!`);
            }
            
            // Tüm ortalamalar bearish sıralama = Süper güçlü SELL
            else if (ema9 < ema21 && ema21 < sma20 && sma20 < sma50) {
                if (signal === 'SELL') confidence += 0.3;
                else if (signal === 'HOLD') {
                    signal = 'SELL';
                    confidence += 0.4;
                }
                console.log(`💥 SÜPER BEARISH: EMA9 < EMA21 < SMA20 < SMA50 = GÜÇLÜ SELL!`);
            }
            
            // Hızlı EMA kesişim onayı
            else if (ema9 > ema21 && signal === 'BUY') {
                confidence += 0.15;
                console.log(`📈 EMA9/21 Bullish Crossover onayı (+0.15)`);
            }
            else if (ema9 < ema21 && signal === 'SELL') {
                confidence += 0.15;
                console.log(`📉 EMA9/21 Bearish Crossover onayı (+0.15)`);
            }
        }

        // FALLBACK: Eğer hala yeterince güçlü sinyal yoksa, rastgele güçlü sinyal üret (konservatif)
        if (confidence < 0.15) {
            const random = Math.random();
            console.log(`🎲 FALLBACK SİNYAL AKTİF: Mevcut güven ${confidence.toFixed(2)}, rastgele sinyal üretiliyor...`);
            
            if (random > 0.6) {
                signal = 'BUY';
                confidence = 0.5 + Math.random() * 0.3; // 0.5-0.8 arası güven
                console.log(`🎲 RASTGELE BUY SİNYALİ: Güven ${confidence.toFixed(2)}`);
            } else if (random < 0.4) {
                signal = 'SELL';
                confidence = 0.5 + Math.random() * 0.3; // 0.5-0.8 arası güven
                console.log(`🎲 RASTGELE SELL SİNYALİ: Güven ${confidence.toFixed(2)}`);
            } else {
                // Market trend'e göre sinyal üret
                const marketTrend = sma20 > sma50 ? 'BULLISH' : 'BEARISH';
                if (marketTrend === 'BULLISH') {
                    signal = 'BUY';
                    confidence = 0.4;
                    console.log(`🎲 TREND BAZLI BUY SİNYALİ: Güven ${confidence}`);
                } else {
                    signal = 'SELL';
                    confidence = 0.4;
                    console.log(`🎲 TREND BAZLI SELL SİNYALİ: Güven ${confidence}`);
                }
            }
        }

        return {
            signal,
            confidence: Math.min(confidence, 1),
            indicators,
            followLineData: followLine,
            timestamp: new Date().toISOString()
        };
    }

    // Sanal trade yapma
    async executePaperTrade(symbol, side, amount, price = null) {
        const baseCurrency = symbol.split('/')[0];
        const quoteCurrency = symbol.split('/')[1];
        const currentPrice = price || await this.getCurrentPrice(symbol);
        const cost = amount * (currentPrice || 0);

        if (side === 'BUY') {
            // USDT'den kripto al - Yeterli bakiye kontrolü
            if (this.virtualBalance.USDT < cost) {
                throw new Error(`Yetersiz USDT bakiyesi! Mevcut: $${this.virtualBalance.USDT.toFixed(2)}, Gerekli: $${cost.toFixed(2)}`);
            }
            this.virtualBalance.USDT -= cost;
            this.virtualBalance[baseCurrency] = (this.virtualBalance[baseCurrency] || 0) + amount;
        } else if (side === 'SELL') {
            // Kripto sat - Yeterli coin kontrolü
            const availableAmount = this.virtualBalance[baseCurrency] || 0;
            if (availableAmount < amount) {
                throw new Error(`Yetersiz ${baseCurrency} bakiyesi! Mevcut: ${availableAmount.toFixed(6)} ${baseCurrency}, Satılmaya çalışılan: ${amount.toFixed(6)} ${baseCurrency}`);
            }
            this.virtualBalance[baseCurrency] -= amount;
            this.virtualBalance.USDT += cost;
        }

        const trade = {
            id: `synthetic_${Date.now()}`,
            symbol,
            exchange: 'synthetic',
            side,
            amount,
            price: currentPrice,
            status: 'closed',
            timestamp: new Date().toISOString(),
        };
        this.tradeHistory.push(trade);
        
        // Son trade zamanını güncelle (sık trade önleme)
        this.lastTradeTime[baseCurrency] = Date.now();
        
        this.saveData(); // Veriyi kaydet
        console.log(`✅ [TEST] SANAL TRADE KAYDEDİLDİ:`, trade);
        return trade;
    }

    // Trading durumu kontrolü
    isTradingRunning() {
        return this.tradingRunning;
    }

    // Trading başlatma
    startTrading() {
        this.tradingRunning = true;
        this.saveData(); // Durumu kaydet
        console.log('🚀 Sanal trading başlatıldı!');
    }

    // Trading durdurma
    stopTrading() {
        this.tradingRunning = false;
        this.saveData(); // Durumu kaydet
        console.log('🛑 Sanal trading durduruldu!');
    }

    // BTC Follow Line stratejisi çalıştırma
    async runBTCFollowLineStrategy() {
        console.log('🎯 BTC Follow Line Stratejisi başlatılıyor...');
        
        const pair = 'BTC/USDT';
        
        try {
            console.log(`📊 ${pair} Follow Line analizi yapılıyor...`);
            
            // Market verilerini al
            const marketData = await this.getMarketData(pair);
            
            // Teknik indikatörleri hesapla (Follow Line dahil)
            const indicators = this.calculateIndicators(marketData);
            
            // Trading sinyali üret
            const signal = this.generateSignal(indicators);
            
            console.log(`\n🎯 === BTC FOLLOW LINE ANALİZİ ===`);
            console.log(`📈 Ana Sinyal: ${signal.signal} (Güven: ${(signal.confidence * 100).toFixed(1)}%)`);
            console.log(`💰 Mevcut BTC Fiyat: $${indicators.currentPrice.toFixed(2)}`);
            
                    // Follow Line stratejisi için DENGELI agresif sinyaller
        if (signal.confidence >= 0.25) { // BTC için dengeli agresif eşik - garanti trade
                const baseCurrency = 'BTC';
                const currentPrice = indicators.currentPrice;
                
                console.log(`🔍 Follow Line sinyali işleniyor: ${signal.signal} (Güven: ${(signal.confidence * 100).toFixed(1)}%)`);
                
                if (signal.signal === 'BUY' && this.virtualBalance.USDT > 30) {
                    // Minimum trade aralığı kontrolü
                    const now = Date.now();
                    const lastTradeTime = this.lastTradeTime[baseCurrency] || 0;
                    
                    if (now - lastTradeTime < this.minTradeInterval) {
                        console.log(`⏰ ${baseCurrency} için henüz trade yapılamaz (${Math.ceil((this.minTradeInterval - (now - lastTradeTime)) / 1000)}s kaldı)`);
                        return;
                    }
                    
                    // BTC pozisyon limiti kontrolü
                    const currentHolding = this.virtualBalance[baseCurrency] || 0;
                    const currentValue = currentHolding * currentPrice;
                
                // BTC'den 4000 USDT'den fazla tutma
                if (currentValue > 4000) {
                    console.log(`⚠️ ${baseCurrency} zaten çok fazla var ($${currentValue.toFixed(2)}) - BUY işlemi atlandı`);
                    return;
                }
                
                // BTC için %12 pozisyon (makul)
                const maxUSDT = this.virtualBalance.USDT * 0.15; // BTC için %15 pozisyon (dengeli)
                    const amount = maxUSDT / currentPrice;
                    
                    console.log(`💰 BTC Alım Detayları:`);
                    console.log(`   💵 Kullanılacak USDT: $${maxUSDT.toFixed(2)}`);
                    console.log(`   🪙 Alınacak BTC: ${amount.toFixed(6)} BTC`);
                    console.log(`   📊 Follow Line Trend: ${signal.followLineData.trendDirection}`);
                    
                    if (amount > 0.0001 && this.virtualBalance.USDT >= maxUSDT) {
                        console.log(`🟢 BTC Follow Line BUY - Sanal trade başlatılıyor...`);
                        const trade = await this.executePaperTrade(pair, 'BUY', amount);
                        
                        // Otomatik Stop Loss/Take Profit ayarla (BTC için konservatif)
                        if (trade) {
                            await this.setAutoStopLossTakeProfit(pair, currentPrice, amount, 2, 5); // %2 SL, %5 TP (daha sıkı)
                        }
                    } else {
                        console.log(`❌ BTC alım yapılamıyor: Amount=${amount.toFixed(6)}, USDT=${this.virtualBalance.USDT.toFixed(2)}`);
                    }
                } else if (signal.signal === 'SELL') {
                    const availableAmount = this.virtualBalance[baseCurrency] || 0;
                    
                    console.log(`🔍 DEBUG: BTC için SELL sinyali işleniyor...`);
                    console.log(`💰 BTC Satış Detayları:`);
                    console.log(`   🪙 Mevcut BTC: ${availableAmount.toFixed(6)}`);
                    console.log(`   💵 Tahmini değer: $${(availableAmount * currentPrice).toFixed(2)}`);
                    console.log(`   📊 Follow Line Trend: ${signal.followLineData.trendDirection}`);
                    
                    if (availableAmount > 0.0001) {
                        // BTC'nin %80'ini sat (daha agresif)
                        const sellAmount = availableAmount * 0.8;
                        console.log(`🔴 BTC Follow Line SELL - ${sellAmount.toFixed(6)} BTC satılıyor...`);
                        console.log(`🔍 DEBUG: BTC SELL koşulları - Miktar: ${availableAmount.toFixed(6)}, SatılacakMiktar: ${sellAmount.toFixed(6)}`);
                        await this.executePaperTrade(pair, 'SELL', sellAmount);
                    } else {
                        console.log(`ℹ️ BTC pozisyonu bulunamadı (Miktar: ${availableAmount.toFixed(6)})`);
                        // 🚀 YENİ: BTC için de SELL sinyali varsa bile pozisyon yoksa BUY yap!
                        if (this.virtualBalance.USDT > 800) {
                            console.log(`🚀 ZORLA BTC BUY! SELL sinyali var ama pozisyon yok, BTC pozisyonu açılıyor!`);
                            const maxUSDT = this.virtualBalance.USDT * 0.12; // %12 BTC pozisyonu (konservatif)
                            const amount = maxUSDT / currentPrice;
                            if (amount > 0.0001) {
                                console.log(`🟢 ZORLA BTC BUY - Miktar: ${amount.toFixed(6)}, Değer: $${maxUSDT.toFixed(2)}`);
                                const trade = await this.executePaperTrade(pair, 'BUY', amount);
                                if (trade) {
                                    await this.setAutoStopLossTakeProfit(pair, currentPrice, amount, 3, 8);
                                }
                            }
                        } else {
                            console.log(`⚠️ BTC SELL sinyali aktif - yeni BTC alımı yapılmayacak (USDT: $${this.virtualBalance.USDT})`);
                        }
                    }
                }
            } else {
                console.log(`⏸️ BTC Follow Line güven seviyesi düşük: ${(signal.confidence * 100).toFixed(1)}%`);
                console.log(`ℹ️ Minimum güven eşiği: 1%`);
            }
            
            return signal;
            
        } catch (error) {
            console.error(`❌ BTC Follow Line stratejisi hatası:`, error.message);
            return null;
        }
    }

    // Sanal trading stratejisi çalıştırma
    async runPaperTradingStrategy() {
        if (!this.tradingRunning) {
            console.log('🛑 Trading durmuş, strateji çalıştırılmıyor...');
            return;
        }
        
        console.log('🎮 Sanal trading stratejisi başlatılıyor...');

        // 🔥 BÜYÜK POZİSYONLARI KONTROL ET VE SAT
        await this.checkAndSellLargePositions();

        // 🛑 STOP LOSS / TAKE PROFIT KONTROLÜ
        await this.checkStopLossTakeProfit();

        // İlk olarak BTC Follow Line stratejisini çalıştır
        console.log('\n🎯 === BTC FOLLOW LINE STRATEJİSİ ===');
        await this.runBTCFollowLineStrategy();

        // Trading engine'den coin listesini al (diğer coinler için)
        const tradingEngine = require('./tradingEngine');
        const allPairs = tradingEngine.tradingPairs || ['ETH/USDT', 'DOT/USDT', 'VET/USDT', 'ICP/USDT', 'AVAX/USDT', 'LINK/USDT', 'ATOM/USDT', 'ADA/USDT'];
        
        console.log(`\n📊 === DİĞER COİNLER STRATEJİSİ ===`);
        console.log(`📊 Trading edilecek diğer coinler: ${allPairs.join(', ')}`);
        
        for (const pair of allPairs) {
            // Trading durdurulduysa döngüden çık
            if (!this.tradingRunning) {
                console.log('🛑 Trading durduruldu, işlemler sonlandırılıyor...');
                break;
            }

            try {
                console.log(`📊 ${pair} analiz ediliyor...`);
                
                // Market verilerini al
                const marketData = await this.getMarketData(pair);
                
                // PINE SCRIPT FOLLOW LINE ile teknik indikatörleri hesapla
                const indicators = this.calculateIndicators(marketData);
                
                // PINE SCRIPT FOLLOW LINE trading sinyali üret
                const signal = this.generateSignal(indicators);
                
                console.log(`📈 ${pair} için sinyal: ${signal.signal} (Güven: ${signal.confidence})`);

                            // Pine Script Follow Line için DENGELI agresif eşik 
            if (signal.confidence >= 0.25) { // Dengeli agresif güven eşiği - garanti trade sıklığı
                    const baseCurrency = pair.split('/')[0];
                    const currentPrice = indicators.currentPrice;
                    
                    console.log(`🔍 DEBUG: ${pair} için ${signal.signal} sinyali işleniyor...`);
                    
                    if (signal.signal === 'BUY' && this.virtualBalance.USDT > 30) {
                        // Minimum trade aralığı kontrolü
                        const now = Date.now();
                        const lastTradeTime = this.lastTradeTime[baseCurrency] || 0;
                        
                        if (now - lastTradeTime < this.minTradeInterval) {
                            console.log(`⏰ ${baseCurrency} için henüz trade yapılamaz (${Math.ceil((this.minTradeInterval - (now - lastTradeTime)) / 1000)}s kaldı)`);
                            return;
                        }
                        
                        // Aynı coinden fazla pozisyon önleme
                        const currentHolding = this.virtualBalance[baseCurrency] || 0;
                        const currentValue = currentHolding * currentPrice;
                        
                        // Aynı coinden 3000 USDT'den fazla tutma
                        if (currentValue > 3000) {
                            console.log(`⚠️ ${baseCurrency} zaten çok fazla var ($${currentValue.toFixed(2)}) - BUY işlemi atlandı`);
                            return;
                        }
                        
                        // Diğer coinler için %12 pozisyon (dengeli)
                        const maxUSDT = this.virtualBalance.USDT * 0.12;
                        const amount = maxUSDT / currentPrice;
                        
                        console.log(`🔍 DEBUG: BUY koşulları - USDT: ${this.virtualBalance.USDT}, maxUSDT: ${maxUSDT}, amount: ${amount}`);
                        
                        if (amount > 0.001 && this.virtualBalance.USDT >= maxUSDT) {
                            console.log(`🟢 ${pair} için Pine Script Follow Line BUY - Sanal trade başlatılıyor...`);
                            const trade = await this.executePaperTrade(pair, 'BUY', amount);
                            
                            // Otomatik Stop Loss/Take Profit ayarla (konservatif)
                            if (trade) {
                                await this.setAutoStopLossTakeProfit(pair, currentPrice, amount, 3, 6); // %3 SL, %6 TP (daha sıkı)
                            }
                        } else {
                            console.log(`❌ BUY trade yapılamıyor: Amount=${amount}, USDT Bakiye=${this.virtualBalance.USDT}, maxUSDT=${maxUSDT}`);
                        }
                    } else if (signal.signal === 'SELL') {
                        const availableAmount = this.virtualBalance[baseCurrency] || 0;
                        
                        console.log(`🔍 DEBUG: ${pair} için SELL sinyali işleniyor...`);
                        
                        if (availableAmount > 0.001) {
                            console.log(`🔴 ${pair} için Pine Script Follow Line SELL - Sanal pozisyon bulundu!`);
                            // Pozisyonun %70'ini sat (daha agresif satış)
                            const sellAmount = availableAmount * 0.7;
                            console.log(`🔍 DEBUG: SELL koşulları - Miktar: ${availableAmount.toFixed(6)}, SatılacakMiktar: ${sellAmount.toFixed(6)}`);
                            await this.executePaperTrade(pair, 'SELL', sellAmount);
                        } else {
                            console.log(`🔴 ${pair} için Pine Script Follow Line SELL - Pozisyon kontrol ediliyor...`);
                            console.log(`ℹ️ ${pair} için açık pozisyon bulunamadı (Miktar: ${availableAmount.toFixed(6)})`);
                            // 🚀 YENİ: SELL sinyali olsa bile pozisyon yoksa BUY yapmaya zorla!
                            if (this.virtualBalance.USDT > 200) {
                                console.log(`🚀 ZORLA BUY! SELL sinyali var ama pozisyon yok, piyasaya giriş yapılıyor!`);
                                const maxUSDT = this.virtualBalance.USDT * 0.08; // %8 pozisyon al (konservatif)
                                const amount = maxUSDT / currentPrice;
                                if (amount > 0.001) {
                                    console.log(`🟢 ZORLA ${pair} BUY - Miktar: ${amount.toFixed(6)}, Değer: $${maxUSDT.toFixed(2)}`);
                                    await this.executePaperTrade(pair, 'BUY', amount);
                                }
                            }
                        }
                    }
                } else {
                    console.log(`⏸️ ${pair} için Pine Script Follow Line güven seviyesi düşük (${signal.confidence.toFixed(2)})`);
                }

            } catch (error) {
                console.error(`❌ ${pair} analiz hatası:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
            }
        }

        // 🎯 KONSERVATIF TRADING: Sadece güçlü sinyaller için pozisyon aç
        console.log(`📊 Dengeli agresif trading tamamlandı - sadece güçlü sinyaller için işlem yapıldı`);
        
        console.log('✅ Sanal trading stratejisi tamamlandı');
        
        // Performans raporu
        await this.generatePerformanceReport();
    }

    // 🔥 Büyük pozisyonları kontrol et ve sat
    async checkAndSellLargePositions() {
        console.log('🔥 Büyük pozisyonlar kontrol ediliyor...');
        
        for (const [currency, amount] of Object.entries(this.virtualBalance)) {
            if (currency === 'USDT') continue;
            
            // Her coin için değer kontrolü yap
            let currentPrice = 0.7; // Default POL fiyatı
            if (currency === 'BTC') currentPrice = 118000;
            else if (currency === 'ETH') currentPrice = 3000;
            else if (currency === 'DOT') currentPrice = 4.5;
            else if (currency === 'VET') currentPrice = 0.025;
            
            const positionValue = amount * currentPrice;
            
            // $5000'den büyük pozisyonları agresif sat
            if (positionValue > 5000 && amount > 0) {
                console.log(`🔥 BÜYÜK POZİSYON TESPİT EDİLDİ: ${currency}`);
                console.log(`   💰 Miktar: ${amount.toFixed(6)}`);
                console.log(`   📈 Fiyat: $${currentPrice}`);
                console.log(`   💵 Değer: $${positionValue.toFixed(2)}`);
                
                // %60'ını sat (agresif satış)
                const sellAmount = amount * 0.6;
                console.log(`🔴 ${currency} POZİSYONUNUN %60'I SATILIYOR: ${sellAmount.toFixed(6)}`);
                
                try {
                    await this.executePaperTrade(`${currency}/USDT`, 'SELL', sellAmount);
                    console.log(`✅ ${currency} satış başarılı!`);
                } catch (error) {
                    console.error(`❌ ${currency} satış hatası:`, error.message);
                }
            }
        }
    }

    // Klasik indikatör hesaplama (Follow Line olmadan)
    calculateClassicIndicators(marketData) {
        const closes = marketData.data.map(candle => candle.close);
        
        const sma20 = SMA.calculate({ period: 20, values: closes });
        const sma50 = SMA.calculate({ period: 50, values: closes });
        const rsi = RSI.calculate({ period: 14, values: closes });
        const macd = MACD.calculate({
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            values: closes
        });

        return {
            sma20: sma20[sma20.length - 1],
            sma50: sma50[sma50.length - 1],
            rsi: rsi[rsi.length - 1],
            macd: macd[macd.length - 1],
            currentPrice: closes[closes.length - 1]
        };
    }

    // Klasik sinyal üretme
    generateClassicSignal(indicators) {
        const { sma20, sma50, rsi, macd, currentPrice } = indicators;
        
        let signal = 'HOLD';
        let confidence = 0;

        // Trend analizi
        const trend = sma20 > sma50 ? 'BULLISH' : 'BEARISH';
        
        // RSI analizi
        if (rsi < 35) { // 30'dan 35'e gevşetildi
            signal = 'BUY';
            confidence += 0.3;
        } else if (rsi > 70) {
            signal = 'SELL';
            confidence += 0.3;
        }

        // MACD analizi
        if (macd.MACD > macd.signal && macd.MACD > 0) {
            if (signal === 'BUY') confidence += 0.2;
            else if (signal === 'HOLD') {
                signal = 'BUY';
                confidence += 0.2;
            }
        } else if (macd.MACD < macd.signal && macd.MACD < 0) {
            if (signal === 'SELL') confidence += 0.2;
            else if (signal === 'HOLD') {
                signal = 'SELL';
                confidence += 0.2;
            }
        }

        // Trend ile uyum kontrolü
        if ((signal === 'BUY' && trend === 'BULLISH') || (signal === 'SELL' && trend === 'BEARISH')) {
            confidence += 0.3;
        }

        return {
            signal,
            confidence: Math.min(confidence, 1),
            indicators,
            timestamp: new Date().toISOString()
        };
    }

    // Performans raporu oluşturma
    async generatePerformanceReport() {
        const totalValue = await this.calculateTotalValue();
        const initialBalance = 10000;
        const profit = totalValue - initialBalance;
        const profitPercentage = (profit / initialBalance) * 100;

        console.log('\n📊 SANAL TRADING RAPORU');
        console.log('='.repeat(40));
        console.log(`💰 Toplam Değer: $${totalValue.toFixed(2)}`);
        console.log(`📈 Kar/Zarar: $${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`);
        console.log(`🔄 Toplam İşlem: ${this.tradeHistory.length}`);
        console.log(`📅 Son Güncelleme: ${new Date().toLocaleString('tr-TR')}`);
        console.log('='.repeat(40));

        return {
            totalValue,
            profit,
            profitPercentage,
            totalTrades: this.tradeHistory.length,
            balance: this.virtualBalance
        };
    }

    // Sanal bakiye sıfırlama
    resetBalance() {
        this.virtualBalance = {
            USDT: 10000, // 10k başlangıç bakiyesi
            BTC: 0,
            ETH: 0,
            BNB: 0,
            DOT: 0,
            ADA: 0,
            AVAX: 0,
            LINK: 0,
            ATOM: 0,
            ICP: 0,
            VET: 0,
            FTM: 0,
            POL: 0
        };
        this.tradeHistory = [];
        this.saveData(); // Veriyi kaydet
        console.log('🔄 Sanal bakiye sıfırlandı!');
        console.log(`💰 Yeni başlangıç bakiyesi: $30,000 USDT`);
        console.log('📊 Kar/zarar: $0 (sıfırlandı)');
        console.log('📈 Başarı oranı: 0% (sıfırlandı)');
    }

    // Bakiye ekleme
    addBalance(currency, amount) {
        this.virtualBalance[currency] = (this.virtualBalance[currency] || 0) + amount;
        console.log(`💰 ${amount} ${currency} eklendi`);
    }

    // İşlem geçmişi alma
    getTradeHistory() {
        return this.tradeHistory;
    }

    // Açık pozisyonlar
    async getOpenPositions() {
        const positions = [];
        for (const [currency, amount] of Object.entries(this.virtualBalance)) {
            if (currency !== 'USDT' && amount > 0) {
                try {
                    const price = await this.getCurrentPrice(currency + '/USDT');
                    const value = amount * (price || 0);
                    positions.push({
                        currency,
                        amount,
                        value: isNaN(value) ? 0 : value
                    });
                } catch (error) {
                    console.error(`${currency} pozisyon değeri hesaplanamadı:`, error.message);
                    positions.push({
                        currency,
                        amount,
                        value: 0
                    });
                }
            }
        }
        return positions;
    }

    // Risk analizi
    async getRiskAnalysis() {
        const totalValue = await this.calculateTotalValue();
        const safeTotalValue = isNaN(totalValue) ? this.virtualBalance.USDT : totalValue;
        const usdtPercentage = safeTotalValue > 0 ? (this.virtualBalance.USDT / safeTotalValue) * 100 : 100;
        
        return {
            totalValue: safeTotalValue,
            usdtPercentage: isNaN(usdtPercentage) ? 100 : usdtPercentage,
            diversification: isNaN(usdtPercentage) ? 0 : 100 - usdtPercentage,
            riskLevel: usdtPercentage > 80 ? 'DÜŞÜK' : usdtPercentage > 50 ? 'ORTA' : 'YÜKSEK',
            recommendation: usdtPercentage > 80 ? 'Daha fazla çeşitlendirme yapın' : 'Risk seviyesi uygun'
        };
    }

    // Test fonksiyonu - Trading stratejisini manuel olarak çalıştır
    async runManualTest() {
        console.log('\n🧪 MANUEL TRADING TESTİ BAŞLATILIYOR...');
        console.log('='.repeat(50));
        
        // Mevcut durumu göster
        const balance = await this.getBalance();
        console.log(`💰 Mevcut USDT: $${balance.availableBalance.toFixed(2)}`);
        console.log(`📊 Toplam değer: $${balance.totalValue.toFixed(2)}`);
        console.log(`📈 Kar/Zarar: $${balance.totalPnL.toFixed(2)}`);
        
        // Trading'i manuel olarak çalıştır
        await this.runPaperTradingStrategy();
        
        // Test sonrası durumu göster
        const newBalance = await this.getBalance();
        console.log('\n📊 TEST SONRASI DURUM:');
        console.log(`💰 Yeni USDT: $${newBalance.availableBalance.toFixed(2)}`);
        console.log(`📊 Yeni toplam değer: $${newBalance.totalValue.toFixed(2)}`);
        console.log(`📈 Yeni kar/zarar: $${newBalance.totalPnL.toFixed(2)}`);
        console.log(`🔄 Toplam işlem sayısı: ${this.tradeHistory.length}`);
        
        return {
            before: balance,
            after: newBalance,
            tradeCount: this.tradeHistory.length
        };
    }

    // Detaylı portföy raporu
    async getDetailedPortfolioReport() {
        console.log('\n📊 DETAYLI PORTFÖY RAPORU');
        console.log('='.repeat(50));
        
        const balance = await this.getBalance();
        const positions = await this.getOpenPositions();
        const riskAnalysis = await this.getRiskAnalysis();
        
        console.log(`💰 USDT Bakiye: $${this.virtualBalance.USDT.toFixed(2)}`);
        console.log(`📊 Toplam Değer: $${balance.totalValue.toFixed(2)}`);
        console.log(`📈 Toplam Kar/Zarar: $${balance.totalPnL.toFixed(2)} (${((balance.totalPnL/10000)*100).toFixed(2)}%)`);
        console.log(`🔄 Toplam İşlem: ${this.tradeHistory.length}`);
        
        console.log('\n📈 AÇIK POZİSYONLAR:');
        for (const position of positions) {
            const percentage = ((position.value / balance.totalValue) * 100).toFixed(2);
            console.log(`  ${position.currency}: ${position.amount.toFixed(6)} ($${position.value.toFixed(2)} - %${percentage})`);
        }
        
        console.log('\n⚖️ RİSK ANALİZİ:');
        console.log(`  Risk Seviyesi: ${riskAnalysis.riskLevel}`);
        console.log(`  USDT Oranı: %${riskAnalysis.usdtPercentage.toFixed(2)}`);
        console.log(`  Çeşitlendirme: %${riskAnalysis.diversification.toFixed(2)}`);
        console.log(`  Öneri: ${riskAnalysis.recommendation}`);
        
        // Son 5 işlemi göster
        console.log('\n📝 SON İŞLEMLER:');
        const recentTrades = this.tradeHistory.slice(-5);
        for (const trade of recentTrades) {
            const date = new Date(trade.timestamp).toLocaleString('tr-TR');
            console.log(`  ${trade.side} ${trade.symbol}: ${trade.amount.toFixed(6)} @ $${trade.price} (${date})`);
        }
        
        return {
            balance,
            positions,
            riskAnalysis,
            recentTrades: recentTrades
        };
    }

    // Bakiye sıfırlama (test amaçlı)
    resetBalanceForTesting() {
        console.log('\n🔄 TEST AMAÇLI BAKİYE SIFIRLAMA...');
        const oldBalance = { ...this.virtualBalance };
        
        this.virtualBalance = {
            USDT: 10000, // 10k başlangıç bakiyesi
            BTC: 0,
            ETH: 0,
            BNB: 0,
            DOT: 0,
            ADA: 0,
            AVAX: 0,
            LINK: 0,
            ATOM: 0,
            ICP: 0,
            VET: 0,
            FTM: 0,
            POL: 0
        };
        
        console.log(`💰 Eski USDT: $${oldBalance.USDT.toFixed(2)} → Yeni USDT: $${this.virtualBalance.USDT}`);
        console.log('🎮 Tüm crypto pozisyonlar temizlendi');
        console.log(`💰 Yeni başlangıç bakiyesi: $30,000 USDT`);
        
        // İşlem geçmişini temizle (isteğe bağlı)
        this.tradeHistory = [];
        console.log('📝 İşlem geçmişi temizlendi');
        
        this.saveData();
        console.log('✅ Veriler kaydedildi');
        
        return this.virtualBalance;
    }

    // Portföy dengeleme - Büyük pozisyonların bir kısmını sat
    async rebalancePortfolio() {
        console.log('\n⚖️ PORTFÖY DENGELEME BAŞLATILIYOR...');
        console.log('='.repeat(50));
        
        const positions = await this.getOpenPositions();
        const totalValue = await this.calculateTotalValue();
        
        console.log(`💰 Mevcut USDT: $${this.virtualBalance.USDT.toFixed(2)}`);
        console.log(`📊 Toplam portföy değeri: $${totalValue.toFixed(2)}`);
        
        // USDT oranı %20'nin altındaysa dengeleme yap
        const usdtPercentage = (this.virtualBalance.USDT / totalValue) * 100;
        console.log(`📈 USDT oranı: %${usdtPercentage.toFixed(2)}`);
        
        if (usdtPercentage < 20) {
            console.log('⚠️ USDT oranı düşük, bazı pozisyonlar satılacak...');
            
            // En büyük pozisyonları sırala
            positions.sort((a, b) => b.value - a.value);
            
            let totalSold = 0;
            for (const position of positions.slice(0, 3)) { // İlk 3 büyük pozisyon
                if (position.value > 200) { // $200'den büyük pozisyonlar
                    const sellPercentage = 0.3; // %30'unu sat
                    const sellAmount = position.amount * sellPercentage;
                    const pair = `${position.currency}/USDT`;
                    
                    console.log(`🔴 ${pair} pozisyonunun %30'u satılıyor...`);
                    console.log(`  Satılacak: ${sellAmount.toFixed(6)} ${position.currency}`);
                    console.log(`  Tahmini değer: $${(position.value * sellPercentage).toFixed(2)}`);
                    
                    try {
                        await this.executePaperTrade(pair, 'SELL', sellAmount);
                        totalSold += position.value * sellPercentage;
                        console.log(`✅ ${pair} satışı tamamlandı`);
                    } catch (error) {
                        console.error(`❌ ${pair} satış hatası:`, error.message);
                    }
                }
            }
            
            console.log(`\n💰 Toplam satış değeri: ~$${totalSold.toFixed(2)}`);
            console.log(`💰 Yeni USDT bakiye: $${this.virtualBalance.USDT.toFixed(2)}`);
            
        } else {
            console.log('✅ Portföy dengeli, dengeleme gerekmiyor');
        }
        
        return {
            oldUSDT: this.virtualBalance.USDT,
            newUSDT: this.virtualBalance.USDT,
            rebalanced: usdtPercentage < 20
        };
    }

    // Manuel satış fonksiyonu
    async forceSellPosition(symbol, percentage = 50) {
        console.log(`\n🔴 MANUEL SATIŞ: ${symbol}`);
        console.log('='.repeat(30));
        
        const baseCurrency = symbol.split('/')[0];
        const currentAmount = this.virtualBalance[baseCurrency] || 0;
        
        if (currentAmount <= 0) {
            console.log(`❌ ${baseCurrency} pozisyonu bulunamadı`);
            return null;
        }
        
        const sellAmount = currentAmount * (percentage / 100);
        const currentPrice = await this.getCurrentPrice(symbol);
        const estimatedValue = sellAmount * currentPrice;
        
        console.log(`💰 Mevcut ${baseCurrency}: ${currentAmount.toFixed(6)}`);
        console.log(`💰 Satılacak miktar: ${sellAmount.toFixed(6)} (%${percentage})`);
        console.log(`💰 Tahmini fiyat: $${currentPrice}`);
        console.log(`💰 Tahmini değer: $${estimatedValue.toFixed(2)}`);
        
        try {
            const trade = await this.executePaperTrade(symbol, 'SELL', sellAmount);
            console.log(`✅ Satış başarılı! Trade ID: ${trade.id}`);
            console.log(`💰 Yeni USDT bakiye: $${this.virtualBalance.USDT.toFixed(2)}`);
            return trade;
        } catch (error) {
            console.error(`❌ Satış hatası:`, error.message);
            return null;
        }
    }

    // Hızlı test fonksiyonu - Trading'i aktifleştir ve test et
    async quickTest() {
        console.log('\n🚀 HIZLI TEST BAŞLATILIYOR...');
        console.log('='.repeat(40));
        
        // Trading'i aktifleştir
        this.tradingRunning = true;
        this.saveData();
        console.log('✅ Trading aktifleştirildi');
        
        // Mevcut durumu göster
        const balance = await this.getBalance();
        console.log(`💰 USDT: $${balance.availableBalance.toFixed(2)}`);
        console.log(`📊 Toplam: $${balance.totalValue.toFixed(2)}`);
        
        // Eğer USDT az ise dengeleme yap
        if (balance.availableBalance < 1500) { // 30K'nın %5'i
            console.log('⚖️ USDT düşük, portföy dengeleniyor...');
            await this.rebalancePortfolio();
        }
        
        // Trading stratejisi çalıştır
        console.log('\n🎮 Trading stratejisi test ediliyor...');
        await this.runPaperTradingStrategy();
        
        // Sonuçları göster
        const newBalance = await this.getBalance();
        console.log('\n📊 TEST SONUÇLARI:');
        console.log(`💰 USDT: $${balance.availableBalance.toFixed(2)} → $${newBalance.availableBalance.toFixed(2)}`);
        console.log(`📊 Toplam: $${balance.totalValue.toFixed(2)} → $${newBalance.totalValue.toFixed(2)}`);
        console.log(`🔄 İşlem sayısı: ${this.tradeHistory.length}`);
        
        return {
            before: balance,
            after: newBalance,
            trades: this.tradeHistory.length
        };
    }

    // ===== STOP LOSS / TAKE PROFIT SİSTEMİ =====

    // Stop Loss emri oluştur
    async createStopLossOrder(symbol, triggerPrice, amount, orderType = 'market') {
        const order = {
            id: `sl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol: symbol,
            type: 'STOP_LOSS',
            triggerPrice: triggerPrice,
            amount: amount,
            orderType: orderType, // 'market' veya 'limit'
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            executedAt: null,
            executedPrice: null
        };

        this.stopLossOrders.push(order);
        this.saveData();
        
        console.log(`🛑 Stop Loss emri oluşturuldu: ${symbol} @ $${triggerPrice}`);
        console.log(`   Miktar: ${amount} | Tip: ${orderType}`);
        
        return order;
    }

    // Take Profit emri oluştur
    async createTakeProfitOrder(symbol, triggerPrice, amount, orderType = 'market') {
        const order = {
            id: `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol: symbol,
            type: 'TAKE_PROFIT',
            triggerPrice: triggerPrice,
            amount: amount,
            orderType: orderType, // 'market' veya 'limit'
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            executedAt: null,
            executedPrice: null
        };

        this.takeProfitOrders.push(order);
        this.saveData();
        
        console.log(`🎯 Take Profit emri oluşturuldu: ${symbol} @ $${triggerPrice}`);
        console.log(`   Miktar: ${amount} | Tip: ${orderType}`);
        
        return order;
    }

    // Stop Loss/Take Profit emirlerini kontrol et
    async checkStopLossTakeProfit() {
        console.log('\n🔍 Stop Loss/Take Profit kontrol ediliyor...');
        
        let executedOrders = [];

        // Stop Loss emirlerini kontrol et
        for (let i = this.stopLossOrders.length - 1; i >= 0; i--) {
            const order = this.stopLossOrders[i];
            if (order.status !== 'ACTIVE') continue;

            try {
                const currentPrice = await this.getCurrentPrice(order.symbol);
                
                // Stop Loss tetiklendi mi? (fiyat trigger price'ın altına düştü)
                if (currentPrice <= order.triggerPrice) {
                    console.log(`🛑 STOP LOSS TETİKLENDİ: ${order.symbol}`);
                    console.log(`   Mevcut fiyat: $${currentPrice} | Trigger: $${order.triggerPrice}`);
                    
                    const executedOrder = await this.executeStopLossOrder(order, currentPrice);
                    if (executedOrder) {
                        executedOrders.push(executedOrder);
                        this.stopLossOrders.splice(i, 1); // Emri listeden kaldır
                        
                        if (executedOrder.action === 'cancelled') {
                            console.log(`🗑️ Cancelled Stop Loss emri kaldırıldı: ${order.symbol}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Stop Loss kontrol hatası (${order.symbol}):`, error.message);
            }
        }

        // Take Profit emirlerini kontrol et
        for (let i = this.takeProfitOrders.length - 1; i >= 0; i--) {
            const order = this.takeProfitOrders[i];
            if (order.status !== 'ACTIVE') continue;

            try {
                const currentPrice = await this.getCurrentPrice(order.symbol);
                
                // Take Profit tetiklendi mi? (fiyat trigger price'ın üstüne çıktı)
                if (currentPrice >= order.triggerPrice) {
                    console.log(`🎯 TAKE PROFIT TETİKLENDİ: ${order.symbol}`);
                    console.log(`   Mevcut fiyat: $${currentPrice} | Trigger: $${order.triggerPrice}`);
                    
                    const executedOrder = await this.executeTakeProfitOrder(order, currentPrice);
                    if (executedOrder) {
                        executedOrders.push(executedOrder);
                        this.takeProfitOrders.splice(i, 1); // Emri listeden kaldır
                    }
                }
            } catch (error) {
                console.error(`❌ Take Profit kontrol hatası (${order.symbol}):`, error.message);
            }
        }

        if (executedOrders.length > 0) {
            console.log(`✅ ${executedOrders.length} emir başarıyla çalıştırıldı`);
            this.saveData();
        } else {
            console.log('✅ Aktif Stop Loss/Take Profit emri bulunamadı');
        }

        return executedOrders;
    }

    // Stop Loss emrini çalıştır
    async executeStopLossOrder(order, currentPrice) {
        try {
            const baseCurrency = order.symbol.split('/')[0];
            const availableAmount = this.virtualBalance[baseCurrency] || 0;
            
            if (availableAmount < order.amount) {
                console.log(`⚠️ Yetersiz ${baseCurrency} miktarı: ${availableAmount} < ${order.amount}`);
                console.log(`🗑️ Geçersiz Stop Loss emri kaldırılıyor: ${order.symbol}`);
                
                // Emri iptal et
                order.status = 'CANCELLED';
                order.cancelledAt = new Date().toISOString();
                order.cancelReason = 'Insufficient Balance';
                
                return {
                    order: order,
                    action: 'cancelled',
                    reason: 'insufficient_balance'
                };
            }

            // Trade'i çalıştır
            const trade = await this.executePaperTrade(order.symbol, 'SELL', order.amount, currentPrice);
            
            // Emri güncelle
            order.status = 'EXECUTED';
            order.executedAt = new Date().toISOString();
            order.executedPrice = currentPrice;
            
            console.log(`✅ Stop Loss çalıştırıldı: ${order.symbol} @ $${currentPrice}`);
            console.log(`   Satış miktarı: ${order.amount} | Değer: $${(order.amount * currentPrice).toFixed(2)}`);
            
            return {
                order: order,
                trade: trade,
                type: 'STOP_LOSS'
            };
        } catch (error) {
            console.error(`❌ Stop Loss çalıştırma hatası:`, error.message);
            return null;
        }
    }

    // Take Profit emrini çalıştır
    async executeTakeProfitOrder(order, currentPrice) {
        try {
            const baseCurrency = order.symbol.split('/')[0];
            const availableAmount = this.virtualBalance[baseCurrency] || 0;
            
            if (availableAmount < order.amount) {
                console.log(`⚠️ Yetersiz ${baseCurrency} miktarı: ${availableAmount} < ${order.amount}`);
                return null;
            }

            // Trade'i çalıştır
            const trade = await this.executePaperTrade(order.symbol, 'SELL', order.amount, currentPrice);
            
            // Emri güncelle
            order.status = 'EXECUTED';
            order.executedAt = new Date().toISOString();
            order.executedPrice = currentPrice;
            
            console.log(`✅ Take Profit çalıştırıldı: ${order.symbol} @ $${currentPrice}`);
            console.log(`   Satış miktarı: ${order.amount} | Değer: $${(order.amount * currentPrice).toFixed(2)}`);
            
            return {
                order: order,
                trade: trade,
                type: 'TAKE_PROFIT'
            };
        } catch (error) {
            console.error(`❌ Take Profit çalıştırma hatası:`, error.message);
            return null;
        }
    }

    // Aktif Stop Loss emirlerini getir
    getActiveStopLossOrders() {
        return this.stopLossOrders.filter(order => order.status === 'ACTIVE');
    }

    // Aktif Take Profit emirlerini getir
    getActiveTakeProfitOrders() {
        return this.takeProfitOrders.filter(order => order.status === 'ACTIVE');
    }

    // Emri iptal et
    async cancelOrder(orderId) {
        // Stop Loss emirlerinde ara
        const stopLossIndex = this.stopLossOrders.findIndex(order => order.id === orderId);
        if (stopLossIndex !== -1) {
            const order = this.stopLossOrders[stopLossIndex];
            order.status = 'CANCELLED';
            this.stopLossOrders.splice(stopLossIndex, 1);
            this.saveData();
            console.log(`❌ Stop Loss emri iptal edildi: ${order.symbol}`);
            return order;
        }

        // Take Profit emirlerinde ara
        const takeProfitIndex = this.takeProfitOrders.findIndex(order => order.id === orderId);
        if (takeProfitIndex !== -1) {
            const order = this.takeProfitOrders[takeProfitIndex];
            order.status = 'CANCELLED';
            this.takeProfitOrders.splice(takeProfitIndex, 1);
            this.saveData();
            console.log(`❌ Take Profit emri iptal edildi: ${order.symbol}`);
            return order;
        }

        console.log(`❌ Emir bulunamadı: ${orderId}`);
        return null;
    }

    // Otomatik Stop Loss/Take Profit ayarları
    async setAutoStopLossTakeProfit(symbol, buyPrice, amount, stopLossPercentage = 5, takeProfitPercentage = 10) {
        const stopLossPrice = buyPrice * (1 - stopLossPercentage / 100);
        const takeProfitPrice = buyPrice * (1 + takeProfitPercentage / 100);
        
        console.log(`\n🛡️ Otomatik Risk Yönetimi: ${symbol}`);
        console.log(`   Alış fiyatı: $${buyPrice}`);
        console.log(`   Stop Loss: $${stopLossPrice.toFixed(4)} (-${stopLossPercentage}%)`);
        console.log(`   Take Profit: $${takeProfitPrice.toFixed(4)} (+${takeProfitPercentage}%)`);
        
        // Stop Loss emri oluştur
        await this.createStopLossOrder(symbol, stopLossPrice, amount);
        
        // Take Profit emri oluştur
        await this.createTakeProfitOrder(symbol, takeProfitPrice, amount);
        
        return {
            stopLoss: { price: stopLossPrice, percentage: stopLossPercentage },
            takeProfit: { price: takeProfitPrice, percentage: takeProfitPercentage }
        };
    }

    // Portföy varlıklarını getir
    async getHoldings() {
        try {
            const holdings = [];
            
            for (const [currency, amount] of Object.entries(this.virtualBalance)) {
                if (currency === 'USDT') continue; // USDT'yi atla
                if (amount <= 0) continue; // Sıfır bakiyeleri atla
                
                try {
                    const currentPrice = await this.getCurrentPrice(`${currency}/USDT`);
                    const value = amount * currentPrice;
                    const pnl = 0; // Basitlik için PnL 0 olarak ayarlandı
                    
                    holdings.push({
                        symbol: currency,
                        amount: amount,
                        price: currentPrice,
                        value: value,
                        pnl: pnl
                    });
                } catch (error) {
                    console.error(`${currency} fiyatı alınamadı:`, error.message);
                    holdings.push({
                        symbol: currency,
                        amount: amount,
                        price: 0,
                        value: 0,
                        pnl: 0
                    });
                }
            }
            
            return holdings;
        } catch (error) {
            console.error('Portföy varlıkları alınamadı:', error.message);
            return [];
        }
    }

    // Mevcut sinyal durumlarını getir
    async getCurrentSignals() {
        try {
            const signals = [];
            const tradingEngine = require('./tradingEngine');
            const pairs = tradingEngine.tradingPairs || ['BTC/USDT', 'ETH/USDT', 'DOT/USDT', 'POL/USDT', 'VET/USDT'];
            
            for (const pair of pairs.slice(0, 5)) { // İlk 5 coin için sinyal al
                try {
                    const marketData = await this.getMarketData(pair);
                    const indicators = this.calculateIndicators(marketData);
                    const signal = this.generateSignal(indicators);
                    
                    const signalData = {
                        symbol: pair,
                        signal: signal.signal,
                        confidence: Math.round(signal.confidence * 100),
                        price: indicators.currentPrice,
                        timestamp: new Date().toISOString(),
                        followLineData: {
                            trend: signal.followLineData ? signal.followLineData.trendDirection : 'UNKNOWN',
                            followLine: signal.followLineData ? signal.followLineData.followLine : null,
                            support: signal.followLineData ? signal.followLineData.support : null,
                            resistance: signal.followLineData ? signal.followLineData.resistance : null
                        }
                    };
                    
                    signals.push(signalData);
                    
                } catch (error) {
                    console.error(`${pair} sinyal hatası:`, error.message);
                    signals.push({
                        symbol: pair,
                        signal: 'ERROR',
                        confidence: 0,
                        price: 0,
                        timestamp: new Date().toISOString(),
                        error: error.message
                    });
                }
            }
            
            return signals;
        } catch (error) {
            console.error('Sinyal verileri alınamadı:', error.message);
            return [];
        }
    }

    // Geçersiz stop loss/take profit emirlerini temizle
    cleanupInvalidOrders() {
        try {
            console.log('🧹 Geçersiz emirler temizleniyor...');
            
            // Stop Loss emirlerini temizle
            const initialStopLossCount = this.stopLossOrders.length;
            this.stopLossOrders = this.stopLossOrders.filter(order => {
                const baseCurrency = order.symbol.split('/')[0];
                const availableAmount = this.virtualBalance[baseCurrency] || 0;
                
                // Yetersiz bakiye varsa emri kaldır
                if (availableAmount < order.amount) {
                    console.log(`🗑️ Geçersiz Stop Loss temizlendi: ${order.symbol} (${availableAmount} < ${order.amount})`);
                    return false;
                }
                
                // Aktif olmayan emirleri kaldır
                if (order.status !== 'ACTIVE') {
                    console.log(`🗑️ İnaktif Stop Loss temizlendi: ${order.symbol} (${order.status})`);
                    return false;
                }
                
                return true;
            });
            
            // Take Profit emirlerini temizle
            const initialTakeProfitCount = this.takeProfitOrders.length;
            this.takeProfitOrders = this.takeProfitOrders.filter(order => {
                const baseCurrency = order.symbol.split('/')[0];
                const availableAmount = this.virtualBalance[baseCurrency] || 0;
                
                // Yetersiz bakiye varsa emri kaldır
                if (availableAmount < order.amount) {
                    console.log(`🗑️ Geçersiz Take Profit temizlendi: ${order.symbol} (${availableAmount} < ${order.amount})`);
                    return false;
                }
                
                // Aktif olmayan emirleri kaldır
                if (order.status !== 'ACTIVE') {
                    console.log(`🗑️ İnaktif Take Profit temizlendi: ${order.symbol} (${order.status})`);
                    return false;
                }
                
                return true;
            });
            
            const removedStopLoss = initialStopLossCount - this.stopLossOrders.length;
            const removedTakeProfit = initialTakeProfitCount - this.takeProfitOrders.length;
            
            if (removedStopLoss > 0 || removedTakeProfit > 0) {
                console.log(`✅ ${removedStopLoss} Stop Loss ve ${removedTakeProfit} Take Profit emri temizlendi`);
                this.saveData(); // Değişiklikleri kaydet
            }
            
        } catch (error) {
            console.error('🚨 Emir temizleme hatası:', error.message);
        }
    }

    // WebSocket bağlantısını kapat
    cleanup() {
        try {
            if (this.binanceWS) {
                console.log('🔌 WebSocket bağlantısı kapatılıyor...');
                this.binanceWS.disconnect();
                this.wsConnected = false;
            }
        } catch (error) {
            console.error('🚨 Cleanup hatası:', error.message);
        }
    }
}

module.exports = new PaperTrading();