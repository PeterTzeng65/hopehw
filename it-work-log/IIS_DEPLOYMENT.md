# IIS 部署指南

## 前置需求

### 1. 安裝 IIS 功能
在 Windows Server 或 Windows 10/11 上啟用以下 IIS 功能：
- Internet Information Services (IIS)
- IIS Management Console
- World Wide Web Services
- HTTP Redirection
- Static Content Compression
- Dynamic Content Compression

### 2. 安裝 Node.js
- 下載並安裝 [Node.js LTS 版本](https://nodejs.org/)
- 確認安裝成功：`node --version` 和 `npm --version`

### 3. 安裝 iisnode
- 下載並安裝 [iisnode](https://github.com/Azure/iisnode)
- 根據您的系統選擇 x64 或 x86 版本

## 部署步驟

### 步驟 1：準備應用程式檔案
```powershell
# 1. 將整個 it-work-log 資料夾複製到 IIS 網站根目錄
# 例如：C:\inetpub\wwwroot\it-work-log\

# 2. 安裝生產依賴
cd C:\inetpub\wwwroot\it-work-log
npm install --production

# 3. 設定資料夾權限
icacls . /grant "IIS_IUSRS:(OI)(CI)(F)"
icacls database /grant "IIS_IUSRS:(OI)(CI)(F)"
icacls backups /grant "IIS_IUSRS:(OI)(CI)(F)"
```

### 步驟 2：設定 IIS 網站
1. 開啟 IIS Manager
2. 建立新網站或設定預設網站
3. 設定實體路徑到應用程式資料夾
4. 設定應用程式池：
   - .NET CLR 版本：無受控程式碼
   - 管線模式：整合式
   - 身分識別：ApplicationPoolIdentity

### 步驟 3：設定環境變數
在 IIS Manager 中設定應用程式設定：
- NODE_ENV = production
- JWT_SECRET = [您的安全金鑰]
- SESSION_SECRET = [您的工作階段金鑰]

### 步驟 4：設定 web.config
確認 web.config 檔案已正確設定（已提供）

### 步驟 5：測試部署
```powershell
# 檢查網站是否正常啟動
# 瀏覽到：http://localhost/it-work-log
# 或您設定的網站位址
```

## 故障排除

### 常見問題

1. **500 內部伺服器錯誤**
   - 檢查 iisnode 日誌：`iisnode` 資料夾
   - 確認 Node.js 路徑正確
   - 檢查檔案權限

2. **404 錯誤**
   - 檢查 web.config 重寫規則
   - 確認靜態檔案路徑

3. **資料庫錯誤**
   - 檢查資料庫檔案權限
   - 確認 SQLite3 可以存取

### 日誌檢查
```powershell
# IIS 日誌位置
C:\inetpub\logs\LogFiles\

# iisnode 日誌位置
C:\inetpub\wwwroot\it-work-log\iisnode\
```

## 安全性設定

### 1. 更改預設密碼
- 修改 `.env.production` 中的 JWT_SECRET
- 登入系統後更改 admin 預設密碼

### 2. HTTPS 設定
- 取得 SSL 憑證
- 在 IIS 中設定 HTTPS 繫結
- 更新 CORS 設定

### 3. 防火牆設定
- 設定防火牆規則
- 限制存取來源 IP（如果需要）

## 效能調校

### 1. IIS 設定
```xml
<!-- 在 web.config 中調整 -->
<iisnode
  nodeProcessCountPerApplication="1"
  maxConcurrentRequestsPerProcess="1024"
  enableXFF="true"
/>
```

### 2. Node.js 應用程式
- 設定適當的記憶體限制
- 啟用壓縮功能

## 備份策略

### 自動備份
系統已內建自動備份功能，備份檔案存放在 `backups` 資料夾

### 手動備份
```powershell
# 備份整個應用程式
xcopy C:\inetpub\wwwroot\it-work-log C:\Backup\it-work-log\ /E /I /Y

# 僅備份資料庫
copy C:\inetpub\wwwroot\it-work-log\database\work_log.db C:\Backup\
```

## 監控建議

1. 設定 Windows Performance Monitor
2. 監控 CPU 和記憶體使用率
3. 定期檢查錯誤日誌
4. 設定磁碟空間警告

## 聯絡資訊

如有部署問題，請聯繫系統管理員或參考：
- [Node.js 官方文件](https://nodejs.org/docs/)
- [iisnode GitHub](https://github.com/Azure/iisnode)
- [IIS 文件](https://docs.microsoft.com/iis/)