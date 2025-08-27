#!/bin/bash

# IT工作日誌系統部署腳本
# 使用方法: ./deploy.sh [production|development]

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 印出彩色訊息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查參數
ENVIRONMENT=${1:-production}
if [[ ! "$ENVIRONMENT" =~ ^(production|development)$ ]]; then
    print_error "無效的環境參數。使用方法: $0 [production|development]"
    exit 1
fi

print_info "開始部署 IT工作日誌系統 - 環境: $ENVIRONMENT"

# 檢查 Node.js 版本
print_info "檢查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    print_error "未安裝 Node.js，請先安裝 Node.js 14.0 或以上版本"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    print_error "Node.js 版本過舊（目前: $(node --version)），需要 14.0 或以上版本"
    exit 1
fi
print_success "Node.js 版本: $(node --version)"

# 檢查 npm 版本
print_info "檢查 npm 版本..."
if ! command -v npm &> /dev/null; then
    print_error "未安裝 npm"
    exit 1
fi
print_success "npm 版本: $(npm --version)"

# 建立必要目錄
print_info "建立必要目錄..."
mkdir -p logs
mkdir -p backups
mkdir -p database

# 安裝依賴
print_info "安裝依賴套件..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm ci --only=production
else
    npm install
fi

# 檢查資料庫
print_info "檢查資料庫..."
if [ ! -f "database/work_log.db" ]; then
    print_info "初始化資料庫..."
    node -e "require('./src/database').initDatabase().then(() => { console.log('資料庫初始化完成'); process.exit(0); }).catch(console.error)"
fi

# PM2 部署
if command -v pm2 &> /dev/null; then
    print_info "使用 PM2 部署..."
    
    # 停止現有進程
    pm2 stop it-work-log 2>/dev/null || true
    pm2 delete it-work-log 2>/dev/null || true
    
    # 啟動新進程
    if [ "$ENVIRONMENT" = "production" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start ecosystem.config.js
    fi
    
    # 保存 PM2 設定
    pm2 save
    
    # 顯示狀態
    pm2 status
    
    print_success "PM2 部署完成"
else
    print_warning "未安裝 PM2，使用直接啟動模式"
    print_info "建議安裝 PM2: npm install -g pm2"
    
    # 直接啟動
    if [ "$ENVIRONMENT" = "production" ]; then
        npm run prod &
    else
        npm start &
    fi
    
    print_success "應用程式已啟動"
fi

# 顯示部署資訊
print_success "部署完成！"
echo
echo "=== 部署資訊 ==="
echo "環境: $ENVIRONMENT"
echo "埠號: 3008"
if command -v pm2 &> /dev/null; then
    echo "管理方式: PM2"
    echo "狀態檢查: pm2 status"
    echo "查看日誌: pm2 logs it-work-log"
    echo "重新啟動: pm2 restart it-work-log"
else
    echo "管理方式: 直接執行"
fi
echo "訪問網址: http://localhost:3008"
echo "預設帳號: admin / admin123"
echo

# 顯示後續步驟
print_info "後續步驟："
echo "1. 修改 .env.production 中的安全密鑰"
echo "2. 設定防火牆允許 3008 端口"
echo "3. 配置反向代理（如 Nginx）"
echo "4. 設定定期備份"
echo "5. 建立監控機制"