# IT工作日誌系統 - 部署指南

## 部署環境需求

### 系統需求
- **作業系統**: Linux (Ubuntu 18.04+, CentOS 7+) 或 Windows Server
- **Node.js**: 14.0+ (建議使用 LTS 版本)
- **NPM**: 6.0+
- **記憶體**: 最少 512MB，建議 1GB+
- **儲存空間**: 最少 1GB，建議預留更多空間給日誌和備份

### 網路需求
- **對內網路**: 開放 3008 端口
- **防火牆**: 允許內部網路訪問 3008 端口
- **DNS**: 可設定內部域名指向伺服器

## 快速部署步驟

### 1. 準備部署環境

```bash
# 建立部署目錄
sudo mkdir -p /opt/it-work-log
sudo chown $USER:$USER /opt/it-work-log
cd /opt/it-work-log

# 複製專案檔案
# 將整個專案目錄複製到 /opt/it-work-log/
```

### 2. 安裝PM2（推薦）

```bash
# 全域安裝 PM2
sudo npm install -g pm2

# 設定開機自動啟動
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 3. 執行部署腳本

```bash
# 給執行權限
chmod +x deploy.sh

# 執行部署（生產環境）
./deploy.sh production

# 或執行部署（開發環境）
./deploy.sh development
```

### 4. 驗證部署

```bash
# 檢查PM2狀態
pm2 status

# 檢查應用程式日誌
pm2 logs it-work-log

# 測試連線
curl http://localhost:3008/api/auth/login
```

## 手動部署步驟

### 1. 安裝依賴

```bash
# 進入專案目錄
cd /path/to/it-work-log

# 安裝生產依賴
npm ci --only=production
```

### 2. 環境配置

```bash
# 複製環境配置檔案
cp .env.production .env

# 編輯配置檔案
nano .env
```

**重要**: 必須修改以下安全設定：
- `JWT_SECRET`: 設定強密碼
- `SESSION_SECRET`: 設定強密碼
- `ALLOWED_ORIGINS`: 設定允許的網域

### 3. 初始化資料庫

```bash
# 建立資料庫目錄
mkdir -p database

# 初始化資料庫（自動建立預設管理員帳號）
node -e "require('./src/database').initDatabase().then(() => process.exit(0))"
```

### 4. 啟動服務

#### 使用 PM2（推薦）

```bash
# 啟動生產環境
pm2 start ecosystem.config.js --env production

# 保存PM2設定
pm2 save
```

#### 使用 systemd（Linux）

建立服務檔案：

```bash
sudo nano /etc/systemd/system/it-work-log.service
```

內容：

```ini
[Unit]
Description=IT Work Log System
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/opt/it-work-log
Environment=NODE_ENV=production
Environment=PORT=3008
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

啟動服務：

```bash
sudo systemctl daemon-reload
sudo systemctl enable it-work-log
sudo systemctl start it-work-log
sudo systemctl status it-work-log
```

## 網路配置

### 內部網路訪問

1. **直接訪問**: `http://server-ip:3008`
2. **內部域名**: 設定 DNS 或 hosts 檔案

### Nginx 反向代理（可選）

```nginx
server {
    listen 80;
    server_name worklog.company.com;

    location / {
        proxy_pass http://localhost:3008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支援（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 防火牆設定

#### Ubuntu/Debian (ufw)

```bash
sudo ufw allow 3008/tcp
sudo ufw reload
```

#### CentOS/RHEL (firewalld)

```bash
sudo firewall-cmd --add-port=3008/tcp --permanent
sudo firewall-cmd --reload
```

## 安全設定

### 1. 修改預設密碼

首次部署後，請立即：
1. 登入系統 (admin/admin123)
2. 修改管理員密碼
3. 建立其他使用者帳號
4. 停用不需要的帳號

### 2. 環境變數安全

確保 `.env` 檔案權限正確：

```bash
chmod 600 .env
```

### 3. 資料庫安全

```bash
# 設定資料庫檔案權限
chmod 600 database/work_log.db
```

## 備份策略

### 自動備份

系統會自動建立 JSON 格式備份，儲存於 `backups/` 目錄。

### 手動備份

```bash
# 執行備份
npm run backup

# 備份資料庫檔案
cp database/work_log.db backups/work_log_$(date +%Y%m%d_%H%M%S).db
```

### 回復資料

```bash
# 從 JSON 備份回復
npm run restore

# 從資料庫檔案回復
cp backups/work_log_backup.db database/work_log.db
pm2 restart it-work-log
```

## 監控與維護

### PM2 監控

```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs it-work-log

# 查看監控
pm2 monit

# 重新啟動
pm2 restart it-work-log
```

### 日誌管理

日誌檔案位置：
- `logs/out.log` - 標準輸出
- `logs/error.log` - 錯誤日誌
- `logs/combined.log` - 合併日誌

設定日誌輪轉：

```bash
# 安裝 logrotate
sudo apt-get install logrotate

# 建立設定檔
sudo nano /etc/logrotate.d/it-work-log
```

內容：

```
/opt/it-work-log/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0644 your-user your-user
    postrotate
        pm2 reload it-work-log
    endscript
}
```

## 故障排除

### 常見問題

1. **端口被佔用**
   ```bash
   # 查看端口使用狀況
   netstat -tulpn | grep 3008
   # 或
   lsof -i :3008
   ```

2. **權限問題**
   ```bash
   # 確認檔案權限
   ls -la
   # 修正權限
   sudo chown -R $USER:$USER /opt/it-work-log
   ```

3. **資料庫錯誤**
   ```bash
   # 檢查資料庫檔案
   ls -la database/
   # 重新初始化（會清除資料）
   rm database/work_log.db
   node -e "require('./src/database').initDatabase().then(() => process.exit(0))"
   ```

### 效能調優

1. **增加 PM2 實例數**（多核心伺服器）
   ```bash
   pm2 scale it-work-log 4
   ```

2. **調整記憶體限制**
   ```bash
   # 修改 ecosystem.config.js 中的 max_memory_restart
   ```

3. **啟用叢集模式**
   ```javascript
   // 在 ecosystem.config.js 中設定
   instances: 'max', // 或指定數量
   exec_mode: 'cluster'
   ```

## 更新部署

### 更新流程

1. **備份當前版本**
   ```bash
   npm run backup
   cp -r /opt/it-work-log /opt/it-work-log.backup.$(date +%Y%m%d)
   ```

2. **更新檔案**
   ```bash
   # 替換新版本檔案
   # 保留 database/, logs/, backups/ 目錄
   ```

3. **更新依賴**
   ```bash
   npm ci --only=production
   ```

4. **重新啟動**
   ```bash
   pm2 reload it-work-log
   ```

### 回滾程序

```bash
# 停止服務
pm2 stop it-work-log

# 回復舊版本
rm -rf /opt/it-work-log
mv /opt/it-work-log.backup.YYYYMMDD /opt/it-work-log
cd /opt/it-work-log

# 重新啟動
pm2 start ecosystem.config.js --env production
```

---

## 聯絡資訊

如有問題或需要技術支援，請聯絡系統管理員。