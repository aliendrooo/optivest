const ccxt = require('ccxt');
const { SMA, RSI, MACD } = require('technicalindicators');
const blockchainConfig = require('../config/blockchain');

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
            confidence = 0.6;
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
            confidence = 0.6;
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

class TradingEngine {
    constructor() {
        this.exchanges = {
            binance: new ccxt.binance({
                apiKey: process.env.BINANCE_API_KEY || '',
                secret: process.env.BINANCE_SECRET_KEY || '',
                sandbox: process.env.NODE_ENV !== 'production', // Development'ta sandbox kullan
                enableRateLimit: true,
                options: {
                    defaultType: 'spot'
                }
            })
        };
        
        // Follow Line stratejisi instance'ı
        this.followLineStrategy = new FollowLineStrategy();
        
        // Trading modu kontrolü - Sanal trading varsayılan
        this.isRealTrading = false; // Sanal trading için false
        console.log(`🔧 Trading Modu: SANAL (Gerçek fiyatlar + Sanal para)`);
        console.log('🎮 Sanal trading modu aktif - Gerçek para kullanılmıyor');
        console.log('📊 Gerçek fiyat verileri CoinGecko API\'den alınıyor');
        console.log('💰 Sanal bakiye: $10,000 USDT');
        console.log('🎯 Pine Script Follow Line Stratejisi aktif');
        
        // Tüm desteklenen coinler
        this.allSupportedPairs = [
            'BTC/USDT','ETH/USDT','BNB/USDT','ADA/USDT','SOL/USDT','DOT/USDT','DOGE/USDT','AVAX/USDT','LINK/USDT','POL/USDT',
            'XRP/USDT','LTC/USDT','UNI/USDT','ATOM/USDT','FTM/USDT','NEAR/USDT','ALGO/USDT','VET/USDT','ICP/USDT','FIL/USDT'
        ];
        
        // Kalıcı coin listesi dosyası
        this.coinListFile = 'selected_coins.json';
        this.tradingPairs = this.loadOrCreateCoinList();
        this.maxTradeAmount = parseFloat(process.env.MAX_TRADE_AMOUNT || '1000');
        this.stopLossPercentage = parseFloat(process.env.STOP_LOSS_PERCENTAGE || '5');
        this.takeProfitPercentage = parseFloat(process.env.TAKE_PROFIT_PERCENTAGE || '10');
        
        this.activeTrades = new Map();
        this.tradeHistory = [];
        
        // CoinGecko API için cache
        this.priceCache = new Map();
        this.lastPriceUpdate = 0;
        this.priceCacheTimeout = 300000; // 5 dakika (rate limit için)
        this.lastApiCall = 0;
        this.apiCallDelay = 1200; // 1.2 saniye bekleme (CoinGecko rate limit)
        
        // Follow Line trend geçmişi
        this.followLineHistory = new Map();
    }

    // Coin listesini yükle veya oluştur
    loadOrCreateCoinList() {
        const fs = require('fs');
        const path = require('path');
        
        try {
            // Dosya var mı kontrol et
            if (fs.existsSync(this.coinListFile)) {
                const data = fs.readFileSync(this.coinListFile, 'utf8');
                const coinList = JSON.parse(data);
                console.log(`📋 Kayıtlı coin listesi yüklendi: ${coinList.length} coin`);
                console.log(`🪙 Seçili coinler: ${coinList.join(', ')}`);
                return coinList;
            } else {
                // Yeni coin listesi oluştur
                const selectedCoins = this.selectRandomCoins(this.allSupportedPairs, 10);
                
                // Dosyaya kaydet
                fs.writeFileSync(this.coinListFile, JSON.stringify(selectedCoins, null, 2));
                console.log(`🎲 Yeni coin listesi oluşturuldu: ${selectedCoins.length} coin`);
                console.log(`🪙 Seçili coinler: ${selectedCoins.join(', ')}`);
                console.log(`💾 Coin listesi ${this.coinListFile} dosyasına kaydedildi`);
                return selectedCoins;
            }
        } catch (error) {
            console.error('❌ Coin listesi yüklenirken hata:', error.message);
            // Hata durumunda rastgele seç
            const fallbackCoins = this.selectRandomCoins(this.allSupportedPairs, 10);
            console.log(`🔄 Hata nedeniyle yeni coin listesi oluşturuldu: ${fallbackCoins.join(', ')}`);
            return fallbackCoins;
        }
    }

