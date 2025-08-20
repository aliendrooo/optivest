const { ethers } = require('ethers');
const blockchainConfig = require('../config/blockchain');

class BlockchainService {
    constructor() {
        this.config = blockchainConfig;
    }

    async sendTransaction(network, to, amount, data = '') {
        try {
            const wallet = this.config.getWallet(network);
            
            if (!wallet) {
                throw new Error('Wallet bulunamadı. Lütfen PRIVATE_KEY environment değişkenini ayarlayın.');
            }
            
            const gasPrice = await this.config.getGasPrice(network);
            
            const tx = {
                to: to,
                value: ethers.parseEther(amount.toString()),
                data: data,
                gasLimit: 21000,
                gasPrice: gasPrice.gasPrice
            };

            const transaction = await wallet.sendTransaction(tx);
            console.log(`Transaction gönderildi: ${transaction.hash}`);
            
            return {
                hash: transaction.hash,
                from: transaction.from,
                to: transaction.to,
                value: amount,
                network: network,
                status: 'pending'
            };

        } catch (error) {
            console.error(`Transaction hatası: ${error.message}`);
            throw error;
        }
    }

    async getTransactionStatus(network, txHash) {
        try {
            const provider = this.config.getProvider(network);
            const receipt = await provider.getTransactionReceipt(txHash);
            
            return {
                hash: txHash,
                status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
                blockNumber: receipt?.blockNumber,
                gasUsed: receipt?.gasUsed?.toString(),
                confirmations: receipt ? await receipt.confirmations() : 0
            };

        } catch (error) {
            console.error(`Transaction durumu alınamadı: ${error.message}`);
            throw error;
        }
    }

    async deploySmartContract(network, contractBytecode, contractAbi, constructorArgs = []) {
        try {
            const wallet = this.config.getWallet(network);
            
            if (!wallet) {
                throw new Error('Wallet bulunamadı. Lütfen PRIVATE_KEY environment değişkenini ayarlayın.');
            }
            
            const factory = new ethers.ContractFactory(contractAbi, contractBytecode, wallet);
            
            const contract = await factory.deploy(...constructorArgs);
            await contract.waitForDeployment();
            
            const address = await contract.getAddress();
            
            console.log(`Smart contract deploy edildi: ${address}`);
            
            return {
                address: address,
                network: network,
                transactionHash: contract.deploymentTransaction().hash,
                abi: contractAbi
            };

        } catch (error) {
            console.error(`Smart contract deploy hatası: ${error.message}`);
            throw error;
        }
    }

    async callSmartContract(network, contractAddress, abi, methodName, args = []) {
        try {
            const provider = this.config.getProvider(network);
            const contract = new ethers.Contract(contractAddress, abi, provider);
            
            const result = await contract[methodName](...args);
            return result;

        } catch (error) {
            console.error(`Smart contract çağrı hatası: ${error.message}`);
            throw error;
        }
    }

    async sendSmartContractTransaction(network, contractAddress, abi, methodName, args = []) {
        try {
            const wallet = this.config.getWallet(network);
            
            if (!wallet) {
                throw new Error('Wallet bulunamadı. Lütfen PRIVATE_KEY environment değişkenini ayarlayın.');
            }
            
            const contract = new ethers.Contract(contractAddress, abi, wallet);
            
            const tx = await contract[methodName](...args);
            const receipt = await tx.wait();
            
            return {
                hash: tx.hash,
                status: receipt.status === 1 ? 'success' : 'failed',
                gasUsed: receipt.gasUsed.toString(),
                events: receipt.logs
            };

        } catch (error) {
            console.error(`Smart contract transaction hatası: ${error.message}`);
            throw error;
        }
    }

    async getTokenBalance(network, tokenAddress, walletAddress) {
        try {
            const provider = this.config.getProvider(network);
            
            // ERC-20 token ABI (sadece balanceOf fonksiyonu)
            const tokenAbi = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)",
                "function symbol() view returns (string)"
            ];
            
            const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
            
            const [balance, decimals, symbol] = await Promise.all([
                tokenContract.balanceOf(walletAddress),
                tokenContract.decimals(),
                tokenContract.symbol()
            ]);
            
