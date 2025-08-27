// 最簡單的解決方案 - 手動設定觸發器後使用
function onFormSubmit(e) {
  try {
    Logger.log('🎉 收到新訂單！');
    
    // 從事件取得回應
    const itemResponses = e.response.getItemResponses();
    
    // 初始化變數
    let customerName = '';
    let customerPhone = '';
    let pickupTime = '';
    let milkTea = '';
    let special = '';
    let notes = '';
    let totalPrice = 0;
    
    // 處理每個回應項目
    itemResponses.forEach(itemResponse => {
      const title = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      
      Logger.log(title + ': ' + answer);
      
      switch(title) {
        case '姓名':
          customerName = answer;
          break;
        case '聯絡電話':
          customerPhone = answer;
          break;
        case '取餐時間':
          pickupTime = answer;
          break;
        case '奶茶系列':
          milkTea = answer;
          if (answer && answer !== '不選購') {
            totalPrice += extractPrice(answer);
          }
          break;
        case '特調系列':
          special = answer;
          if (answer && answer !== '不選購') {
            totalPrice += extractPrice(answer);
          }
          break;
        case '備註':
          notes = answer || '';
          break;
      }
    });
    
    // 更新統計表
    updateOrderSheet(customerName, customerPhone, pickupTime, milkTea, special, notes, totalPrice);
    
    Logger.log('✅ 訂單處理完成: ' + customerName + ' - $' + totalPrice);
    
  } catch (error) {
    Logger.log('❌ 處理訂單錯誤: ' + error.toString());
  }
}

function extractPrice(option) {
  if (!option) return 0;
  const match = option.match(/\$(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function updateOrderSheet(name, phone, time, milkTea, special, notes, total) {
  try {
    // 使用統計表ID
    const SPREADSHEET_ID = '1qZGYya3iRy0QLPNP_y4ipB4t3sLzgrisam9i2ntO3kI';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 建立訂單總表（新的工作表）
    let summarySheet = spreadsheet.getSheetByName('📋 訂單總表');
    if (!summarySheet) {
      summarySheet = spreadsheet.insertSheet('📋 訂單總表');
      
      // 建立標題行
      summarySheet.getRange(1, 1, 1, 9).setValues([
        ['📅 訂購時間', '🏪 店名', '📞 聯絡電話', '👤 客戶姓名', '📱 客戶電話', '⏰ 取餐時間', '🛒 訂購清單', '📝 備註', '💰 總價格']
      ]);
      
      // 設定標題樣式
      const headerRange = summarySheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('white');
      headerRange.setBorder(true, true, true, true, true, true);
    }
    
    // 整理訂購清單
    let orderList = [];
    if (milkTea && milkTea !== '不選購') orderList.push(milkTea);
    if (special && special !== '不選購') orderList.push(special);
    const orderText = orderList.length > 0 ? orderList.join('\n') : '無訂購項目';
    
    // 新增訂單資料
    const newRow = summarySheet.getLastRow() + 1;
    const currentTime = new Date();
    
    summarySheet.getRange(newRow, 1, 1, 9).setValues([[
      Utilities.formatDate(currentTime, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm'),
      'MAYI 滿溢茶飲',
      '請更新店家電話',
      name,
      phone,
      time,
      orderText,
      notes || '-',
      total > 0 ? '$' + total : '$0'
    ]]);
    
    // 美化新增的行
    const newRowRange = summarySheet.getRange(newRow, 1, 1, 9);
    newRowRange.setBorder(true, true, true, true, true, true);
    
    if (total > 0) {
      newRowRange.setBackground('#E8F5E8'); // 有訂購的用淺綠色
    } else {
      newRowRange.setBackground('#FFF3E0'); // 沒訂購的用淺橘色
    }
    
    // 自動調整欄寬
    summarySheet.autoResizeColumns(1, 9);
    
    // 將工作表移到最前面
    spreadsheet.setActiveSheet(summarySheet);
    spreadsheet.moveActiveSheet(1);
    
    Logger.log('📊 訂單已新增到統計表第 ' + newRow + ' 行');
    
  } catch (error) {
    Logger.log('❌ 更新統計表錯誤: ' + error.toString());
  }
}

// 測試函數
function testSystem() {
  Logger.log('開始測試系統...');
  
  // 直接測試統計表更新
  updateOrderSheet(
    '測試客戶',
    '0912345678', 
    '下午2點',
    '茉莉奶綠 M杯 $45',
    '不選購',
    '少糖少冰',
    45
  );
  
  Logger.log('測試完成！請檢查統計表');
}