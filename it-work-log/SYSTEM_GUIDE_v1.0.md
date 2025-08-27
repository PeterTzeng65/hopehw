# 資訊組工作日誌管理系統 v1.0 - 完整功能說明

## 🎯 使用說明

### 基本操作流程

1. **登入系統**
   - 使用管理員帳號：admin / admin123
   - 或其他已建立的使用者帳號

2. **新增工單**
   - 點擊「新增記錄」按鈕
   - 填寫完整的工單資訊
   - 選擇適當的問題類別和優先級

3. **統計分析**
   - 點擊「統計」按鈕開啟報表功能
   - 選擇統計類型（狀態分佈、問題類別等）
   - 選擇圖表類型（圓餅圖、長條圖）
   - 設定篩選條件（時間範圍、部門）
   - 點擊「產生報表」

4. **互動分析**
   - 點擊圖表的任意區塊查看該類別詳細資料
   - 點擊統計表格中的藍色數字查看明細
   - 在詳細資訊彈窗中匯出完整清單

5. **匯出報表**
   - 使用統計報表中的匯出功能
   - Excel檔案包含三個工作表：統計報表、圖表數據、詳細清單
   - 支援PDF、CSV、PowerPoint格式

### 高級功能

#### 年度統計分析
- 儀表板自動顯示最近3年工單分布
- 格式：2025/90 2024/10（年份/數量）
- 協助了解工作量趨勢變化

#### 詳細資料鑽取
- 任何統計數字都可點擊深入分析
- 彈窗顯示前10筆相關工單
- 超過10筆時提供完整清單匯出

#### 多維度篩選
- 時間維度：按月、季、年篩選
- 部門維度：特定部門分析
- 狀態維度：處理狀況分析
- 類別維度：問題類型分析

## 🔧 系統維護

### 資料備份
系統會自動建立備份：
- 位置：`/backups/` 目錄
- 格式：`work_log_backup_時間戳.json`
- 建議定期手動複製重要檔案

### 效能最佳化
- 資料庫索引已最佳化
- 分頁載入提升效能
- 圖表渲染最佳化
- 大量資料匯出最佳化

### 安全性
- JWT Token認證
- 密碼bcrypt加密
- 防止SQL注入
- 操作權限控制

## 🐛 除錯指南

### 常見問題

1. **圖表無法顯示**
   - 檢查Chart.js是否正確載入
   - 確認網路連線正常
   - 檢查瀏覽器console錯誤訊息

2. **統計報表顯示"沒有符合條件的資料"**
   - 檢查JWT Token是否過期（重新登入）
   - 確認資料庫中有資料
   - 檢查篩選條件是否過於嚴格

3. **點擊功能無反應**
   - 檢查瀏覽器console的JavaScript錯誤
   - 確認事件綁定正確執行
   - 檢查this指向是否正確

4. **匯出功能失敗**
   - 檢查XLSX.js庫是否正確載入
   - 確認資料格式正確
   - 檢查瀏覽器下載權限

### 開發者調試

1. **啟用詳細日誌**
```javascript
console.log('詳細調試信息:', data);
```

