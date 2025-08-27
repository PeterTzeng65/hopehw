// Google Apps Script 網頁應用程式 - 直接接收訂單寫入 Sheets
function doPost(e) {
  try {
    // 解析請求資料
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      // 處理表單數據
      data = e.parameter;
    }
    
    // 開啟 Google Sheets
    const SHEET_ID = '1kSZx8YAZTmyy3wx58NzTPw-Z4Q-ptDj-sXy7jehYR64';
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    // 準備寫入的資料
    const timestamp = new Date();
    const rowData = [
      timestamp,
      data.customerName,
      data.customerContact,
      data.detailedItems,
      data.totalQuantity,
      data.totalPrice,
      data.customerNotes || ''
    ];
    
    // 寫入資料到 Sheets
    sheet.appendRow(rowData);
    
    // 回應成功 - 加入 CORS 標頭
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '訂單已成功送出！',
      timestamp: timestamp.toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
  } catch (error) {
    // 回應錯誤 - 加入 CORS 標頭
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: '訂單送出失敗：' + error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
  }
}

// 處理 OPTIONS 請求（CORS 預檢請求）
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

// 處理 GET 請求（測試用）
function doGet(e) {
  return ContentService.createTextOutput('MAYI 訂單系統運行中！');
}

// 測試函數
function testOrderSubmission() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        customerName: '測試用戶',
        customerContact: '0912345678',
        detailedItems: '茉莉奶綠 M杯 x2杯 (少冰/半糖/正常奶)',
        totalQuantity: '2',
        totalPrice: '90',
        customerNotes: 'Apps Script 測試'
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log(result.getContent());
}