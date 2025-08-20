const express = require('express');
const router = express.Router();
const tradingEngine = require('../services/tradingEngine');
const blockchainService = require('../services/blockchainService');
const cron = require('node-cron');

// Ana API endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Crypto Trading Agent API',
        version: '1.0.0',
        endpoints: {
            status: '/api/status',
            start: '/api/start',
            trades: '/api/trades',
            trade: '/api/trade',
            marketData: '/api/market-data/:exchange/:symbol',
            prices: '/api/prices',
            coins: {
                list: '/api/coins',
                add: '/api/coins/add',
                remove: '/api/coins/remove',
                reset: '/api/coins/reset'
            },
            blockchain: {
                balance: '/api/blockchain/balance/:network',
                send: '/api/blockchain/send',
                transaction: '/api/blockchain/transaction/:network/:hash',
                tokenBalance: '/api/blockchain/token-balance/:network/:tokenAddress'
            },
            paperTrading: {
                balance: '/api/paper-trading/balance',
                start: '/api/paper-trading/start',
                stop: '/api/paper-trading/stop',
                reset: '/api/paper-trading/reset',
                tradingStatus: '/api/paper-trading/trading-status'
            },
            signals: '/api/signals'
        },
        timestamp: new Date().toISOString()
    });
});

// Coin fiyatları endpoint'i
router.get('/prices', async (req, res) => {
    try {
        // Önce WebSocket verilerini dene
        const paperTrading = require('../services/paperTrading');
        let prices = {};
        
        if (paperTrading.wsConnected && paperTrading.binanceWS) {
            const wsPrice = paperTrading.binanceWS.getPrices();
            prices = wsPrice;
            console.log('📊 WebSocket fiyatları kullanılıyor');
        }
        
        // Fallback: Trading engine verilerini kullan
        if (Object.keys(prices).length === 0) {
            prices = await tradingEngine.getSyntheticPrices();
            console.log('📊 Fallback fiyatları kullanılıyor');
        }
        
        // Eğer hala veri yoksa, varsayılan değerler sağla
        if (Object.keys(prices).length === 0) {
            const defaultPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'DOT/USDT', 'POL/USDT', 'AVAX/USDT', 'LINK/USDT'];
            defaultPairs.forEach(pair => {
                prices[pair] = {
                    price: 0,
                    change_24h: 0,
                    symbol: pair,
                    timestamp: Date.now()
                };
            });
            console.log('📊 Varsayılan fiyatlar kullanılıyor (WebSocket bağlantısı bekleniyor...)');
        }
        
        res.json({
            success: true,
            data: prices,
            source: paperTrading.wsConnected ? 'websocket' : 'synthetic',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Trading API endpoints
router.get('/status', async (req, res) => {
    try {
        const stats = tradingEngine.getPerformanceStats();
        const activeTrades = tradingEngine.getActiveTrades();
        
        res.json({
            success: true,
            data: {
                stats,
                activeTrades,
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

router.post('/start', async (req, res) => {
    try {
        // Önce geçersiz emirleri temizle
        const paperTrading = require('../services/paperTrading');
        paperTrading.cleanupInvalidOrders();
        
        // Trading stratejisini başlat
        await tradingEngine.runTradingStrategy();
        
        res.json({
            success: true,
            message: 'Trading stratejisi başlatıldı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/trades', async (req, res) => {
    try {
        const { type = 'all', limit = 50 } = req.query;
        
        let trades = [];
        if (type === 'active') {
            trades = tradingEngine.getActiveTrades();
        } else if (type === 'history') {
            trades = tradingEngine.getTradeHistory().slice(-parseInt(limit));
        } else {
            trades = [
                ...tradingEngine.getActiveTrades(),
                ...tradingEngine.getTradeHistory().slice(-parseInt(limit))
            ];
        }
        
        res.json({
            success: true,
            data: trades
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/trade', async (req, res) => {
    try {
        const { exchange, symbol, side, amount, price } = req.body;
        
        if (!exchange || !symbol || !side || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Eksik parametreler'
            });
        }
        
        const trade = await tradingEngine.executeTrade(exchange, symbol, side, amount, price);
        
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

router.get('/market-data/:exchange/:symbol', async (req, res) => {
    try {
        const { exchange, symbol } = req.params;
        const { timeframe = '1h', limit = 100 } = req.query;
        
        const marketData = await tradingEngine.getMarketData(exchange, symbol, timeframe, parseInt(limit));
        const indicators = tradingEngine.calculateIndicators(marketData);
        const signal = tradingEngine.generateSignal(indicators);
        
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

// Coin yönetimi endpoint'leri
router.get('/coins', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                tradingPairs: tradingEngine.tradingPairs,
                availableCoins: [
                    { symbol: 'BTC/USDT', name: 'Bitcoin', id: 'bitcoin' },
                    { symbol: 'ETH/USDT', name: 'Ethereum', id: 'ethereum' },
                    { symbol: 'BNB/USDT', name: 'Binance Coin', id: 'binancecoin' },
                    { symbol: 'ADA/USDT', name: 'Cardano', id: 'cardano' },
                    { symbol: 'SOL/USDT', name: 'Solana', id: 'solana' },
                    { symbol: 'DOT/USDT', name: 'Polkadot', id: 'polkadot' },
                    { symbol: 'DOGE/USDT', name: 'Dogecoin', id: 'dogecoin' },
                    { symbol: 'AVAX/USDT', name: 'Avalanche', id: 'avalanche-2' },
                    { symbol: 'LINK/USDT', name: 'Chainlink', id: 'chainlink' },
                    { symbol: 'POL/USDT', name: 'Polygon', id: 'polygon' },
                    { symbol: 'XRP/USDT', name: 'Ripple', id: 'ripple' },
                    { symbol: 'LTC/USDT', name: 'Litecoin', id: 'litecoin' },
                    { symbol: 'UNI/USDT', name: 'Uniswap', id: 'uniswap' },
                    { symbol: 'ATOM/USDT', name: 'Cosmos', id: 'cosmos' },
                    { symbol: 'FTM/USDT', name: 'Fantom', id: 'fantom' },
                    { symbol: 'NEAR/USDT', name: 'NEAR Protocol', id: 'near' },
                    { symbol: 'ALGO/USDT', name: 'Algorand', id: 'algorand' },
                    { symbol: 'VET/USDT', name: 'VeChain', id: 'vechain' },
                    { symbol: 'ICP/USDT', name: 'Internet Computer', id: 'internet-computer' },
                    { symbol: 'FIL/USDT', name: 'Filecoin', id: 'filecoin' }
                ]
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/coins/add', (req, res) => {
    try {
        const { symbol } = req.body;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Symbol parametresi gerekli'
            });
        }
        
        // Symbol formatını kontrol et
        if (!symbol.includes('/USDT')) {
            return res.status(400).json({
                success: false,
                error: 'Symbol formatı: COIN/USDT olmalı'
            });
        }
        
        // Zaten var mı kontrol et
        if (tradingEngine.tradingPairs.includes(symbol)) {
            return res.status(400).json({
                success: false,
                error: 'Bu coin zaten trading listesinde'
            });
        }
        
        // Yeni coin ekle
        tradingEngine.tradingPairs.push(symbol);
        
        res.json({
            success: true,
            message: `${symbol} trading listesine eklendi`,
            data: {
                tradingPairs: tradingEngine.tradingPairs
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.delete('/coins/remove', (req, res) => {
    try {
        const { symbol } = req.body;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Symbol parametresi gerekli'
            });
        }
        
        // Coin'i listeden çıkar
        const index = tradingEngine.tradingPairs.indexOf(symbol);
        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: 'Bu coin trading listesinde bulunamadı'
            });
        }
        
        tradingEngine.tradingPairs.splice(index, 1);
        
        res.json({
            success: true,
            message: `${symbol} trading listesinden çıkarıldı`,
            data: {
                tradingPairs: tradingEngine.tradingPairs
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/coins/reset', (req, res) => {
    try {
        // Varsayılan coin listesine dön
        tradingEngine.tradingPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT', 'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'POL/USDT'];
        
        res.json({
            success: true,
            message: 'Coin listesi varsayılan ayarlara sıfırlandı',
            data: {
                tradingPairs: tradingEngine.tradingPairs
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Blockchain API endpoints
router.get('/blockchain/balance/:network', async (req, res) => {
    try {
        const { network } = req.params;
        const balance = await blockchainService.config.getBalance(network);
        
        res.json({
            success: true,
            data: {
                network,
                balance: parseFloat(balance),
                address: blockchainService.config.address
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/blockchain/send', async (req, res) => {
    try {
        const { network, to, amount, data } = req.body;
        
        if (!network || !to || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Eksik parametreler'
            });
        }
        
        const transaction = await blockchainService.sendTransaction(network, to, amount, data);
        
        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/blockchain/transaction/:network/:hash', async (req, res) => {
    try {
        const { network, hash } = req.params;
        const status = await blockchainService.getTransactionStatus(network, hash);
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/blockchain/token-balance/:network/:tokenAddress', async (req, res) => {
    try {
        const { network, tokenAddress } = req.params;
        const balance = await blockchainService.getTokenBalance(network, tokenAddress, blockchainService.config.address);
        
        res.json({
            success: true,
            data: balance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/blockchain/network-info/:network', async (req, res) => {
    try {
        const { network } = req.params;
        const info = await blockchainService.getNetworkInfo(network);
        
        res.json({
            success: true,
            data: info
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DeFi API endpoints
router.get('/defi/uniswap-price/:token0/:token1', async (req, res) => {
    try {
        const { token0, token1 } = req.params;
        const { amount = '1' } = req.query;
        
        const price = await blockchainService.getUniswapV2Price(token0, token1, amount);
        
        res.json({
            success: true,
            data: price
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/defi/swap', async (req, res) => {
    try {
        const { token0, token1, amount, slippage = 0.5 } = req.body;
        
        if (!token0 || !token1 || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Eksik parametreler'
            });
        }
        
        const swap = await blockchainService.executeSwap(token0, token1, amount, slippage);
        
        res.json({
            success: true,
            data: swap
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Paper Trading API endpoints
const paperTrading = require('../services/paperTrading');

// Paper trading durumu
router.get('/paper-trading/status', async (req, res) => {
    try {
        const isRunning = paperTrading.isTradingRunning();
        const balance = paperTrading.virtualBalance;
        const tradeHistory = paperTrading.getTradeHistory();
        
        res.json({
            success: true,
            data: {
                isRunning,
                status: isRunning ? "AKTİF" : "DURDURULDU",
                balance,
                totalTrades: tradeHistory.length,
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

// Paper trading başlatma
router.post('/paper-trading/start', async (req, res) => {
    try {
        await paperTrading.runPaperTradingStrategy();
        
        res.json({
            success: true,
            message: 'Paper trading başlatıldı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Paper trading durdurma
router.post('/paper-trading/stop', async (req, res) => {
    try {
        paperTrading.stopTrading();
        
        res.json({
            success: true,
            message: 'Paper trading durduruldu'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Paper trading sıfırlama
router.post('/paper-trading/reset', async (req, res) => {
    try {
        paperTrading.resetBalance();
        
        res.json({
            success: true,
            message: 'Paper trading bakiyesi sıfırlandı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test trade yapma
router.post('/paper-trading/test-trade', async (req, res) => {
    try {
        const { symbol, side, amount } = req.body;
        
        if (!symbol || !side || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Eksik parametreler: symbol, side, amount gerekli'
            });
        }
        
        const trade = await paperTrading.executePaperTrade(symbol, side, parseFloat(amount));
        
        res.json({
            success: true,
            data: trade,
            message: 'Test trade başarıyla yapıldı'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Coin listesi yönetimi
router.get('/trading/coin-list', async (req, res) => {
    try {
        const coinList = tradingEngine.tradingPairs;
        
        res.json({
            success: true,
            data: {
                coins: coinList,
                total: coinList.length,
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

// Coin listesini yeniden oluştur
router.post('/trading/regenerate-coins', async (req, res) => {
    try {
        const newCoinList = tradingEngine.regenerateCoinList();
        
        res.json({
            success: true,
            data: {
                coins: newCoinList,
                total: newCoinList.length,
                message: 'Coin listesi yeniden oluşturuldu'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Trading sinyalleri endpoint'i
router.get('/signals', async (req, res) => {
    try {
        const paperTrading = require('../services/paperTrading');
        
        // Son sinyal verilerini al
        const signals = await paperTrading.getCurrentSignals();
        
        res.json({
            success: true,
            data: {
                signals: signals,
                timestamp: new Date().toISOString(),
                lastUpdate: new Date().toLocaleTimeString('tr-TR')
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Otomatik trading için cron job
cron.schedule('*/5 * * * *', async () => {
    try {
        console.log('Otomatik trading kontrolü başlatılıyor...');
        await tradingEngine.runTradingStrategy();
    } catch (error) {
        console.error('Otomatik trading hatası:', error.message);
    }
});

module.exports = router; 