2. **檢查API響應**
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3009/api/logs
```

3. **資料庫查詢**
```bash
sqlite3 database.db "SELECT * FROM work_logs LIMIT 5;"
```

## 📊 資料結構

### work_logs 表結構
```sql
CREATE TABLE work_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_number TEXT UNIQUE,
    created_date TEXT,
    current_status TEXT,
    improved_status TEXT,
    problem_category TEXT,
    department TEXT,
    extension TEXT,
    reporter TEXT,
    resolver TEXT,
    status TEXT,
    notes TEXT,
    created_by INTEGER,
    updated_date TEXT
);
```

### 狀態值定義
- **處理中** - 工單正在處理中
- **已處理** - 工單已完成處理
- **無法處理** - 由於各種原因無法處理
- **已提出需求** - 已向相關單位提出需求

### 問題類別
- **硬體** - 電腦、伺服器、周邊設備硬體問題
- **軟體** - 應用程式、系統軟體問題
- **網路** - 網路連線、設定問題
- **周邊** - 印表機、掃描器等周邊設備
- **其他** - 其他類型問題

## 🔄 版本歷史

### v1.0 - 完整統計報表功能 (2025-08-24)
- ✅ 實現完整的工單管理功能
- ✅ 新增互動式統計報表
- ✅ 圖表和表格點擊功能
- ✅ 多格式匯出功能
- ✅ 詳細資料鑽取分析
- ✅ 年度統計功能
- ✅ 響應式設計優化

### 重要檔案變更記錄

#### `/public/script.js` - 主要前端邏輯
- **新增功能**：
  - `showChartDetails()` - 圖表點擊詳細資訊
  - `renderDetailsModal()` - 詳細資訊彈窗
  - `exportDetailsToExcel()` - 專用Excel匯出
  - `exportDetailsToCsv()` - 專用CSV匯出
  - `calculateYearlyStats()` - 年度統計計算
  
- **修改功能**：
  - `renderChart()` - 添加onClick事件處理
  - `renderStatsTable()` - 數字添加點擊功能
  - `exportToExcel()` - 添加詳細清單工作表
  - `updateDashboardData()` - 年度統計顯示

#### `/src/server.js` - 後端API
- **API端點**：維持原有結構，無重大變更
- **資料庫查詢**：優化欄位映射邏輯

#### `/public/index.html` - 主頁面
- **新增元素**：統計報表modal、詳細資訊modal
- **Chart.js版本**：使用3.9.1穩定版本

## 🚀 部署和版本控制建議

### 1. Git版本控制設置

```bash
# 初始化Git倉庫
git init

# 添加.gitignore
echo "node_modules/" > .gitignore
echo "database.db" >> .gitignore
echo "backups/*.json" >> .gitignore
echo "*.log" >> .gitignore

# 提交初始版本
git add .
git commit -m "Initial commit - v1.0 完整統計報表功能"

# 創建版本標籤
git tag -a v1.0 -m "v1.0 - 完整統計報表功能發布"
```

### 2. 分支策略

```bash
# 主要分支
main        # 生產環境穩定版本
develop     # 開發分支
feature/*   # 功能開發分支

# 創建開發分支
git checkout -b develop
git checkout -b feature/new-reports
```

### 3. 自動備份腳本

創建 `backup-script.bat` (Windows):
```batch
@echo off
set BACKUP_DIR=backups\daily\%date:~0,4%%date:~5,2%%date:~8,2%
mkdir "%BACKUP_DIR%"
copy database.db "%BACKUP_DIR%\"
copy /s src "%BACKUP_DIR%\src\"
copy /s public "%BACKUP_DIR%\public\"
copy package.json "%BACKUP_DIR%\"
echo 備份完成: %BACKUP_DIR%
```

### 4. 部署檢查清單

- [ ] 確認Node.js版本 (>= 14.0)
- [ ] 安裝依賴：`npm install`
- [ ] 檢查端口設定 (預設3009)
- [ ] 確認資料庫檔案權限
- [ ] 測試登入功能 (admin/admin123)
- [ ] 驗證統計報表功能
- [ ] 測試匯出功能
- [ ] 檢查備份目錄權限

### 5. 環境配置

#### 開發環境
```bash
# .env.development
PORT=3009
NODE_ENV=development
JWT_SECRET=dev-secret-key
```

#### 生產環境
```bash
# .env.production  
PORT=3008
NODE_ENV=production
JWT_SECRET=your-secure-secret-key
```

## 📞 技術支援

### 聯絡資訊
- **系統管理員**：資訊組
- **維護週期**：每周檢查
- **備份頻率**：每日自動備份

### 問題回報
請在問題回報時提供：
1. 錯誤畫面截圖
2. 瀏覽器Console錯誤訊息
3. 操作步驟重現
4. 使用的瀏覽器版本

---

**最後更新：2025-08-24**  
**版本：v1.0**  
**文件維護者：資訊組**  
**系統狀態：✅ 生產就緒**