            return {
                token: symbol,
                balance: ethers.formatUnits(balance, decimals),
                decimals: decimals,
                address: tokenAddress
            };

        } catch (error) {
            console.error(`Token balance alınamadı: ${error.message}`);
            throw error;
        }
    }

    async getNetworkInfo(network) {
        try {
            const provider = this.config.getProvider(network);
            
            // Rate limiting için bekleme
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const [blockNumber, gasPrice, networkName] = await Promise.all([
                provider.getBlockNumber(),
                provider.getFeeData(),
                provider.getNetwork()
            ]);
            
            return {
                network: network,
                chainId: networkName.chainId,
                blockNumber: blockNumber,
                gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei') + ' gwei',
                isConnected: provider.connection.url !== undefined
            };

        } catch (error) {
            console.error(`Network bilgisi alınamadı: ${error.message}`);
            return {
                network: network,
                chainId: 0,
                blockNumber: 0,
                gasPrice: '0 gwei',
                isConnected: false,
                error: error.message
            };
        }
    }

    async validateAddress(address) {
        try {
            return ethers.isAddress(address);
        } catch (error) {
            return false;
        }
    }

    async estimateGas(network, to, value = '0', data = '') {
        try {
            const provider = this.config.getProvider(network);
            const wallet = this.config.getWallet(network);
            
            if (!wallet) {
                throw new Error('Wallet bulunamadı. Lütfen PRIVATE_KEY environment değişkenini ayarlayın.');
            }
            
            const tx = {
                to: to,
                value: ethers.parseEther(value.toString()),
                data: data
            };
            
            const gasEstimate = await provider.estimateGas(tx);
            return gasEstimate.toString();

        } catch (error) {
            console.error(`Gas tahmini hatası: ${error.message}`);
            throw error;
        }
    }

    // DeFi protokolleri için yardımcı fonksiyonlar
    async getUniswapV2Price(token0, token1, amount = '1') {
        try {
            // Uniswap V2 Router ABI (sadece getAmountsOut fonksiyonu)
            const routerAbi = [
                "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
            ];
            
            const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Uniswap V2 Router
            const provider = this.config.getProvider('ethereum');
            const router = new ethers.Contract(routerAddress, routerAbi, provider);
            
            const path = [token0, token1];
            const amounts = await router.getAmountsOut(ethers.parseEther(amount), path);
            
            return {
                inputAmount: amount,
                outputAmount: ethers.formatEther(amounts[1]),
                path: path
            };

        } catch (error) {
            console.error(`Uniswap fiyat alınamadı: ${error.message}`);
            throw error;
        }
    }

    async executeSwap(token0, token1, amount, slippage = 0.5) {
        try {
            const wallet = this.config.getWallet('ethereum');
            
            if (!wallet) {
                throw new Error('Wallet bulunamadı. Lütfen PRIVATE_KEY environment değişkenini ayarlayın.');
            }
            
            // Uniswap V2 Router ABI
            const routerAbi = [
                "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
                "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
            ];
            
            const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
            const router = new ethers.Contract(routerAddress, routerAbi, wallet);
            
            const path = [token0, token1];
            const deadline = Math.floor(Date.now() / 1000) + 300; // 5 dakika
            
            // Minimum çıktı miktarını hesapla
            const priceInfo = await this.getUniswapV2Price(token0, token1, amount);
            const minOutput = parseFloat(priceInfo.outputAmount) * (1 - slippage / 100);
            
            let tx;
            if (token0 === '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2') { // WETH
                // ETH -> Token swap
                tx = await router.swapExactETHForTokens(
                    ethers.parseEther(minOutput.toString()),
                    path,
                    wallet.address,
                    deadline,
                    { value: ethers.parseEther(amount) }
                );
            } else {
                // Token -> Token swap
                tx = await router.swapExactTokensForTokens(
                    ethers.parseEther(amount),
                    ethers.parseEther(minOutput.toString()),
                    path,
                    wallet.address,
                    deadline
                );
            }
            
            const receipt = await tx.wait();
            
            return {
                hash: tx.hash,
                status: receipt.status === 1 ? 'success' : 'failed',
                inputAmount: amount,
                minOutput: minOutput,
                path: path
            };

        } catch (error) {
            console.error(`Swap hatası: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new BlockchainService(); 