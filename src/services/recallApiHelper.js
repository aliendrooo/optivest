const axios = require('axios');

class RecallApiHelper {
    constructor(apiKey, environment = 'production') {
        this.apiKey = apiKey;
        this.environment = environment;
        
        // Doğru API URL'leri - Recall Network dokümantasyonuna göre
        this.baseURL = environment === 'sandbox'
            ? 'https://api.sandbox.competitions.recall.network'
            : 'https://api.competitions.recall.network/api';
            
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.maxRequestsPerMinute = 60;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 dakika
        
        console.log(`🔧 Recall API Helper initialized (${environment})`);
        console.log(`📡 Base URL: ${this.baseURL}`);
        console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
    }

    /**
     * Rate limiting kontrolü
     */
    async checkRateLimit() {
        const now = Date.now();
        const timeDiff = now - this.lastRequestTime;
        
        if (timeDiff < 60000) { // 1 dakika içinde
            if (this.requestCount >= this.maxRequestsPerMinute) {
                const waitTime = 60000 - timeDiff;
                console.log(`⏳ Rate limit aşıldı, ${waitTime}ms bekleniyor...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                this.requestCount = 0;
                this.lastRequestTime = Date.now();
            }
        } else {
            this.requestCount = 0;
            this.lastRequestTime = now;
        }
        
        this.requestCount++;
    }
    
    /**
     * Cache kontrolü
     */
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }
    
    /**
     * Cache'e veri kaydet
     */
    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Retry logic ile API çağrısı
     */
    async makeApiCall(method, endpoint, data = null, params = null, retryCount = 0) {
        try {
            await this.checkRateLimit();
            
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json',
                    'User-Agent': 'CryptoTradingAgent/1.0.0',
                    'Accept': 'application/json'
                },
                timeout: 30000
            };
            
            if (data) config.data = data;
            if (params) config.params = params;
            
            console.log(`🌐 Recall API Call: ${method} ${endpoint}`);
            console.log(`🔑 Auth: Bearer ${this.apiKey.substring(0, 8)}...`);
            
            const response = await axios(config);
            
            console.log(`✅ API Response: ${response.status} ${response.statusText}`);
            return {
                success: true,
                data: response.data,
                status: response.status,
                headers: response.headers
            };
            
        } catch (error) {
            console.error(`❌ API Call Error (${retryCount + 1}/${this.maxRetries}):`, error.message);
            
            // Retry logic
            if (retryCount < this.maxRetries && this.shouldRetry(error)) {
                const delay = this.retryDelay * Math.pow(2, retryCount);
                console.log(`🔄 Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeApiCall(method, endpoint, data, params, retryCount + 1);
            }
            
            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            };
        }
    }
    
    /**
     * Retry yapılmalı mı kontrol et
     */
    shouldRetry(error) {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
        
        return retryableStatuses.includes(error.response?.status) || 
               retryableErrors.includes(error.code);
    }
    
    /**
     * GET request
     */
    async get(endpoint, params = null, useCache = false) {
        if (useCache) {
            const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                console.log(`📦 Cache hit: ${endpoint}`);
                return { success: true, data: cached, cached: true };
            }
        }
        
        const result = await this.makeApiCall('GET', endpoint, null, params);
        
        if (result.success && useCache) {
            const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
            this.setCachedData(cacheKey, result.data);
        }
        
        return result;
    }
    
    /**
     * POST request
     */
    async post(endpoint, data) {
        return await this.makeApiCall('POST', endpoint, data);
    }
    
    /**
     * PUT request
     */
    async put(endpoint, data) {
        return await this.makeApiCall('PUT', endpoint, data);
    }
    
    /**
     * DELETE request
     */
    async delete(endpoint) {
        return await this.makeApiCall('DELETE', endpoint);
    }
    
    /**
     * Batch API calls
     */
    async batchCalls(calls) {
        const results = [];
        
        for (const call of calls) {
            try {
                const result = await this.makeApiCall(
                    call.method, 
                    call.endpoint, 
                    call.data, 
                    call.params
                );
                results.push({ ...call, result });
            } catch (error) {
                results.push({ ...call, result: { success: false, error: error.message } });
            }
            
            // Rate limiting için kısa bekleme
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    }
    
    /**
     * API health check
     */
    async healthCheck() {
        try {
            const result = await this.get('/health');
            return {
                success: result.success,
                status: result.status,
                responseTime: Date.now() - this.lastRequestTime,
                environment: this.environment,
                baseURL: this.baseURL
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                environment: this.environment
            };
        }
    }
    
    /**
     * API usage statistics
     */
    getUsageStats() {
        return {
            totalRequests: this.requestCount,
            lastRequest: this.lastRequestTime,
            cacheSize: this.cache.size,
            environment: this.environment,
            rateLimit: `${this.requestCount}/${this.maxRequestsPerMinute} per minute`
        };
    }
    
    /**
     * Cache temizle
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache temizlendi');
    }
}

module.exports = RecallApiHelper;
