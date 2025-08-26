module.exports = {
  apps: [{
    name: 'recall-trading-agent',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Otomatik restart ayarları
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // Memory ve CPU limitleri
    max_memory_restart: '512M',
    // Cron restart (her gün gece yarısı)
    cron_restart: '0 0 * * *',
    // Kill timeout
    kill_timeout: 5000,
    // Graceful shutdown
    listen_timeout: 8000,
    // Log format
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
