const fs = require('fs');

try {
    console.log('🔄 Paper trading verilerini sıfırlıyorum...');
    
    // Mevcut veriyi oku
    const data = JSON.parse(fs.readFileSync('paper_trading_data.json', 'utf8'));
    
    console.log('💰 Mevcut bakiye:', data.virtualBalance.USDT);
    console.log('📊 Toplam işlem sayısı:', data.tradeHistory ? data.tradeHistory.length : 0);
    
    // Tüm bakiyeleri sıfırla
    for (const currency in data.virtualBalance) {
        if (currency === 'USDT') {
            data.virtualBalance[currency] = 10000; // Sadece 10.000 USDT
        } else {
            data.virtualBalance[currency] = 0; // Diğer coinler sıfır
        }
    }
    
    // İşlem geçmişini temizle
    data.tradeHistory = [];
    
    // Stop Loss ve Take Profit emirlerini temizle
    data.stopLossOrders = [];
    data.takeProfitOrders = [];
    
    // Dosyayı güncelle
    fs.writeFileSync('paper_trading_data.json', JSON.stringify(data, null, 2));
    
    console.log('✅ Paper trading tamamen sıfırlandı!');
    console.log('💰 Yeni USDT bakiyesi:', data.virtualBalance.USDT);
    console.log('📊 Yeni işlem sayısı:', data.tradeHistory.length);
    console.log('🎯 Sadece 10.000 USDT ile başlıyoruz!');
    
} catch (error) {
    console.error('❌ Hata:', error.message);
}
