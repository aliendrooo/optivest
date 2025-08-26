# 🚀 Recall Trading Agent - Production Setup

## ✅ **Otomatik Server Yönetimi Kuruldu!**

### 🎯 **Yarışma Sırasında Problem Yok!**

Artık server otomatik olarak yönetiliyor:

## 📋 **PM2 Komutları:**

### 🟢 **Başlatma:**
```bash
npm run pm2:start
# veya
npm run production
```

### 🔴 **Durdurma:**
```bash
npm run pm2:stop
```

### 🔄 **Yeniden Başlatma:**
```bash
npm run pm2:restart
```

### 📊 **Durum Kontrolü:**
```bash
npm run pm2:status
```

### 📝 **Logları Görme:**
```bash
npm run pm2:logs
```

### 📈 **Monitoring:**
```bash
npm run pm2:monit
```

## 🛡️ **Otomatik Özellikler:**

### ✅ **Auto-Restart:**
- Server çökerse otomatik yeniden başlar
- Memory limit aşılınca otomatik restart
- Hata durumunda 4 saniye sonra tekrar dener

### ✅ **Memory Management:**
- 512MB memory limit
- Otomatik garbage collection
- Memory leak koruması

### ✅ **Logging:**
- Tüm loglar `logs/` klasöründe
- Error logları ayrı dosyada
- Timestamp ile detaylı kayıt

### ✅ **Cron Restart:**
- Her gün gece yarısı otomatik restart
- Memory temizliği
- Sistem optimizasyonu

## 🚀 **Yarışma Başladığında:**

### 1. **Server Zaten Çalışıyor:**
```bash
npm run pm2:status
# ✅ Status: online
```

### 2. **API Bağlantısı Hazır:**
- Production API: `https://api.competitions.recall.network/api`
- API Key: `d9b13d14eebd04ab_1a05dd5a5c2afd89`

### 3. **Otomatik Trading:**
- Yarışma aktif olduğunda otomatik başlar
- 30 saniyede bir durum kontrolü
- Hata durumunda retry mekanizması

## 📱 **Monitoring:**

### Web Dashboard:
- `http://localhost:3000` - Ana dashboard
- Portfolio, leaderboard, trading durumu

### PM2 Monitoring:
```bash
npm run pm2:monit
# Real-time CPU, Memory, Log monitoring
```

## 🔧 **Troubleshooting:**

### Server Çökerse:
```bash
npm run pm2:restart
# Otomatik olarak yeniden başlar
```

### Log Kontrolü:
```bash
npm run pm2:logs
# Hata detaylarını gör
```

### Memory Sorunu:
```bash
npm run pm2:restart
# Memory temizliği yapar
```

## 🎯 **Yarışma Hazırlığı:**

### ✅ **Tamamlanan:**
- [x] PM2 Production Setup
- [x] Auto-restart sistemi
- [x] Memory management
- [x] Logging sistemi
- [x] API entegrasyonu
- [x] Otomatik trading hazır

### 🚀 **Yarışma Başladığında:**
- Server otomatik çalışacak
- API bağlantısı kurulacak
- Trading otomatik başlayacak
- Monitoring aktif olacak

## 📞 **Destek:**

Herhangi bir sorun olursa:
1. `npm run pm2:status` - Durum kontrolü
2. `npm run pm2:logs` - Hata logları
3. `npm run pm2:restart` - Yeniden başlatma

**🎯 Sistem tamamen hazır! Yarışma başladığında otomatik çalışacak!**
