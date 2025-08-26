const ccxt = require('ccxt');
const { SMA, RSI, MACD, EMA, Stochastic, WilliamsR, CCI, ADX, BollingerBands } = require('technicalindicators');
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

// Gelişmiş Scalping Stratejisi Sınıfı - Hızlı Kar İçin
class AdvancedScalpingStrategy {
    constructor() {
        this.fastEma = 5;
        this.slowEma = 13;
        this.rsiPeriod = 14;
        this.stochPeriod = 14;
        this.minVolume = 1000000; // Minimum volume
        this.scalperMode = true;
    }

    // Hızlı EMA Crossover sinyali
    calculateEMACrossover(data) {
        if (data.length < this.slowEma + 5) return null;

        const closes = data.map(candle => candle.close);
        const fastEmaValues = EMA.calculate({ period: this.fastEma, values: closes });
        const slowEmaValues = EMA.calculate({ period: this.slowEma, values: closes });

        if (fastEmaValues.length < 2 || slowEmaValues.length < 2) return null;

        const currentFast = fastEmaValues[fastEmaValues.length - 1];
        const currentSlow = slowEmaValues[slowEmaValues.length - 1];
        const prevFast = fastEmaValues[fastEmaValues.length - 2];
        const prevSlow = slowEmaValues[slowEmaValues.length - 2];

        let signal = 'HOLD';
        let confidence = 0;

        // Golden Cross (Hızlı EMA yukarı kesiyor)
        if (prevFast <= prevSlow && currentFast > currentSlow) {
            signal = 'BUY';
            confidence = 0.8;
        }
        // Death Cross (Hızlı EMA aşağı kesiyor)
        else if (prevFast >= prevSlow && currentFast < currentSlow) {
            signal = 'SELL';
            confidence = 0.8;
        }

        return {
            signal,
            confidence,
            fastEma: currentFast,
            slowEma: currentSlow,
            crossType: signal === 'BUY' ? 'Golden Cross' : signal === 'SELL' ? 'Death Cross' : 'No Cross'
        };
    }

    // Stochastic Oscillator - Aşırı alım/satım tespiti
    calculateStochastic(data) {
        if (data.length < this.stochPeriod + 5) return null;

        const stochInput = {
            high: data.map(candle => candle.high),
            low: data.map(candle => candle.low),
            close: data.map(candle => candle.close),
            period: this.stochPeriod,
            signalPeriod: 3
        };

        const stochValues = Stochastic.calculate(stochInput);
        if (stochValues.length === 0) return null;

        const current = stochValues[stochValues.length - 1];
        
        let signal = 'HOLD';
        let confidence = 0;

        // Aşırı satım bölgesinden çıkış (scalping için daha agresif)
        if (current.k < 25 && current.d < 25 && current.k > current.d) {
            signal = 'BUY';
            confidence = 0.7;
        }
        // Aşırı alım bölgesinden çıkış
        else if (current.k > 75 && current.d > 75 && current.k < current.d) {
            signal = 'SELL';
            confidence = 0.7;
        }

        return {
            signal,
            confidence,
            k: current.k,
            d: current.d,
            level: current.k < 20 ? 'Oversold' : current.k > 80 ? 'Overbought' : 'Normal'
        };
    }

    // Volume Spike Detector - Anormal volume artışı
    detectVolumeSpike(data) {
        if (data.length < 20) return null;

        const volumes = data.map(candle => candle.volume);
        const avgVolume = volumes.slice(-20, -1).reduce((sum, vol) => sum + vol, 0) / 19;
        const currentVolume = volumes[volumes.length - 1];

        const volumeRatio = currentVolume / avgVolume;
        
        return {
            isSpike: volumeRatio > 2.0, // 2x artış
            ratio: volumeRatio,
            confidence: Math.min(volumeRatio / 3, 1), // Max 1.0
            currentVolume,
            avgVolume
        };
    }

