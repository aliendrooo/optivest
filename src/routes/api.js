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
            // Paper trading endpoints kaldırıldı - Sadece Recall Network
            signals: '/api/signals'
        },
        timestamp: new Date().toISOString()
    });
});

// Coin fiyatları endpoint'i - Recall Network'e yönlendirildi
router.get('/prices', async (req, res) => {
    try {
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall Network bağlantısı yok - Fiyat verisi alınamıyor',
                connected: false,
                fallback: 'none'
            });
        }

        // Recall Network'ten fiyat verilerini al
        try {
            const prices = await recallClient.getMarketPrices();
            res.json({
                success: true,
                data: prices,
                source: 'recall_network',
                environment: recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production',
                timestamp: new Date().toISOString()
            });
        } catch (priceError) {
            console.error('📊 Recall Network fiyat hatası:', priceError.message);
            res.status(500).json({
                success: false,
                error: 'Recall Network fiyat verisi alınamadı',
                details: priceError.message
            });
        }
    } catch (error) {
        console.error('📊 Fiyat endpoint hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            data: {}
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
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall Network bağlantısı yok - Trading başlatılamıyor',
                connected: false
            });
        }

        // Recall Network trading stratejisini başlat
        await recallClient.startTrading();
        
        res.json({
            success: true,
            message: 'Recall Network trading stratejisi başlatıldı',
            environment: recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production'
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

// ===== PAPER TRADING SİSTEMİ KALDIRILDI =====
// Sadece Recall Network yarışması için optimize edildi

console.log('📋 PAPER TRADING SİSTEMİ KALDIRILDI');
console.log('🎯 Agent artık sadece Recall Network yarışmasına odaklanıyor');

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

// Trading sinyalleri endpoint'i - Paper trading kaldırıldı
router.get('/signals', async (req, res) => {
    try {
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall Network bağlantısı yok - Sinyal verisi alınamıyor',
                connected: false
            });
        }

        // Recall Network'ten sinyal verilerini al
        const signals = await recallClient.getSignals();
        
        res.json({
            success: true,
            data: {
                signals: signals,
                timestamp: new Date().toISOString(),
                lastUpdate: new Date().toLocaleTimeString('tr-TR'),
                source: 'recall_network'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== RECALL NETWORK API ENDPOINTS =====

// Recall portfolio endpoint'i
router.get('/recall/portfolio', async (req, res) => {
    try {
        // Global recallTradingClient'e erişmeye çalış
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall API bağlantısı yok - API key kontrol edin',
                connected: false,
                fallback: 'paper_trading'
            });
        }

        const portfolio = await recallClient.getPortfolio();
        res.json({
            success: true,
            data: portfolio,
            source: 'recall_network',
            environment: recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production'
        });
    } catch (error) {
        console.error('❌ Recall portfolio hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Recall token price endpoint'i
router.get('/recall/price', async (req, res) => {
    try {
        const { token, chain = 'evm', specificChain = 'eth' } = req.query;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token address gerekli'
            });
        }

        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall API bağlantısı yok',
                connected: false
            });
        }

        const priceData = await recallClient.getTokenPrice(token, chain, specificChain);
        res.json({
            success: true,
            data: priceData,
            source: 'recall_network',
            cached: false,
            environment: recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production'
        });
    } catch (error) {
        console.error('❌ Recall price hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Recall trade endpoint'i
router.post('/recall/trade', async (req, res) => {
    try {
        const { fromToken, toToken, amount, fromChain, toChain } = req.body;
        
        if (!fromToken || !toToken || !amount) {
            return res.status(400).json({
                success: false,
                error: 'fromToken, toToken ve amount gerekli'
            });
        }

        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall API bağlantısı yok',
                connected: false
            });
        }

        const tradeResult = await recallClient.executeTrade(
            fromToken, 
            toToken, 
            amount, 
            fromChain, 
            toChain
        );
        
        res.json({
            success: true,
            data: tradeResult,
            source: 'recall_network',
            environment: recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production'
        });
    } catch (error) {
        console.error('❌ Recall trade hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Recall leaderboard endpoint'i
router.get('/recall/leaderboard', async (req, res) => {
    try {
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall API bağlantısı yok',
                connected: false
            });
        }

        const leaderboard = await recallClient.getLeaderboard();
        res.json({
            success: true,
            data: leaderboard,
            source: 'recall_network',
            environment: recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production'
        });
    } catch (error) {
        console.error('❌ Recall leaderboard hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Recall connection test endpoint'i
router.get('/recall/test', async (req, res) => {
    try {
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.json({
                success: false,
                connected: false,
                message: 'Recall API key yapılandırılmamış',
                environment: 'none'
            });
        }

        // Bağlantı testi yap
        const connectionResult = await recallClient.testConnection();
        
        // API Helper kullanarak detaylı test
        const RecallApiHelper = require('../services/recallApiHelper');
        const apiHelper = new RecallApiHelper(recallClient.apiKey, recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production');
        
        const healthCheck = await apiHelper.healthCheck();
        const usageStats = apiHelper.getUsageStats();
        
        res.json({
            success: connectionResult.success,
            connected: connectionResult.success,
            message: connectionResult.success ? 'Recall Network bağlantısı başarılı' : 'Recall Network bağlantı hatası',
            environment: connectionResult.environment,
            apiKey: connectionResult.apiKey,
            baseURL: connectionResult.baseURL || recallClient.baseURL,
            error: connectionResult.error,
            healthCheck,
            usageStats,
            authentication: {
                method: 'Bearer Token',
                header: `Bearer ${recallClient.apiKey.substring(0, 8)}...`,
                contentType: 'application/json'
            }
        });
    } catch (error) {
        res.json({
            success: false,
            connected: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Token addresses helper endpoint'i
router.get('/recall/tokens', (req, res) => {
    try {
        const RecallTradingClient = require('../services/recallTradingClient');
        const tokens = RecallTradingClient.getTokenAddresses();
        
        res.json({
            success: true,
            data: tokens,
            message: 'Popüler token adresleri'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API Helper test endpoint'i
router.get('/recall/api-helper-test', async (req, res) => {
    try {
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall API bağlantısı yok'
            });
        }

        const RecallApiHelper = require('../services/recallApiHelper');
        const apiHelper = new RecallApiHelper(recallClient.apiKey, recallClient.baseURL.includes('sandbox') ? 'sandbox' : 'production');
        
        // Test API calls
        const testCalls = [
            { method: 'GET', endpoint: '/health', description: 'Health Check' },
            { method: 'GET', endpoint: '/portfolio', description: 'Portfolio Test' }
        ];
        
        const results = await apiHelper.batchCalls(testCalls);
        
        res.json({
            success: true,
            data: {
                results,
                usageStats: apiHelper.getUsageStats(),
                environment: apiHelper.environment,
                baseURL: apiHelper.baseURL
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// cURL örnekleri endpoint'i
router.get('/recall/curl-examples', (req, res) => {
    try {
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            return res.status(503).json({
                success: false,
                error: 'Recall API bağlantısı yok'
            });
        }

        const apiKey = recallClient.apiKey;
        const baseURL = recallClient.baseURL;
        
        const examples = {
            portfolio: {
                description: 'Portfolio bilgilerini al',
                curl: `curl -X GET "${baseURL}/portfolio" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json"`,
                javascript: `const response = await fetch('${baseURL}/portfolio', {\n  headers: {\n    'Authorization': 'Bearer ${apiKey}',\n    'Content-Type': 'application/json'\n  }\n});\nconst data = await response.json();`
            },
            price: {
                description: 'Token fiyatını al',
                curl: `curl -X GET "${baseURL}/price?token=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=evm&specificChain=eth" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json"`,
                javascript: `const response = await fetch('${baseURL}/price?token=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chain=evm&specificChain=eth', {\n  headers: {\n    'Authorization': 'Bearer ${apiKey}',\n    'Content-Type': 'application/json'\n  }\n});\nconst data = await response.json();`
            },
            trade: {
                description: 'Trade gerçekleştir',
                curl: `curl -X POST "${baseURL}/trade/execute" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "fromToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",\n    "toToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",\n    "amount": "1.0"\n  }'`,
                javascript: `const response = await fetch('${baseURL}/trade/execute', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${apiKey}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    fromToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',\n    toToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',\n    amount: '1.0'\n  })\n});\nconst data = await response.json();`
            },
            leaderboard: {
                description: 'Competition leaderboard al',
                curl: `curl -X GET "${baseURL}/leaderboard" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json"`,
                javascript: `const response = await fetch('${baseURL}/leaderboard', {\n  headers: {\n    'Authorization': 'Bearer ${apiKey}',\n    'Content-Type': 'application/json'\n  }\n});\nconst data = await response.json();`
            }
        };
        
        res.json({
            success: true,
            data: {
                examples,
                apiKey: `${apiKey.substring(0, 8)}...`,
                baseURL,
                environment: baseURL.includes('sandbox') ? 'sandbox' : 'production',
                note: 'Bu örnekler Recall Network API dokümantasyonuna uygun olarak hazırlanmıştır'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Otomatik trading için cron job - YARIŞMA BAŞLANGICINDA AKTİF OLACAK
cron.schedule('*/5 * * * *', async () => {
    try {
        const recallClient = global.recallTradingClient;
        
        if (!recallClient) {
            console.log('⚠️ Recall Network bağlantısı yok - Trading bekleniyor');
            return;
        }

        // Yarışma durumunu kontrol et
        const competitionStatus = await recallClient.getCompetitionStatus();
        
        if (competitionStatus.isActive) {
            console.log('🏆 YARIŞMA AKTİF - Otomatik trading başlatılıyor...');
            await recallClient.runTradingStrategy();
        } else {
            console.log('⏳ YARIŞMA HENÜZ BAŞLAMADI - Bekleniyor...');
        }
    } catch (error) {
        console.error('❌ Otomatik trading hatası:', error.message);
    }
});

console.log('🎯 YARIŞMA BAŞLANGICINDA OTOMATİK TRADING AKTİF OLACAK');
console.log('📋 YARIŞMA BAŞLADIKTAN SONRA:');
console.log('   1. .env dosyasını oluştur');
console.log('   2. Server\'ı yeniden başlat');
console.log('   3. Dashboard\'da "Test Connection" yap');
console.log('   4. Otomatik trading zaten aktif!');

module.exports = router; 