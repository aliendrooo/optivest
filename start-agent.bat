@echo off
echo Starting Recall Trading Agent...
cd /d "C:\Users\Alihan\Desktop\Agent"
pm2 start ecosystem.config.js --env production
echo Agent started successfully!
pause