    // Rastgele coin seç
    selectRandomCoins(arr, n) {
        const shuffled = arr.slice().sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }

    // Coin listesini yeniden oluştur
    regenerateCoinList() {
        const fs = require('fs');
        
        try {
            const selectedCoins = this.selectRandomCoins(this.allSupportedPairs, 10);
            
            // Dosyaya kaydet
            fs.writeFileSync(this.coinListFile, JSON.stringify(selectedCoins, null, 2));
            
            // Mevcut listeyi güncelle
            this.tradingPairs = selectedCoins;
            
            console.log(`🔄 Coin listesi yeniden oluşturuldu: ${selectedCoins.length} coin`);
            console.log(`🪙 Yeni seçili coinler: ${selectedCoins.join(', ')}`);
            console.log(`💾 Yeni coin listesi ${this.coinListFile} dosyasına kaydedildi`);
            
            return selectedCoins;
        } catch (error) {
            console.error('❌ Coin listesi yeniden oluşturulurken hata:', error.message);
            return this.tradingPairs;
        }
    }

    // CoinGecko API'den coin fiyatlarını al
    async getCoinPrices(coins = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'dogecoin', 'avalanche-2', 'chainlink', 'polygon']) {
        try {
            const now = Date.now();
            
            // Cache kontrolü
            if (now - this.lastPriceUpdate < this.priceCacheTimeout) {
                return this.priceCache;
            }
            
            // Rate limiting kontrolü
            const timeSinceLastCall = now - this.lastApiCall;
            if (timeSinceLastCall < this.apiCallDelay) {
                const waitTime = this.apiCallDelay - timeSinceLastCall;
                console.log(`⏳ Rate limit için ${waitTime}ms bekleniyor...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            console.log('🔄 Coin fiyatları güncelleniyor...');
            this.lastApiCall = Date.now();
            
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`);
            
            if (!response.ok) {
                throw new Error(`CoinGecko API hatası: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache'i güncelle
            this.priceCache.clear();
            for (const [coinId, priceData] of Object.entries(data)) {
                this.priceCache.set(coinId, {
                    price: priceData.usd,
                    change_24h: priceData.usd_24h_change,
                    market_cap: priceData.usd_market_cap,
                    timestamp: now
                });
            }
            
            this.lastPriceUpdate = now;
            console.log('✅ Coin fiyatları güncellendi');
            
            return this.priceCache;
            
        } catch (error) {
            console.error('Coin fiyatları alınamadı:', error.message);
            
            // 429 hatası için özel mesaj
            if (error.message.includes('429')) {
                console.log('⚠️ Rate limit aşıldı, cache kullanılıyor');
            }
            
            // Cache'den eski verileri döndür
            if (this.priceCache.size > 0) {
                console.log('📊 Cache\'den eski fiyatlar kullanılıyor');
                return this.priceCache;
            }
            
            // Fallback veriler - Daha fazla coin
            const now = Date.now(); // now değişkenini tanımla
            const fallbackPrices = new Map();
            fallbackPrices.set('bitcoin', { price: 45000, change_24h: 0, market_cap: 850000000000, timestamp: now });
            fallbackPrices.set('ethereum', { price: 2800, change_24h: 0, market_cap: 350000000000, timestamp: now });
            fallbackPrices.set('binancecoin', { price: 320, change_24h: 0, market_cap: 50000000000, timestamp: now });
            fallbackPrices.set('cardano', { price: 0.45, change_24h: 0, market_cap: 15000000000, timestamp: now });
            fallbackPrices.set('solana', { price: 95, change_24h: 0, market_cap: 40000000000, timestamp: now });
            fallbackPrices.set('polkadot', { price: 6.5, change_24h: 0, market_cap: 8000000000, timestamp: now });
            fallbackPrices.set('dogecoin', { price: 0.08, change_24h: 0, market_cap: 12000000000, timestamp: now });
            fallbackPrices.set('avalanche-2', { price: 25, change_24h: 0, market_cap: 10000000000, timestamp: now });
            fallbackPrices.set('chainlink', { price: 15, change_24h: 0, market_cap: 8000000000, timestamp: now });
            fallbackPrices.set('polygon', { price: 0.7, change_24h: 0, market_cap: 7000000000, timestamp: now });
            
            return fallbackPrices;
        }
    }

    // Sanal trading için coin fiyatlarını al
    async getSyntheticPrices() {
        try {
            const prices = await this.getCoinPrices();
            const now = Date.now(); // now değişkenini tanımla
            
            const syntheticPrices = {
                'BTC/USDT': {
                    price: prices.get('bitcoin')?.price || 45000,
                    change_24h: prices.get('bitcoin')?.change_24h || 0,
                    volume: Math.random() * 1000000 + 500000,
                    high: (prices.get('bitcoin')?.price || 45000) * 1.02,
                    low: (prices.get('bitcoin')?.price || 45000) * 0.98
                },
                'ETH/USDT': {
                    price: prices.get('ethereum')?.price || 2800,
                    change_24h: prices.get('ethereum')?.change_24h || 0,
                    volume: Math.random() * 800000 + 300000,
                    high: (prices.get('ethereum')?.price || 2800) * 1.02,
                    low: (prices.get('ethereum')?.price || 2800) * 0.98
                },
                'BNB/USDT': {
                    price: prices.get('binancecoin')?.price || 320,
                    change_24h: prices.get('binancecoin')?.change_24h || 0,
                    volume: Math.random() * 500000 + 200000,
                    high: (prices.get('binancecoin')?.price || 320) * 1.02,
                    low: (prices.get('binancecoin')?.price || 320) * 0.98
                },
                'ADA/USDT': {
                    price: prices.get('cardano')?.price || 0.45,
                    change_24h: prices.get('cardano')?.change_24h || 0,
                    volume: Math.random() * 300000 + 100000,
                    high: (prices.get('cardano')?.price || 0.45) * 1.02,
                    low: (prices.get('cardano')?.price || 0.45) * 0.98
                },
                'SOL/USDT': {
                    price: prices.get('solana')?.price || 95,
                    change_24h: prices.get('solana')?.change_24h || 0,
                    volume: Math.random() * 400000 + 150000,
                    high: (prices.get('solana')?.price || 95) * 1.02,
                    low: (prices.get('solana')?.price || 95) * 0.98
                },
                'DOT/USDT': {
                    price: prices.get('polkadot')?.price || 6.5,
                    change_24h: prices.get('polkadot')?.change_24h || 0,
                    volume: Math.random() * 200000 + 80000,
                    high: (prices.get('polkadot')?.price || 6.5) * 1.02,
                    low: (prices.get('polkadot')?.price || 6.5) * 0.98
                },
                'DOGE/USDT': {
                    price: prices.get('dogecoin')?.price || 0.08,
                    change_24h: prices.get('dogecoin')?.change_24h || 0,
                    volume: Math.random() * 600000 + 200000,
                    high: (prices.get('dogecoin')?.price || 0.08) * 1.02,
                    low: (prices.get('dogecoin')?.price || 0.08) * 0.98
                },
                'AVAX/USDT': {
                    price: prices.get('avalanche-2')?.price || 25,
                    change_24h: prices.get('avalanche-2')?.change_24h || 0,
                    volume: Math.random() * 250000 + 100000,
                    high: (prices.get('avalanche-2')?.price || 25) * 1.02,
                    low: (prices.get('avalanche-2')?.price || 25) * 0.98
                },
                'LINK/USDT': {
                    price: prices.get('chainlink')?.price || 15,
                    change_24h: prices.get('chainlink')?.change_24h || 0,
                    volume: Math.random() * 180000 + 70000,
                    high: (prices.get('chainlink')?.price || 15) * 1.02,
                    low: (prices.get('chainlink')?.price || 15) * 0.98
                },
                'POL/USDT': {
                    price: prices.get('polygon')?.price || 0.7,
                    change_24h: prices.get('polygon')?.change_24h || 0,
                    volume: Math.random() * 220000 + 90000,
                    high: (prices.get('polygon')?.price || 0.7) * 1.02,
                    low: (prices.get('polygon')?.price || 0.7) * 0.98
                },
                'FTM/USDT': {
                    price: 0.3 + Math.sin(now / 20000) * 0.1,
                    change_24h: (Math.random() - 0.5) * 10,
                    volume: Math.random() * 150000 + 50000,
                    high: 0.35,
                    low: 0.25
                },
                'VET/USDT': {
                    price: 0.025 + Math.sin(now / 25000) * 0.005,
                    change_24h: (Math.random() - 0.5) * 8,
                    volume: Math.random() * 300000 + 100000,
                    high: 0.028,
                    low: 0.022
                },
                'ICP/USDT': {
                    price: 5.5 + Math.sin(now / 30000) * 0.5,
                    change_24h: (Math.random() - 0.5) * 12,
                    volume: Math.random() * 180000 + 80000,
                    high: 6.2,
                    low: 4.8
                },
                'ATOM/USDT': {
                    price: 4.6 + Math.sin(now / 35000) * 0.3,
                    change_24h: (Math.random() - 0.5) * 9,
                    volume: Math.random() * 200000 + 90000,
                    high: 5.1,
                    low: 4.1
                }
            };
            
            return syntheticPrices;
            
        } catch (error) {
            console.error('Sanal fiyatlar alınamadı:', error.message);
            const now = Date.now();
            return {
                'BTC/USDT': { price: 45000, change_24h: 0, volume: 750000, high: 45900, low: 44100 },
                'ETH/USDT': { price: 2800, change_24h: 0, volume: 550000, high: 2856, low: 2744 },
                'BNB/USDT': { price: 320, change_24h: 0, volume: 350000, high: 326.4, low: 313.6 },
                'ADA/USDT': { price: 0.45, change_24h: 0, volume: 200000, high: 0.459, low: 0.441 },
                'SOL/USDT': { price: 95, change_24h: 0, volume: 275000, high: 96.9, low: 93.1 },
                'DOT/USDT': { price: 6.5, change_24h: 0, volume: 140000, high: 6.63, low: 6.37 },
                'DOGE/USDT': { price: 0.08, change_24h: 0, volume: 400000, high: 0.0816, low: 0.0784 },
                'AVAX/USDT': { price: 25, change_24h: 0, volume: 175000, high: 25.5, low: 24.5 },
                'LINK/USDT': { price: 15, change_24h: 0, volume: 125000, high: 15.3, low: 14.7 },
                'POL/USDT': { price: 0.7, change_24h: 0, volume: 155000, high: 0.714, low: 0.686 },
                'FTM/USDT': { price: 0.3, change_24h: 0, volume: 100000, high: 0.35, low: 0.25 },
                'VET/USDT': { price: 0.025, change_24h: 0, volume: 250000, high: 0.028, low: 0.022 },
                'ICP/USDT': { price: 5.5, change_24h: 0, volume: 130000, high: 6.2, low: 4.8 },
                'ATOM/USDT': { price: 4.6, change_24h: 0, volume: 145000, high: 5.1, low: 4.1 }
            };
        }
    }

    async getMarketData(exchange, symbol, timeframe = '1h', limit = 100) {
        try {
            const exchangeInstance = this.exchanges[exchange];
            
            // Rate limiting için bekleme
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log(`📊 ${symbol} için gerçek market verileri alınıyor...`);
            const ohlcv = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, limit);
            
            if (!ohlcv || ohlcv.length === 0) {
                throw new Error('Market verisi alınamadı');
            }
            
            const marketData = {
                symbol,
                exchange,
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
            
            console.log(`✅ ${symbol} market verisi alındı: ${marketData.data.length} veri noktası`);
            return marketData;
            
        } catch (error) {
            console.error(`Market data alınamadı (${symbol}): ${error.message}`);
            
            // Fallback olarak synthetic data kullan
            console.log(`🔄 ${symbol} için synthetic data kullanılıyor...`);
            return this.getSyntheticMarketData(symbol, timeframe, limit);
        }
    }

    // Synthetic market data fallback
    getSyntheticMarketData(symbol, timeframe = '1h', limit = 100) {
        const data = [];
        const now = Date.now();
        
        // Dinamik base price kullan
        let basePrice = this.getCurrentPrice(symbol);
        
        for (let i = limit - 1; i >= 0; i--) {
            const timestamp = now - (i * 60 * 60 * 1000); // 1 saat aralıklarla
            
            // Trend oluştur
            const trend = Math.sin(i / 10) * 0.05; // Dalgalı trend
            const volatility = 0.03; // %3 volatilite
            
            const open = basePrice * (1 + trend + (Math.random() - 0.5) * volatility);
            const close = open * (1 + (Math.random() - 0.5) * volatility);
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);
            const volume = 500000 + Math.random() * 1000000;
            
            data.push({
                timestamp,
                open,
                high,
                low,
                close,
                volume
            });
            
            // Bir sonraki mum için base price'ı güncelle
            basePrice = close;
        }
        
        return {
            symbol,
            exchange: 'synthetic',
            timeframe,
            data
        };
    }

    calculateIndicators(marketData) {
        const closes = marketData.data.map(candle => candle.close);
        const volumes = marketData.data.map(candle => candle.volume);

        // SMA hesaplama
        const sma20 = SMA.calculate({ period: 20, values: closes });
        const sma50 = SMA.calculate({ period: 50, values: closes });

        // RSI hesaplama
        const rsi = RSI.calculate({ period: 14, values: closes });

        // MACD hesaplama
        const macd = MACD.calculate({
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            values: closes
        });

        // Follow Line stratejisi hesaplama
        const followLineResult = this.followLineStrategy.calculateFollowLine(marketData.data);

        return {
            sma20: sma20[sma20.length - 1],
            sma50: sma50[sma50.length - 1],
            rsi: rsi[rsi.length - 1],
            macd: macd[macd.length - 1],
            currentPrice: closes[closes.length - 1],
            followLine: followLineResult
        };
    }

    // Follow Line stratejisi ile sinyal üretme
    generateFollowLineSignal(marketData, symbol) {
        console.log(`🎯 === PINE SCRIPT FOLLOW LINE STRATEJİSİ ===`);
        console.log(`📊 Symbol: ${symbol}`);
        
        const followLineResult = this.followLineStrategy.calculateFollowLine(marketData.data);
        
        if (!followLineResult.followLine) {
            console.log(`❌ ${symbol} için yeterli veri yok`);
            return {
                signal: 'HOLD',
                confidence: 0,
                trend: 'NEUTRAL',
                followLine: null
            };
        }

        console.log(`💹 Trend Direction: ${followLineResult.trend}`);
        console.log(`📍 Follow Line: $${followLineResult.followLine.toFixed(4)}`);
        console.log(`🔵 Support Level: $${followLineResult.support.toFixed(4)}`);
        console.log(`🔴 Resistance Level: $${followLineResult.resistance.toFixed(4)}`);
        console.log(`📈 BB Signal: ${followLineResult.bbSignal}`);
        console.log(`⚡ ATR Value: $${followLineResult.atrValue.toFixed(4)}`);
        
        if (followLineResult.bollingerBands) {
            console.log(`📊 Bollinger Bands: Upper=$${followLineResult.bollingerBands.upper.toFixed(2)}, Lower=$${followLineResult.bollingerBands.lower.toFixed(2)}, Middle=$${followLineResult.bollingerBands.middle.toFixed(2)}`);
        }

        // Trend geçmişini kontrol et
        const previousTrend = this.followLineHistory.get(symbol);
        const trendChange = this.followLineStrategy.checkTrendChange(followLineResult.trend, previousTrend);
        
        // Trend geçmişini güncelle
        this.followLineHistory.set(symbol, followLineResult.trend);

        let finalSignal = followLineResult.signal;
        let confidence = followLineResult.confidence;

        // Trend değişimi varsa sinyali güçlendir
        if (trendChange !== 'HOLD') {
            finalSignal = trendChange;
            confidence = Math.min(confidence + 0.2, 1.0);
            console.log(`🔄 Trend değişimi tespit edildi: ${trendChange}`);
        }

        console.log(`🎯 Pine Script Follow Line Sinyal: ${finalSignal} (Güven: ${(confidence * 100).toFixed(1)}%)`);

        return {
            signal: finalSignal,
            confidence,
            trend: followLineResult.trend,
            followLine: followLineResult.followLine,
            support: followLineResult.support,
            resistance: followLineResult.resistance,
            atrValue: followLineResult.atrValue,
            bbSignal: followLineResult.bbSignal
        };
    }

    generateSignal(indicators) {
        const { sma20, sma50, rsi, macd, currentPrice } = indicators;
        
        let signal = 'HOLD';
        let confidence = 0;

        // Trend analizi
        const trend = sma20 > sma50 ? 'BULLISH' : 'BEARISH';
        
        // RSI analizi - Daha geniş aralıklar ve dengeli yaklaşım
        if (rsi < 45) { // 40'dan 45'e çıkardım
            signal = 'BUY';
            confidence += 0.3;
        } else if (rsi > 55) { // 60'dan 55'e düşürdüm
            signal = 'SELL';
            confidence += 0.3;
        }

        // MACD analizi - Daha hassas ve dengeli
        if (macd && macd.MACD > macd.signal) {
            if (signal === 'BUY') confidence += 0.2;
            else if (signal === 'HOLD') {
                signal = 'BUY';
                confidence += 0.2;
            }
        } else if (macd && macd.MACD < macd.signal) {
            if (signal === 'SELL') confidence += 0.2;
            else if (signal === 'HOLD') {
                signal = 'SELL';
                confidence += 0.2;
            }
        }

        // Trend ile uyum kontrolü - Daha az ağırlık
        if ((signal === 'BUY' && trend === 'BULLISH') || (signal === 'SELL' && trend === 'BEARISH')) {
            confidence += 0.15; // 0.2'den 0.15'e düşürdüm
        }

        // Eğer hiç sinyal yoksa rastgele sinyal üret (test amaçlı)
        if (signal === 'HOLD' && confidence < 0.1) {
            const random = Math.random();
            if (random > 0.6) {
                signal = 'BUY';
                confidence = 0.25;
            } else if (random < 0.4) {
                signal = 'SELL';
                confidence = 0.25;
            }
        }

        // Minimum güven değeri ekle
        if (confidence < 0.15) {
            confidence = 0.15;
        }

        return {
            signal,
            confidence: Math.min(confidence, 1),
            indicators,
            timestamp: new Date().toISOString()
        };
    }

    async executeTrade(exchange, symbol, side, amount, price = null) {
        try {
            console.log(`🚀 ${symbol} için ${side} trade başlatılıyor...`);
            console.log(`💰 Miktar: ${amount}, Fiyat: ${price || 'Market'}`);
            console.log(`🎮 Sanal Trading Modu - Gerçek para kullanılmıyor`);
            
            // Sanal trading için direkt synthetic trade yap
            return this.executeSyntheticTrade(symbol, side, amount, price);

        } catch (error) {
            console.error(`Trade hatası: ${error.message}`);
            throw error;
        }
    }

    // Sanal trade simülasyonu
    executeSyntheticTrade(symbol, side, amount, price = null) {
        if (amount < 0.001) {
            console.log(`❗ Trade miktarı çok küçük (${amount}), trade yapılmadı.`);
            return null;
        }
        const currentPrice = price || this.getCurrentPrice(symbol);
        const trade = {
            id: `synthetic_${Date.now()}`,
            symbol,
            exchange: 'synthetic',
            side,
            amount,
            price: currentPrice,
            status: 'closed',
            timestamp: new Date().toISOString(),
            stopLoss: side === 'BUY' ? 
                currentPrice * (1 - this.stopLossPercentage / 100) : null,
            takeProfit: side === 'BUY' ? 
                currentPrice * (1 + this.takeProfitPercentage / 100) : null
        };

        this.tradeHistory.push(trade);
        console.log(`🎮 Sanal trade gerçekleştirildi: ${JSON.stringify(trade)}`);
        console.log(`📊 Toplam trade sayısı: ${this.tradeHistory.length}`);
        return trade;
    }

    // Mevcut fiyatı al (daha gerçekçi simülasyon)
    getCurrentPrice(symbol) {
        let basePrice;
        if (symbol.includes('BTC')) {
            basePrice = 45000 + Math.sin(Date.now() / 100000) * 2000; // BTC fiyat dalgalanması
        } else if (symbol.includes('ETH')) {
            basePrice = 2800 + Math.sin(Date.now() / 80000) * 150; // ETH fiyat dalgalanması
        } else if (symbol.includes('BNB')) {
            basePrice = 320 + Math.sin(Date.now() / 60000) * 20; // BNB fiyat dalgalanması
        } else if (symbol.includes('ADA')) {
            basePrice = 0.45 + Math.sin(Date.now() / 50000) * 0.05; // ADA fiyat dalgalanması
        } else if (symbol.includes('SOL')) {
            basePrice = 95 + Math.sin(Date.now() / 40000) * 5; // SOL fiyat dalgalanması
        } else if (symbol.includes('DOT')) {
            basePrice = 6.5 + Math.sin(Date.now() / 30000) * 0.5; // DOT fiyat dalgalanması
        } else if (symbol.includes('DOGE')) {
            basePrice = 0.08 + Math.sin(Date.now() / 20000) * 0.01; // DOGE fiyat dalgalanması
        } else if (symbol.includes('AVAX')) {
            basePrice = 25 + Math.sin(Date.now() / 15000) * 2; // AVAX fiyat dalgalanması
        } else if (symbol.includes('LINK')) {
            basePrice = 15 + Math.sin(Date.now() / 10000) * 1; // LINK fiyat dalgalanması
        } else if (symbol.includes('POL')) {
            basePrice = 0.7 + Math.sin(Date.now() / 8000) * 0.05; // POL fiyat dalgalanması
        } else {
            basePrice = 100 + Math.random() * 50;
        }
        
        // Rastgele dalgalanma ekle
        const volatility = 0.02; // %2 volatilite
        const randomChange = (Math.random() - 0.5) * volatility;
        
        return basePrice * (1 + randomChange);
    }

    async checkStopLossAndTakeProfit() {
        for (const [tradeId, trade] of this.activeTrades) {
            if (trade.status !== 'open') continue;

            try {
                const marketData = await this.getMarketData(trade.exchange, trade.symbol, '1m', 1);
                const currentPrice = marketData.data[0].close;

                // Stop Loss kontrolü
                if (trade.stopLoss && currentPrice <= trade.stopLoss) {
                    await this.executeTrade(trade.exchange, trade.symbol, 'SELL', trade.amount);
                    trade.status = 'closed';
                    trade.closeReason = 'stop_loss';
                }

                // Take Profit kontrolü
                if (trade.takeProfit && currentPrice >= trade.takeProfit) {
                    await this.executeTrade(trade.exchange, trade.symbol, 'SELL', trade.amount);
                    trade.status = 'closed';
                    trade.closeReason = 'take_profit';
                }

            } catch (error) {
                console.error(`Stop loss/take profit kontrolü hatası: ${error.message}`);
            }
        }
    }

    async runTradingStrategy() {
        console.log('🎮 Sanal trading stratejisi başlatılıyor...');

        for (const pair of this.tradingPairs) {
            try {
                console.log(`\n📊 ${pair} analiz ediliyor...`);
                
                // Market verilerini al (sanal modda)
                const marketData = this.getSyntheticMarketData(pair);
                
                // Follow Line stratejisi ile sinyal üret
                const followLineSignal = this.generateFollowLineSignal(marketData, pair);
                
                console.log(`📈 ${pair} için sinyal: ${followLineSignal.signal} (Güven: ${followLineSignal.confidence.toFixed(2)})`);
                console.log(`💰 Mevcut fiyat: $${followLineSignal.followLine?.toFixed(4) || 'N/A'}`);

                // Follow Line stratejisi ile trade kararı ver
                if (followLineSignal.confidence > 0.1) {
                    if (followLineSignal.signal === 'BUY') {
                        await this.executeFollowLineBuySignal(pair, followLineSignal);
                    } else if (followLineSignal.signal === 'SELL') {
                        await this.executeFollowLineSellSignal(pair, followLineSignal);
                    }
                } else {
                    console.log(`⏸️ ${pair} için yeterli güven yok (${followLineSignal.confidence.toFixed(2)})`);
                }

            } catch (error) {
                console.error(`❌ ${pair} için trading hatası: ${error.message}`);
            }
        }

        // Sanal trading için stop loss ve take profit kontrolü
        // await this.checkStopLossAndTakeProfit();
        
        console.log('✅ Sanal trading stratejisi tamamlandı\n');
    }

    // Follow Line Buy sinyali işleme
    async executeFollowLineBuySignal(symbol, signal) {
        try {
            console.log(`🟢 ${symbol} için Pine Script Follow Line BUY - Sanal trade başlatılıyor...`);
            
            // Mevcut pozisyonu kontrol et
            const currentPosition = this.getCurrentPosition(symbol);
            if (currentPosition && currentPosition.amount > 0) {
                console.log(`ℹ️ ${symbol} için zaten pozisyon var, yeni alım yapılmayacak`);
                return;
            }

            // Trade miktarını hesapla
            const currentPrice = this.getCurrentPrice(symbol);
            const availableUSDT = 10000; // Sanal bakiye
            const maxUSDT = availableUSDT * 0.1; // Maksimum %10
            const amount = maxUSDT / currentPrice;

            console.log(`🔍 DEBUG: BUY koşulları - USDT: ${availableUSDT}, maxUSDT: ${maxUSDT}, amount: ${amount}`);

            // Trade'i gerçekleştir
            const trade = this.executeSyntheticTrade(symbol, 'BUY', amount, currentPrice);
            
            if (trade) {
                // Stop Loss ve Take Profit emirleri oluştur
                this.createStopLossAndTakeProfit(symbol, trade, signal);
            }

        } catch (error) {
            console.error(`${symbol} BUY sinyali hatası:`, error.message);
        }
    }

    // Follow Line Sell sinyali işleme
    async executeFollowLineSellSignal(symbol, signal) {
        try {
            console.log(`🔴 ${symbol} için Pine Script Follow Line SELL - Pozisyon kontrol ediliyor...`);
            
            // Mevcut pozisyonu kontrol et
            const currentPosition = this.getCurrentPosition(symbol);
            if (!currentPosition || currentPosition.amount <= 0) {
                console.log(`ℹ️ ${symbol} için açık pozisyon bulunamadı (Miktar: ${currentPosition?.amount || 0})`);
                console.log(`⚠️ SELL sinyali geldi, bu coin için yeni alım yapılmayacak`);
                return;
            }

            // Pozisyonu kapat
            const trade = this.executeSyntheticTrade(symbol, 'SELL', currentPosition.amount);
            
            if (trade) {
                console.log(`✅ ${symbol} pozisyonu başarıyla kapatıldı`);
            }

        } catch (error) {
            console.error(`${symbol} SELL sinyali hatası:`, error.message);
        }
    }

    // Mevcut pozisyonu al
    getCurrentPosition(symbol) {
        // Son trade'leri kontrol et
        const symbolTrades = this.tradeHistory.filter(trade => trade.symbol === symbol);
        if (symbolTrades.length === 0) return null;

        // Son trade'i al
        const lastTrade = symbolTrades[symbolTrades.length - 1];
        
        // Eğer son trade SELL ise pozisyon yok
        if (lastTrade.side === 'SELL') return null;
        
        // Eğer son trade BUY ise pozisyon var
        return {
            amount: lastTrade.amount,
            price: lastTrade.price,
            timestamp: lastTrade.timestamp
        };
    }

    // Stop Loss ve Take Profit emirleri oluştur
    createStopLossAndTakeProfit(symbol, trade, signal) {
        const currentPrice = trade.price;
        const amount = trade.amount;
        
        // Follow Line stratejisine göre dinamik stop loss ve take profit
        const atrValue = signal.atrValue || (currentPrice * 0.02); // ATR yoksa %2
        
        // Stop Loss: Follow Line support seviyesi
        const stopLossPrice = signal.support || (currentPrice * (1 - this.stopLossPercentage / 100));
        
        // Take Profit: Follow Line resistance seviyesi
        const takeProfitPrice = signal.resistance || (currentPrice * (1 + this.takeProfitPercentage / 100));
        
        console.log(`🛡️ Otomatik Risk Yönetimi: ${symbol}`);
        console.log(`   Alış fiyatı: $${currentPrice}`);
        console.log(`   Stop Loss: $${stopLossPrice.toFixed(4)} (-${(((currentPrice - stopLossPrice) / currentPrice) * 100).toFixed(1)}%)`);
        console.log(`   Take Profit: $${takeProfitPrice.toFixed(4)} (+${(((takeProfitPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%)`);
        
        // Stop Loss emri
        console.log(`🛑 Stop Loss emri oluşturuldu: ${symbol} @ $${stopLossPrice.toFixed(3)}`);
        console.log(`   Miktar: ${amount} | Tip: market`);
        
        // Take Profit emri
        console.log(`🎯 Take Profit emri oluşturuldu: ${symbol} @ $${takeProfitPrice.toFixed(3)}`);
        console.log(`   Miktar: ${amount} | Tip: market`);
        
        // Trade'e stop loss ve take profit bilgilerini ekle
        trade.stopLoss = stopLossPrice;
        trade.takeProfit = takeProfitPrice;
    }

    getTradeHistory() {
        return this.tradeHistory;
    }

    getActiveTrades() {
        return Array.from(this.activeTrades.values());
    }

    getPerformanceStats() {
        const closedTrades = this.tradeHistory.filter(t => t.status === 'closed');
        const totalTrades = closedTrades.length;
        
        if (totalTrades === 0) return { totalTrades: 0, winRate: 0, totalProfit: 0 };

        const profitableTrades = closedTrades.filter(t => t.closeReason === 'take_profit').length;
        const winRate = (profitableTrades / totalTrades) * 100;

        // Basit profit hesaplama (gerçek uygulamada daha karmaşık olabilir)
        const totalProfit = closedTrades.reduce((sum, trade) => {
            if (trade.closeReason === 'take_profit') {
                return sum + (trade.takeProfit - trade.price) * trade.amount;
            } else {
                return sum - (trade.price - trade.stopLoss) * trade.amount;
            }
        }, 0);

        return {
            totalTrades,
            winRate,
            totalProfit,
            activeTrades: this.activeTrades.size
        };
    }
}

module.exports = new TradingEngine(); 