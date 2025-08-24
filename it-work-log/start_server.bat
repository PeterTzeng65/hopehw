@echo off
title 資訊組工作日誌管理系統
echo ========================================
echo 資訊組工作日誌管理系統
echo ========================================
echo.
echo 正在啟動伺服器...
echo.

:: 啟動伺服器
npm start

if %errorlevel% neq 0 (
    echo.
    echo 錯誤：伺服器啟動失敗
    echo 請檢查：
    echo 1. Node.js 是否已安裝
    echo 2. 依賴是否已安裝 (執行 setup_windows.bat)
    echo 3. 端口 3008 是否被占用
    echo.
    pause
    exit /b 1
)

pause