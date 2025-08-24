# 版本控制與備份策略

## 📋 目前狀態 (2025-08-24)

### ✅ 已完成的備份
- **完整系統備份**：`/backups/v1.0-完整統計報表功能-20250824/`
- **資料庫備份**：`/backups/work_log_backup_2025-08-23T22-54-52-980Z.json`
- **完整文件**：`README.md` 和 `SYSTEM_GUIDE_v1.0.md`

## 🎯 版本控制建議

### 選項 1：Git + GitHub (推薦)

#### 優點：
- ✅ 完整的版本歷史追蹤
- ✅ 分支管理和合併功能
- ✅ 協同開發支援
- ✅ 免費的雲端備份
- ✅ 問題追蹤 (Issues)
- ✅ 代碼回顧機制

#### 設置步驟：
```bash
# 1. 初始化 Git
git init

# 2. 創建 .gitignore
cat > .gitignore << EOF
# Dependencies
node_modules/

# Database (exclude from version control)
database.db
database/*.db

# Backups (too large for git)
backups/*.json
backups/v*/

# Logs
*.log
npm-debug.log*

# Environment files
.env
.env.local
.env.production

# IDE files
.vscode/
.idea/

# OS generated files
.DS_Store
Thumbs.db
EOF

# 3. 添加所有文件
git add .

# 4. 初始提交
git commit -m "🎉 Initial commit: v1.0 - 完整統計報表功能

- ✅ 工單管理系統
- ✅ 互動式統計報表  
- ✅ 圖表和表格點擊功能
- ✅ 多格式匯出 (Excel/PDF/CSV)
- ✅ 年度統計分析
- ✅ 詳細資料鑽取功能"

# 5. 創建版本標籤
git tag -a v1.0 -m "v1.0 - 完整統計報表功能發布"

# 6. 推送到 GitHub (需先創建倉庫)
# git remote add origin https://github.com/your-org/it-work-log.git
# git push -u origin main
# git push --tags
```

### 選項 2：本地文件夾版本控制 (簡單)

#### 適用情況：
- 小團隊或個人維護
- 不需要複雜的版本管理
- 主要關注備份和恢復

#### 目錄結構：
```
it-work-log-versions/
├── v1.0-20250824-完整統計報表功能/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── README.md
│   └── CHANGELOG.md
├── v1.1-未來版本/
└── backups/
    ├── database-backups/
    └── daily-snapshots/
```

## 🔄 分支策略 (Git使用)

### 簡化的GitFlow模型

```bash
# 主要分支
main        # 🏷️  生產環境穩定版本
develop     # 🚧  開發分支 
feature/*   # 💡  功能開發分支
hotfix/*    # 🚨  緊急修復分支

# 示例工作流程
git checkout develop
git checkout -b feature/enhanced-reports
# ... 開發新功能 ...
git add .
git commit -m "✨ Add new trend analysis feature"
git checkout develop  
git merge feature/enhanced-reports
git branch -d feature/enhanced-reports

# 發布新版本
git checkout main
git merge develop
git tag -a v1.1 -m "v1.1 - 新增趨勢分析功能"
```

## 📁 備份策略

### 1. 自動備份腳本

#### Windows批次檔 (`daily-backup.bat`)：
```batch
@echo off
setlocal enabledelayedexpansion

:: 設定變數
set PROJECT_DIR=%~dp0
set BACKUP_ROOT=%PROJECT_DIR%backups\daily
set DATE_STAMP=%date:~0,4%%date:~5,2%%date:~8,2%
set TIME_STAMP=%time:~0,2%%time:~3,2%%time:~6,2%
set TIME_STAMP=!TIME_STAMP: =0!
set BACKUP_DIR=%BACKUP_ROOT%\%DATE_STAMP%-%TIME_STAMP%

:: 創建備份目錄
mkdir "%BACKUP_DIR%" 2>nul

:: 備份核心文件
echo 📁 備份核心文件到: %BACKUP_DIR%
xcopy "%PROJECT_DIR%src" "%BACKUP_DIR%\src\" /E /I /H /Y
xcopy "%PROJECT_DIR%public" "%BACKUP_DIR%\public\" /E /I /H /Y  
copy "%PROJECT_DIR%package.json" "%BACKUP_DIR%\"
copy "%PROJECT_DIR%README.md" "%BACKUP_DIR%\"
copy "%PROJECT_DIR%SYSTEM_GUIDE_v1.0.md" "%BACKUP_DIR%\"

:: 備份資料庫
if exist "%PROJECT_DIR%database.db" (
    copy "%PROJECT_DIR%database.db" "%BACKUP_DIR%\"
    echo ✅ 資料庫備份完成
) else (
    echo ⚠️  資料庫檔案不存在
)

:: 創建備份報告
echo 📊 備份報告 > "%BACKUP_DIR%\backup-report.txt"
echo 備份時間: %date% %time% >> "%BACKUP_DIR%\backup-report.txt" 
echo 備份位置: %BACKUP_DIR% >> "%BACKUP_DIR%\backup-report.txt"
dir "%BACKUP_DIR%" >> "%BACKUP_DIR%\backup-report.txt"

echo.
echo ✅ 備份完成！
echo 📁 備份位置: %BACKUP_DIR%
echo.
pause
```

