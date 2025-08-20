const express = require('express');
const router = express.Router();
const paperTrading = require('../services/paperTrading');
const cron = require('node-cron');

// Trading durumu kontrolü
router.get('/trading-status', async (req, res) => {
    try {
        const isRunning = paperTrading.isTradingRunning();
        
        res.json({
            success: true,
            data: {
                isRunning: isRunning,
                status: isRunning ? 'AKTİF' : 'DURMUŞ',
                lastUpdate: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sanal trading durumu
router.get('/status', async (req, res) => {
    try {
        const balance = await paperTrading.getBalance();
        const totalValue = await paperTrading.calculateTotalValue();
        const riskAnalysis = await paperTrading.getRiskAnalysis();
        const openPositions = await paperTrading.getOpenPositions();
        
        res.json({
            success: true,
            data: {
                balance,
                totalValue,
                riskAnalysis,
                openPositions,
                isSimulationMode: true
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sanal trading başlatma
router.post('/start', async (req, res) => {
    try {
        paperTrading.startTrading(); // Trading'i aktif hale getir
        
        res.json({
            success: true,
            message: 'Sanal trading başlatıldı',
            data: {
                status: 'AKTİF',
                isRunning: true
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sanal trading durdurma
router.post('/stop', async (req, res) => {
    try {
        paperTrading.stopTrading();
        
        res.json({
            success: true,
            message: 'Sanal trading durduruldu',
            data: {
                status: 'DURMUŞ',
                isRunning: false
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sanal trade geçmişi
router.get('/trades', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const trades = paperTrading.getTradeHistory().slice(-parseInt(limit));
        
        res.json({
            success: true,
            trades: trades
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sanal portföy bilgileri
router.get('/portfolio', async (req, res) => {
    try {
        const balance = await paperTrading.getBalance();
        const holdings = await paperTrading.getHoldings();
        
        // USDT bakiyesini 10.000 olarak ayarla
        const usdtBalance = 10000;
        
        // Toplam değeri sadece USDT bakiyesi olarak ayarla
        const totalValue = usdtBalance;
        
        // Kar/zarar hesaplama
        const initialBalance = 10000;
        const totalPnL = 0; // Hiç işlem yapılmadığı için kar/zarar 0
        const pnlPercentage = 0; // Hiç işlem yapılmadığı için yüzde 0
        
        res.json({
            success: true,
            usdtBalance: usdtBalance,
            totalValue: totalValue,
            totalPnL: totalPnL,
            pnlPercentage: pnlPercentage,
            holdings: holdings || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Manuel sanal trade
router.post('/trade', async (req, res) => {
    try {
        const { symbol, side, amount, price } = req.body;
        
        if (!symbol || !side || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Eksik parametreler'
            });
        }
        
        const trade = await paperTrading.executePaperTrade(symbol, side, amount, price);
        
        res.json({
            success: true,
            data: trade
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Market verileri (sanal)
router.get('/market-data/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '1h', limit = 100 } = req.query;
        
        const marketData = await paperTrading.getMarketData(symbol, timeframe, parseInt(limit));
        const indicators = paperTrading.calculateIndicators(marketData);
        const signal = paperTrading.generateSignal(indicators);
        
        res.json({
            success: true,
            data: {
                marketData,
                indicators,
                signal
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fiyat endpoint'i
router.get('/prices', async (req, res) => {
    try {
        const tradingEngine = require('../services/tradingEngine');
        const pairs = tradingEngine.tradingPairs || ['BTC/USDT', 'ETH/USDT', 'DOT/USDT', 'POL/USDT', 'ADA/USDT', 'VET/USDT', 'FTM/USDT', 'ICP/USDT', 'AVAX/USDT', 'LINK/USDT', 'ATOM/USDT'];
        const prices = {};
        
        for (const pair of pairs) {
            try {
                const price = await paperTrading.getCurrentPrice(pair);
                // Sadece coin sembolünü al (BTC/USDT -> BTC)
                const symbol = pair.replace('/USDT', '');
                prices[symbol] = price;
            } catch (error) {
                console.error(`${pair} fiyatı alınamadı:`, error.message);
                const symbol = pair.replace('/USDT', '');
                prices[symbol] = 0;
            }
        }
        
        res.json({
            success: true,
            data: {
                prices: prices,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Performans raporu
router.get('/performance', async (req, res) => {
    try {
        const report = await paperTrading.generatePerformanceReport();
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Risk analizi
router.get('/risk-analysis', async (req, res) => {
    try {
        const analysis = await paperTrading.getRiskAnalysis();
        
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bakiye sıfırlama
router.post('/reset', async (req, res) => {
    try {
        paperTrading.resetBalance();
        
        res.json({
            success: true,
            message: 'Sanal bakiye sıfırlandı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bakiye ekleme
router.post('/add-balance', async (req, res) => {
    try {
        const { currency = 'USDT', amount } = req.body;
        
        if (!amount) {
            return res.status(400).json({
                success: false,
                error: 'Miktar belirtilmedi'
            });
        }
        
        paperTrading.addBalance(currency, parseFloat(amount));
        
        res.json({
            success: true,
            message: `${amount} ${currency} eklendi`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sanal bakiye bilgileri
router.get('/balance', async (req, res) => {
    try {
        const balance = await paperTrading.getBalance();
        const totalValue = 10000; // Sabit 10.000 USDT
        const initialBalance = 10000;
        const profit = 0; // Hiç işlem yapılmadığı için kar 0
        
        res.json({
            success: true,
            balance: {
                ...balance,
                totalValue: totalValue,
                profit: profit,
                profitPercentage: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Trading istatistikleri
router.get('/stats', async (req, res) => {
    try {
        const tradeHistory = paperTrading.getTradeHistory();
        const totalTrades = tradeHistory.length;
        
        // Gerçek başarı oranı hesaplama
        const successRate = paperTrading.calculateSuccessRate();
        
        res.json({
            success: true,
            totalTrades: totalTrades,
            successRate: successRate // Gerçek hesaplanan başarı oranı
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Açık pozisyonlar
router.get('/positions', async (req, res) => {
    try {
        const holdings = await paperTrading.getHoldings();
        
        res.json({
            success: true,
            holdings: holdings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            holdings: []
        });
    }
});



// ===== STOP LOSS / TAKE PROFIT API ENDPOINTS =====

// Aktif Stop Loss emirlerini getir
router.get('/stop-loss-orders', async (req, res) => {
    try {
        const orders = paperTrading.getActiveStopLossOrders();
        
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Aktif Take Profit emirlerini getir
router.get('/take-profit-orders', async (req, res) => {
    try {
        const orders = paperTrading.getActiveTakeProfitOrders();
        
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Stop Loss emri oluştur
router.post('/stop-loss-order', async (req, res) => {
    try {
        const { symbol, triggerPrice, amount, orderType = 'market' } = req.body;
        
        if (!symbol || !triggerPrice || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Symbol, triggerPrice ve amount gerekli'
            });
        }
        
        const order = await paperTrading.createStopLossOrder(symbol, triggerPrice, amount, orderType);
        
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Take Profit emri oluştur
router.post('/take-profit-order', async (req, res) => {
    try {
        const { symbol, triggerPrice, amount, orderType = 'market' } = req.body;
        
        if (!symbol || !triggerPrice || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Symbol, triggerPrice ve amount gerekli'
            });
        }
        
        const order = await paperTrading.createTakeProfitOrder(symbol, triggerPrice, amount, orderType);
        
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Emri iptal et
router.delete('/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const cancelledOrder = await paperTrading.cancelOrder(orderId);
        
        if (cancelledOrder) {
            res.json({
                success: true,
                message: 'Emir başarıyla iptal edildi',
                data: cancelledOrder
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Emir bulunamadı'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Otomatik Stop Loss/Take Profit ayarla
router.post('/auto-risk-management', async (req, res) => {
    try {
        const { symbol, buyPrice, amount, stopLossPercentage = 5, takeProfitPercentage = 10 } = req.body;
        
        if (!symbol || !buyPrice || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Symbol, buyPrice ve amount gerekli'
            });
        }
        
        const result = await paperTrading.setAutoStopLossTakeProfit(
            symbol, 
            buyPrice, 
            amount, 
            stopLossPercentage, 
            takeProfitPercentage
        );
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Stop Loss/Take Profit kontrolü
router.post('/check-orders', async (req, res) => {
    try {
        const executedOrders = await paperTrading.checkStopLossTakeProfit();
        
        res.json({
            success: true,
            data: {
                executedOrders: executedOrders,
                message: `${executedOrders.length} emir çalıştırıldı`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Otomatik sanal trading (5 dakikada bir)
cron.schedule('*/5 * * * *', async () => {
    try {
        // Trading durdurulmuşsa çalıştırma
        if (!paperTrading.isTradingRunning()) {
            return;
        }
        
        console.log('🎮 Otomatik sanal trading kontrolü başlatılıyor...');
        await paperTrading.runPaperTradingStrategy();
    } catch (error) {
        console.error('Sanal trading hatası:', error.message);
    }
});

module.exports = router; 