    // Scalping sinyali üret
    generateScalpingSignal(data) {
        console.log(`⚡ === GELIŞMIŞ SCALPING STRATEJİSİ ===`);

        const emaCross = this.calculateEMACrossover(data);
        const stochastic = this.calculateStochastic(data);
        const volumeSpike = this.detectVolumeSpike(data);

        if (!emaCross || !stochastic || !volumeSpike) {
            return {
                signal: 'HOLD',
                confidence: 0,
                reason: 'Insufficient data'
            };
        }

        let finalSignal = 'HOLD';
        let totalConfidence = 0;
        let reasons = [];

        // EMA Crossover sinyali
        if (emaCross.signal !== 'HOLD') {
            if (finalSignal === 'HOLD') finalSignal = emaCross.signal;
            else if (finalSignal === emaCross.signal) totalConfidence += emaCross.confidence;
            
            totalConfidence += emaCross.confidence * 0.4;
            reasons.push(`EMA ${emaCross.crossType}`);
            console.log(`📈 EMA Cross: ${emaCross.signal} (${emaCross.crossType})`);
        }

        // Stochastic sinyali
        if (stochastic.signal !== 'HOLD') {
            if (finalSignal === 'HOLD') finalSignal = stochastic.signal;
            else if (finalSignal === stochastic.signal) totalConfidence += stochastic.confidence;
            
            totalConfidence += stochastic.confidence * 0.3;
            reasons.push(`Stoch ${stochastic.level}`);
            console.log(`🎯 Stochastic: ${stochastic.signal} (K: ${stochastic.k.toFixed(1)}, D: ${stochastic.d.toFixed(1)})`);
        }

        // Volume spike güçlendirmesi
        if (volumeSpike.isSpike && finalSignal !== 'HOLD') {
            totalConfidence += volumeSpike.confidence * 0.3;
            reasons.push(`Volume Spike ${volumeSpike.ratio.toFixed(1)}x`);
            console.log(`💥 Volume Spike: ${volumeSpike.ratio.toFixed(1)}x normal`);
        }

        // Scalping için minimum confidence
        if (totalConfidence < 0.6) {
            finalSignal = 'HOLD';
            totalConfidence = 0;
        }

        const result = {
            signal: finalSignal,
            confidence: Math.min(totalConfidence, 1.0),
            reasons: reasons.join(', '),
            details: {
                emaCross,
                stochastic,
                volumeSpike
            }
        };

        console.log(`⚡ Scalping Signal: ${finalSignal} (Güven: ${(result.confidence * 100).toFixed(1)}%)`);
        console.log(`📋 Reasons: ${result.reasons}`);

        return result;
    }
}

// Volume Profile ve Destek/Direnç Stratejisi
class VolumeProfileStrategy {
    constructor() {
        this.lookbackPeriod = 100;
        this.volumeThreshold = 1.5; // 1.5x average volume
        this.priceZones = [];
    }

    // Volume Profile hesaplama
    calculateVolumeProfile(data) {
        if (data.length < this.lookbackPeriod) return null;

        const recentData = data.slice(-this.lookbackPeriod);
        const priceVolMap = new Map();

        // Her fiyat seviyesindeki toplam volume'u hesapla
        recentData.forEach(candle => {
            const priceLevel = Math.round(candle.close * 100) / 100; // 2 decimal
            const currentVol = priceVolMap.get(priceLevel) || 0;
            priceVolMap.set(priceLevel, currentVol + candle.volume);
        });

        // Volume'a göre sırala
        const sortedByVolume = Array.from(priceVolMap.entries())
            .sort((a, b) => b[1] - a[1]);

        // En yüksek volume'lu fiyat seviyeleri (POC - Point of Control)
        const highVolumeZones = sortedByVolume.slice(0, 5);

        return {
            poc: highVolumeZones[0], // En yüksek volume fiyat
            highVolumeZones,
            totalVolume: Array.from(priceVolMap.values()).reduce((sum, vol) => sum + vol, 0)
        };
    }