#### Linux/Mac腳本 (`daily-backup.sh`)：
```bash
#!/bin/bash

# 設定變數
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_ROOT="${PROJECT_DIR}/backups/daily"
DATE_STAMP=$(date +%Y%m%d)
TIME_STAMP=$(date +%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${DATE_STAMP}-${TIME_STAMP}"

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

echo "📁 備份核心文件到: $BACKUP_DIR"

# 備份核心文件
cp -r "${PROJECT_DIR}/src" "$BACKUP_DIR/"
cp -r "${PROJECT_DIR}/public" "$BACKUP_DIR/"
cp "${PROJECT_DIR}/package.json" "$BACKUP_DIR/"
cp "${PROJECT_DIR}/README.md" "$BACKUP_DIR/"
cp "${PROJECT_DIR}/SYSTEM_GUIDE_v1.0.md" "$BACKUP_DIR/"

# 備份資料庫
if [ -f "${PROJECT_DIR}/database.db" ]; then
    cp "${PROJECT_DIR}/database.db" "$BACKUP_DIR/"
    echo "✅ 資料庫備份完成"
else
    echo "⚠️ 資料庫檔案不存在"
fi

# 創建備份報告
{
    echo "📊 備份報告"
    echo "備份時間: $(date)"
    echo "備份位置: $BACKUP_DIR"
    echo ""
    ls -la "$BACKUP_DIR"
} > "$BACKUP_DIR/backup-report.txt"

echo ""
echo "✅ 備份完成！"
echo "📁 備份位置: $BACKUP_DIR"
```

### 2. 排程備份

#### Windows工作排程器：
```batch
:: 創建每日備份任務
schtasks /create /tn "IT工作日誌每日備份" /tr "%CD%\daily-backup.bat" /sc daily /st 23:00
```

#### Linux Crontab：
```bash
# 每天晚上11點執行備份
0 23 * * * /path/to/it-work-log/daily-backup.sh
```

## 📋 版本發布檢查清單

### 發布前檢查
- [ ] 所有功能測試通過
- [ ] 無嚴重Bug或錯誤
- [ ] 文件更新完整 (README.md, SYSTEM_GUIDE)
- [ ] 備份當前穩定版本
- [ ] 資料庫遷移腳本 (如需要)

### 發布步驟
1. **創建發布分支**
   ```bash
   git checkout develop
   git checkout -b release/v1.1
   ```

2. **最終測試和調整**
   ```bash
   # 運行所有測試
   npm test
   # 版本號更新
   npm version minor
   ```

3. **合併到主分支**
   ```bash
   git checkout main
   git merge release/v1.1
   git tag -a v1.1 -m "v1.1 - 新功能發布"
   ```

4. **部署到生產環境**
   ```bash
   # 備份生產環境
   # 部署新版本
   # 驗證功能正常
   ```

## 🚨 緊急回復程序

### 如果需要快速回復到v1.0：

1. **使用Git回復**：
   ```bash
   git checkout v1.0
   git checkout -b hotfix/restore-v1.0
   # 確認功能正常後
   git checkout main
   git merge hotfix/restore-v1.0
   ```

2. **使用備份回復**：
   - 停止服務：`pm2 stop it-work-log`
   - 複製備份檔案覆蓋當前版本
   - 恢復資料庫：`cp backup/database.db ./database.db`  
   - 重啟服務：`pm2 start it-work-log`

3. **資料庫回復**：
   ```bash
   # 使用JSON備份恢復
   node src/restore.js backups/work_log_backup_2025-08-23T22-54-52-980Z.json
   ```

## 📞 維護聯絡資訊

- **主要維護者**：資訊組
- **緊急聯絡**：系統管理員
- **備份檢查**：每週一次
- **版本發布**：依需求不定期

---

**文件建立：2025-08-24**  
**適用版本：v1.0+**  
**維護者：資訊組**