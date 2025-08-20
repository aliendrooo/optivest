const { ethers } = require('ethers');
require('dotenv').config();

class BlockchainConfig {
    constructor() {
        // Daha güvenilir ve ücretsiz RPC URL'leri
        this.providers = {
            ethereum: new ethers.JsonRpcProvider('https://eth.llamarpc.com'),
            bsc: new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org/'),
            polygon: new ethers.JsonRpcProvider('https://polygon-rpc.com/')
        };
        
        // Environment'dan private key ve wallet address al
        const privateKey = process.env.PRIVATE_KEY;
        const walletAddress = (process.env.WALLET_ADDRESS && process.env.WALLET_ADDRESS !== 'your_wallet_address_here') 
            ? process.env.WALLET_ADDRESS 
            : '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Test adresi
        
        try {
            // Private key formatını kontrol et
            if (privateKey && privateKey.startsWith('0x') && privateKey.length === 66) {
                this.wallet = new ethers.Wallet(privateKey, this.providers.ethereum);
                this.address = this.wallet.address;
                console.log('✅ Blockchain wallet başarıyla oluşturuldu');
            } else {
                console.warn('⚠️ Private key bulunamadı veya geçersiz format, test modunda çalışılıyor');
                this.wallet = null;
                this.address = walletAddress;
            }
        } catch (error) {
            console.warn('⚠️ Blockchain wallet oluşturulamadı, test modunda çalışılıyor:', error.message);
            this.wallet = null;
            this.address = walletAddress;
        }
    }

    getProvider(network) {
        return this.providers[network] || this.providers.ethereum;
    }

    getWallet(network) {
        const provider = this.getProvider(network);
        const privateKey = process.env.PRIVATE_KEY;
        try {
            if (privateKey && privateKey.startsWith('0x') && privateKey.length === 66) {
                return new ethers.Wallet(privateKey, provider);
            } else {
                console.warn('⚠️ Private key bulunamadı, wallet oluşturulamadı');
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Wallet oluşturulamadı:', error.message);
            return null;
        }
    }

    async getBalance(network = 'ethereum') {
        try {
            // Placeholder adres kontrolü
            if (!this.address || this.address === 'your_wallet_address_here') {
                console.warn(`${network} bakiye kontrolü atlandı - geçerli cüzdan adresi yok`);
                return '0.0';
            }
            
            const provider = this.getProvider(network);
            
            // Rate limiting için bekleme
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const balance = await provider.getBalance(this.address);
            const formattedBalance = ethers.formatEther(balance);
            
            console.log(`${network.toUpperCase()} bakiye: ${formattedBalance} ETH`);
            return formattedBalance;
        } catch (error) {
            console.warn(`${network} bakiye alınamadı:`, error.message);
            return '0.0';
        }
    }

    async getGasPrice(network = 'ethereum') {
        try {
            const provider = this.getProvider(network);
            
            // Rate limiting için bekleme
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return await provider.getFeeData();
        } catch (error) {
            console.warn('Gas fiyatı alınamadı:', error.message);
            return { gasPrice: '0' };
        }
    }
}

module.exports = new BlockchainConfig(); 