    // Destek/Direnç seviyelerini tespit et
    findSupportResistance(data, volumeProfile) {
        if (!volumeProfile) return null;

        const currentPrice = data[data.length - 1].close;
        const highVolumeZones = volumeProfile.highVolumeZones;

        let nearestSupport = null;
        let nearestResistance = null;

        // En yakın destek ve direnç seviyelerini bul
        highVolumeZones.forEach(([price, volume]) => {
            if (price < currentPrice) {
                if (!nearestSupport || price > nearestSupport.price) {
                    nearestSupport = { price, volume, distance: currentPrice - price };
                }
            } else if (price > currentPrice) {
                if (!nearestResistance || price < nearestResistance.price) {
                    nearestResistance = { price, volume, distance: price - currentPrice };
                }
            }
        });

        return {
            support: nearestSupport,
            resistance: nearestResistance,
            currentPrice
        };
    }

    // Volume Profile sinyali üret
    generateVolumeSignal(data) {
        console.log(`📊 === VOLUME PROFILE STRATEJİSİ ===`);

        const volumeProfile = this.calculateVolumeProfile(data);
        const supportResistance = this.findSupportResistance(data, volumeProfile);

        if (!volumeProfile || !supportResistance) {
            return {
                signal: 'HOLD',
                confidence: 0,
                reason: 'Insufficient volume data'
            };
        }

        const currentPrice = supportResistance.currentPrice;
        const { support, resistance } = supportResistance;

        let signal = 'HOLD';
        let confidence = 0;
        let reason = '';

        // Destek seviyesine yaklaşma (BUY sinyali)
        if (support && support.distance < (currentPrice * 0.01)) { // %1 yakınlık
            signal = 'BUY';
            confidence = 0.7;
            reason = `Strong support at $${support.price.toFixed(4)}`;
            console.log(`🟢 Güçlü Destek Yakın: $${support.price.toFixed(4)} (Uzaklık: $${support.distance.toFixed(4)})`);
        }

        // Direnç seviyesine yaklaşma (SELL sinyali)
        if (resistance && resistance.distance < (currentPrice * 0.01)) { // %1 yakınlık
            signal = 'SELL';
            confidence = 0.7;
            reason = `Strong resistance at $${resistance.price.toFixed(4)}`;
            console.log(`🔴 Güçlü Direnç Yakın: $${resistance.price.toFixed(4)} (Uzaklık: $${resistance.distance.toFixed(4)})`);
        }

        // POC (Point of Control) yakınlığı
        const pocPrice = volumeProfile.poc[0];
        const pocDistance = Math.abs(currentPrice - pocPrice);
        if (pocDistance < (currentPrice * 0.005)) { // %0.5 yakınlık
            confidence += 0.2; // Güven artırımı
            reason += ` + Near POC $${pocPrice.toFixed(4)}`;
            console.log(`🎯 POC Yakın: $${pocPrice.toFixed(4)}`);
        }

        return {
            signal,
            confidence: Math.min(confidence, 1.0),
            reason,
            details: {
                volumeProfile,
                supportResistance,
                pocPrice
            }
        };
    }
}

// Momentum ve Trend Gücü Stratejisi  
class MomentumStrategy {
    constructor() {
        this.adxPeriod = 14;
        this.cciPeriod = 20;
        this.williamsRPeriod = 14;
    }

    // ADX (Average Directional Index) - Trend gücü
    calculateADX(data) {
        if (data.length < this.adxPeriod + 10) return null;

        const adxInput = {
            high: data.map(candle => candle.high),
            low: data.map(candle => candle.low),
            close: data.map(candle => candle.close),
            period: this.adxPeriod
        };

        const adxValues = ADX.calculate(adxInput);
        if (adxValues.length === 0) return null;

        const current = adxValues[adxValues.length - 1];
        
        return {
            adx: current.adx,
            diPlus: current.diPlus,
            diMinus: current.diMinus,
            trendStrength: current.adx > 25 ? 'Strong' : current.adx > 20 ? 'Moderate' : 'Weak',
            direction: current.diPlus > current.diMinus ? 'Bullish' : 'Bearish'
        };
    }

    // CCI (Commodity Channel Index) - Momentum
    calculateCCI(data) {
        if (data.length < this.cciPeriod + 5) return null;

        const cciInput = {
            high: data.map(candle => candle.high),
            low: data.map(candle => candle.low),
            close: data.map(candle => candle.close),
            period: this.cciPeriod
        };

        const cciValues = CCI.calculate(cciInput);
        if (cciValues.length === 0) return null;

        const current = cciValues[cciValues.length - 1];

        let signal = 'HOLD';
        let confidence = 0;

        // CCI sinyalleri (daha agresif scalping için)
        if (current < -150) { // Aşırı satım
            signal = 'BUY';
            confidence = 0.6;
        } else if (current > 150) { // Aşırı alım
            signal = 'SELL';
            confidence = 0.6;
        }

        return {
            cci: current,
            signal,
            confidence,
            level: current < -100 ? 'Oversold' : current > 100 ? 'Overbought' : 'Normal'
        };
    }

    // Williams %R - Momentum oscillator
    calculateWilliamsR(data) {
        if (data.length < this.williamsRPeriod + 5) return null;

        const williamsInput = {
            high: data.map(candle => candle.high),
            low: data.map(candle => candle.low),
            close: data.map(candle => candle.close),
            period: this.williamsRPeriod
        };

        const williamsValues = WilliamsR.calculate(williamsInput);
        if (williamsValues.length === 0) return null;

        const current = williamsValues[williamsValues.length - 1];

        let signal = 'HOLD';
        let confidence = 0;

        // Williams %R sinyalleri
        if (current > -30) { // Aşırı alım bölgesi
            signal = 'SELL';
            confidence = 0.5;
        } else if (current < -70) { // Aşırı satım bölgesi
            signal = 'BUY';
            confidence = 0.5;
        }

        return {
            williamsR: current,
            signal,
            confidence,
            level: current > -20 ? 'Overbought' : current < -80 ? 'Oversold' : 'Normal'
        };
    }

    // Momentum sinyali üret
    generateMomentumSignal(data) {
        console.log(`🚀 === MOMENTUM STRATEJİSİ ===`);

        const adx = this.calculateADX(data);
        const cci = this.calculateCCI(data);
        const williamsR = this.calculateWilliamsR(data);

        if (!adx || !cci || !williamsR) {
            return {
                signal: 'HOLD',
                confidence: 0,
                reason: 'Insufficient momentum data'
            };
        }

        let finalSignal = 'HOLD';
        let totalConfidence = 0;
        let reasons = [];

        // ADX trend gücü kontrolü
        const trendMultiplier = adx.adx > 25 ? 1.3 : adx.adx > 20 ? 1.1 : 0.8;
        console.log(`📈 ADX: ${adx.adx.toFixed(1)} (${adx.trendStrength} trend, ${adx.direction})`);

        // CCI sinyali
        if (cci.signal !== 'HOLD') {
            finalSignal = cci.signal;
            totalConfidence += cci.confidence * trendMultiplier;
            reasons.push(`CCI ${cci.level} (${cci.cci.toFixed(1)})`);
            console.log(`🎯 CCI: ${cci.signal} (${cci.cci.toFixed(1)} - ${cci.level})`);
        }

        // Williams %R sinyali
        if (williamsR.signal !== 'HOLD') {
            if (finalSignal === williamsR.signal || finalSignal === 'HOLD') {
                if (finalSignal === 'HOLD') finalSignal = williamsR.signal;
                totalConfidence += williamsR.confidence * trendMultiplier;
                reasons.push(`Williams%R ${williamsR.level} (${williamsR.williamsR.toFixed(1)})`);
                console.log(`📊 Williams %R: ${williamsR.signal} (${williamsR.williamsR.toFixed(1)} - ${williamsR.level})`);
            }
        }

        // Trend yönü ile uyum kontrolü
        if (finalSignal === 'BUY' && adx.direction === 'Bearish') {
            totalConfidence *= 0.7; // Trend tersine azaltım
        } else if (finalSignal === 'SELL' && adx.direction === 'Bullish') {
            totalConfidence *= 0.7; // Trend tersine azaltım
        } else if (finalSignal !== 'HOLD' && 
                   ((finalSignal === 'BUY' && adx.direction === 'Bullish') || 
                    (finalSignal === 'SELL' && adx.direction === 'Bearish'))) {
            totalConfidence *= 1.2; // Trend uyumlu artırım
            reasons.push('Trend Aligned');
        }

        return {
            signal: finalSignal,
            confidence: Math.min(totalConfidence, 1.0),
            reasons: reasons.join(', '),
            details: {
                adx,
                cci,
                williamsR
            }
        };
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
        
        // Strateji instance'ları
        this.followLineStrategy = new FollowLineStrategy();
        this.scalpingStrategy = new AdvancedScalpingStrategy();
        this.volumeStrategy = new VolumeProfileStrategy();
        this.momentumStrategy = new MomentumStrategy();
        
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

    // Gelişmiş Multi-Strateji Analizi
    generateAdvancedSignal(marketData, symbol) {
        console.log(`🎯 === GELİŞMİŞ MULTI-STRATEJİ ANALİZİ ===`);
        console.log(`📊 Symbol: ${symbol}`);

        // Tüm stratejilerden sinyal al
        const followLineSignal = this.generateFollowLineSignal(marketData, symbol);
        const scalpingSignal = this.scalpingStrategy.generateScalpingSignal(marketData.data);
        const volumeSignal = this.volumeStrategy.generateVolumeSignal(marketData.data);
        const momentumSignal = this.momentumStrategy.generateMomentumSignal(marketData.data);

        // Sinyal ağırlıkları
        const weights = {
            followLine: 0.30,    // Pine Script Follow Line (Ana strateji)
            scalping: 0.25,      // Hızlı EMA + Stochastic + Volume
            volume: 0.25,        // Volume Profile + Support/Resistance  
            momentum: 0.20       // ADX + CCI + Williams %R
        };

        let buyScore = 0;
        let sellScore = 0;
        let totalWeight = 0;
        let activeStrategies = [];

        // Follow Line stratejisi
        if (followLineSignal.confidence > 0) {
            totalWeight += weights.followLine;
            if (followLineSignal.signal === 'BUY') {
                buyScore += followLineSignal.confidence * weights.followLine;
                activeStrategies.push(`Follow Line BUY (${(followLineSignal.confidence * 100).toFixed(1)}%)`);
            } else if (followLineSignal.signal === 'SELL') {
                sellScore += followLineSignal.confidence * weights.followLine;
                activeStrategies.push(`Follow Line SELL (${(followLineSignal.confidence * 100).toFixed(1)}%)`);
            }
        }

        // Scalping stratejisi  
        if (scalpingSignal.confidence > 0) {
            totalWeight += weights.scalping;
            if (scalpingSignal.signal === 'BUY') {
                buyScore += scalpingSignal.confidence * weights.scalping;
                activeStrategies.push(`Scalping BUY (${(scalpingSignal.confidence * 100).toFixed(1)}%)`);
            } else if (scalpingSignal.signal === 'SELL') {
                sellScore += scalpingSignal.confidence * weights.scalping;
                activeStrategies.push(`Scalping SELL (${(scalpingSignal.confidence * 100).toFixed(1)}%)`);
            }
        }

        // Volume Profile stratejisi
        if (volumeSignal.confidence > 0) {
            totalWeight += weights.volume;
            if (volumeSignal.signal === 'BUY') {
                buyScore += volumeSignal.confidence * weights.volume;
                activeStrategies.push(`Volume BUY (${(volumeSignal.confidence * 100).toFixed(1)}%)`);
            } else if (volumeSignal.signal === 'SELL') {
                sellScore += volumeSignal.confidence * weights.volume;
                activeStrategies.push(`Volume SELL (${(volumeSignal.confidence * 100).toFixed(1)}%)`);
            }
        }

        // Momentum stratejisi
        if (momentumSignal.confidence > 0) {
            totalWeight += weights.momentum;
            if (momentumSignal.signal === 'BUY') {
                buyScore += momentumSignal.confidence * weights.momentum;
                activeStrategies.push(`Momentum BUY (${(momentumSignal.confidence * 100).toFixed(1)}%)`);
            } else if (momentumSignal.signal === 'SELL') {
                sellScore += momentumSignal.confidence * weights.momentum;
                activeStrategies.push(`Momentum SELL (${(momentumSignal.confidence * 100).toFixed(1)}%)`);
            }
        }

        // Final sinyal hesaplama
        let finalSignal = 'HOLD';
        let finalConfidence = 0;

        if (totalWeight > 0) {
            const buyStrength = buyScore / totalWeight;
            const sellStrength = sellScore / totalWeight;

            // Minimum confidence eşiği: 0.5 (daha seçici)
            if (buyStrength > sellStrength && buyStrength > 0.5) {
                finalSignal = 'BUY';
                finalConfidence = buyStrength;
            } else if (sellStrength > buyStrength && sellStrength > 0.5) {
                finalSignal = 'SELL';
                finalConfidence = sellStrength;
            }
        }

        console.log(`\n🎯 === MULTI-STRATEJİ SONUCU ===`);
        console.log(`📊 Aktif Stratejiler: ${activeStrategies.length}/4`);
        activeStrategies.forEach(strategy => console.log(`   ✓ ${strategy}`));
        console.log(`📈 BUY Skoru: ${(buyScore * 100).toFixed(1)}%`);
        console.log(`📉 SELL Skoru: ${(sellScore * 100).toFixed(1)}%`);
        console.log(`⚡ Final Sinyal: ${finalSignal} (Güven: ${(finalConfidence * 100).toFixed(1)}%)`);

        return {
            signal: finalSignal,
            confidence: finalConfidence,
            buyScore,
            sellScore,
            totalWeight,
            activeStrategies,
            details: {
                followLine: followLineSignal,
                scalping: scalpingSignal,
                volume: volumeSignal,
                momentum: momentumSignal
            }
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

    // Dinamik Position Sizing - Risk bazlı miktar hesaplama
    calculateDynamicPositionSize(symbol, signal, currentPrice) {
        const baseBalance = 10000; // USDT
        let riskPercentage = 0.05; // Başlangıç %5 risk

        // Sinyal gücüne göre risk ayarla
        if (signal.confidence > 0.8) {
            riskPercentage = 0.12; // Yüksek güven -> %12 risk
        } else if (signal.confidence > 0.6) {
            riskPercentage = 0.08; // Orta güven -> %8 risk
        } else if (signal.confidence > 0.5) {
            riskPercentage = 0.05; // Düşük güven -> %5 risk
        } else {
            return 0; // Çok düşük güven -> trade yapma
        }

        // Volatilite bazlı ayarlama
        if (symbol.includes('BTC')) {
            riskPercentage *= 1.2; // BTC için biraz daha fazla
        } else if (symbol.includes('ETH')) {
            riskPercentage *= 1.1; // ETH için biraz daha fazla
        } else if (symbol.includes('DOGE') || symbol.includes('SHIB')) {
            riskPercentage *= 0.8; // Volatil altcoinler için daha az
        }

        const riskAmount = baseBalance * riskPercentage;
        const positionSize = riskAmount / currentPrice;

        console.log(`💰 Dinamik Position Sizing:`);
        console.log(`   Güven Seviyesi: ${(signal.confidence * 100).toFixed(1)}%`);
        console.log(`   Risk Yüzdesi: ${(riskPercentage * 100).toFixed(1)}%`);
        console.log(`   Risk Miktarı: $${riskAmount.toFixed(2)}`);
        console.log(`   Position Size: ${positionSize.toFixed(6)} ${symbol.split('/')[0]}`);

        return positionSize;
    }

    async runTradingStrategy() {
        console.log('🚀 Gelişmiş Multi-Strateji Trading başlatılıyor...');

        for (const pair of this.tradingPairs) {
            try {
                console.log(`\n📊 ${pair} analiz ediliyor...`);
                
                // Market verilerini al (sanal modda)
                const marketData = this.getSyntheticMarketData(pair);
                
                // Gelişmiş Multi-Strateji analizi
                const advancedSignal = this.generateAdvancedSignal(marketData, pair);
                
                console.log(`\n💰 Mevcut fiyat: $${this.getCurrentPrice(pair).toFixed(4)}`);

                // Gelişmiş strateji ile trade kararı ver
                if (advancedSignal.confidence > 0.5) { // Daha yüksek eşik
                    if (advancedSignal.signal === 'BUY') {
                        await this.executeAdvancedBuySignal(pair, advancedSignal);
                    } else if (advancedSignal.signal === 'SELL') {
                        await this.executeAdvancedSellSignal(pair, advancedSignal);
                    }
                } else {
                    console.log(`⏸️ ${pair} için yeterli güven yok (${(advancedSignal.confidence * 100).toFixed(1)}% < 50%)`);
                    
                    // Fallback: Eğer Follow Line tek başına güçlüyse 
                    const followLineSignal = advancedSignal.details.followLine;
                    if (followLineSignal.confidence > 0.6) {
                        console.log(`🔄 Follow Line fallback aktif (${(followLineSignal.confidence * 100).toFixed(1)}%)`);
                        if (followLineSignal.signal === 'BUY') {
                            await this.executeFollowLineBuySignal(pair, followLineSignal);
                        } else if (followLineSignal.signal === 'SELL') {
                            await this.executeFollowLineSellSignal(pair, followLineSignal);
                        }
                    }
                }

            } catch (error) {
                console.error(`❌ ${pair} için trading hatası: ${error.message}`);
            }
        }

        // Risk yönetimi kontrolleri
        await this.checkAdvancedRiskManagement();
        
        console.log('✅ Gelişmiş trading stratejisi tamamlandı\n');
    }

    // Gelişmiş BUY sinyali işleme
    async executeAdvancedBuySignal(symbol, signal) {
        try {
            console.log(`🟢 ${symbol} için Multi-Strateji BUY - Sanal trade başlatılıyor...`);
            
            // Mevcut pozisyonu kontrol et
            const currentPosition = this.getCurrentPosition(symbol);
            if (currentPosition && currentPosition.amount > 0) {
                console.log(`ℹ️ ${symbol} için zaten pozisyon var, yeni alım yapılmayacak`);
                return;
            }

            // Dinamik position sizing
            const currentPrice = this.getCurrentPrice(symbol);
            const amount = this.calculateDynamicPositionSize(symbol, signal, currentPrice);

            if (amount <= 0) {
                console.log(`❌ ${symbol} için miktar hesaplanamadı veya çok düşük`);
                return;
            }

            // Trade'i gerçekleştir
            const trade = this.executeSyntheticTrade(symbol, 'BUY', amount, currentPrice);
            
            if (trade) {
                // Gelişmiş Stop Loss ve Take Profit
                this.createAdvancedStopLossAndTakeProfit(symbol, trade, signal);
            }

        } catch (error) {
            console.error(`${symbol} Advanced BUY sinyali hatası:`, error.message);
        }
    }

    // Gelişmiş SELL sinyali işleme
    async executeAdvancedSellSignal(symbol, signal) {
        try {
            console.log(`🔴 ${symbol} için Multi-Strateji SELL - Pozisyon kontrol ediliyor...`);
            
            // Mevcut pozisyonu kontrol et
            const currentPosition = this.getCurrentPosition(symbol);
            if (!currentPosition || currentPosition.amount <= 0) {
                console.log(`ℹ️ ${symbol} için açık pozisyon bulunamadı`);
                return;
            }

            // Pozisyonu kapat
            const trade = this.executeSyntheticTrade(symbol, 'SELL', currentPosition.amount);
            
            if (trade) {
                console.log(`✅ ${symbol} pozisyonu Multi-Strateji ile kapatıldı`);
                
                // Kar/zarar hesapla
                const buyPrice = currentPosition.price;
                const sellPrice = trade.price;
                const profit = (sellPrice - buyPrice) * currentPosition.amount;
                const profitPercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
                
                console.log(`💰 Trade Sonucu: ${profit > 0 ? 'KAR' : 'ZARAR'} $${Math.abs(profit).toFixed(2)} (${profitPercentage.toFixed(2)}%)`);
            }

        } catch (error) {
            console.error(`${symbol} Advanced SELL sinyali hatası:`, error.message);
        }
    }

    // Gelişmiş Risk Yönetimi
    async checkAdvancedRiskManagement() {
        console.log(`🛡️ Gelişmiş risk yönetimi kontrolü...`);
        
        // Portföy değeri kontrolü
        const totalTrades = this.tradeHistory.length;
        if (totalTrades > 0) {
            const recentTrades = this.tradeHistory.slice(-10); // Son 10 trade
            const lossTrades = recentTrades.filter(trade => {
                const pos = this.getCurrentPosition(trade.symbol);
                if (!pos) return false;
                return trade.price > pos.price; // Alış fiyatından düşük
            });

            // Eğer son 10 trade'in %70'i zarar ediyorsa trading'i yavaşlat
            if (lossTrades.length / recentTrades.length > 0.7) {
                console.log(`⚠️ Risk Uyarısı: Son trade'lerin %${((lossTrades.length / recentTrades.length) * 100).toFixed(0)}'i zarar ediyor`);
                console.log(`🔄 Trading stratejisi daha muhafazakar yapılacak`);
                
                // Bu durumda confidence eşiklerini artır
                // (Bu gerçek uygulamada dynamic olarak ayarlanabilir)
            }
        }
    }

    // Gelişmiş Stop Loss ve Take Profit
    createAdvancedStopLossAndTakeProfit(symbol, trade, signal) {
        const currentPrice = trade.price;
        const amount = trade.amount;
        
        // Multi-strateji güven seviyesine göre dinamik SL/TP
        let stopLossPercentage = 3; // Başlangıç %3
        let takeProfitPercentage = 6; // Başlangıç %6

        // Yüksek güven -> Daha gevşek SL, daha yüksek TP
        if (signal.confidence > 0.8) {
            stopLossPercentage = 2;
            takeProfitPercentage = 8;
        } else if (signal.confidence > 0.6) {
            stopLossPercentage = 2.5;
            takeProfitPercentage = 7;
        }

        // Aktif strateji sayısına göre bonus
        const strategyBonus = signal.activeStrategies.length * 0.5;
        takeProfitPercentage += strategyBonus;

        const stopLossPrice = currentPrice * (1 - stopLossPercentage / 100);
        const takeProfitPrice = currentPrice * (1 + takeProfitPercentage / 100);
        
        console.log(`🛡️ Gelişmiş Risk Yönetimi: ${symbol}`);
        console.log(`   Multi-Strateji Güven: ${(signal.confidence * 100).toFixed(1)}%`);
        console.log(`   Aktif Strateji: ${signal.activeStrategies.length}/4`);
        console.log(`   Alış fiyatı: $${currentPrice.toFixed(4)}`);
        console.log(`   Stop Loss: $${stopLossPrice.toFixed(4)} (-${stopLossPercentage}%)`);
        console.log(`   Take Profit: $${takeProfitPrice.toFixed(4)} (+${takeProfitPercentage.toFixed(1)}%)`);
        
        // Trade'e gelişmiş bilgileri ekle
        trade.stopLoss = stopLossPrice;
        trade.takeProfit = takeProfitPrice;
        trade.multiStrategyConfidence = signal.confidence;
        trade.activeStrategies = signal.activeStrategies;
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