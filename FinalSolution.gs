// 這是最終解決方案 - 使用試算表觸發器
function setupSpreadsheetTrigger() {
  // 使用你的統計表 ID
  const SPREADSHEET_ID = '1qZGYya3iRy0QLPNP_y4ipB4t3sLzgrisam9i2ntO3kI';
  
  try {
    // 開啟統計表
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 刪除舊觸發器
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onSpreadsheetEdit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 建立試算表編輯觸發器
    const trigger = ScriptApp.newTrigger('onSpreadsheetEdit')
      .spreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
    
    Logger.log('✅ 觸發器設定成功！');
    Logger.log('觸發器 ID: ' + trigger.getUniqueId());
    Logger.log('現在表單提交會自動處理訂單');
    
  } catch (error) {
    Logger.log('❌ 錯誤: ' + error.toString());
  }
}

// 當表單提交到試算表時觸發
function onSpreadsheetEdit(e) {
  try {
    // 確保是表單提交事件
    if (!e || !e.namedValues) {
      return;
    }
    
    Logger.log('🎉 收到新訂單！');
    
    // 從 namedValues 取得資料
    const responses = e.namedValues;
    
    let customerName = responses['姓名'] ? responses['姓名'][0] : '';
    let customerPhone = responses['聯絡電話'] ? responses['聯絡電話'][0] : '';
    let pickupTime = responses['取餐時間'] ? responses['取餐時間'][0] : '';
    let milkTea = responses['奶茶系列'] ? responses['奶茶系列'][0] : '';
    let special = responses['特調系列'] ? responses['特調系列'][0] : '';
    let notes = responses['備註'] ? responses['備註'][0] : '';
    
    // 計算價格
    let totalPrice = 0;
    if (milkTea && milkTea !== '不選購') {
      totalPrice += extractPrice(milkTea);
    }
    if (special && special !== '不選購') {
      totalPrice += extractPrice(special);
    }
    
    // 更新統計表
    updateOrderSummary(customerName, customerPhone, pickupTime, milkTea, special, notes, totalPrice);
    
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

function updateOrderSummary(name, phone, time, milkTea, special, notes, total) {
  try {
    // 開啟統計表
    const SPREADSHEET_ID = '1qZGYya3iRy0QLPNP_y4ipB4t3sLzgrisam9i2ntO3kI';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 取得或建立訂單總表
    let summarySheet = spreadsheet.getSheetByName('訂單總表');
    if (!summarySheet) {
      summarySheet = spreadsheet.insertSheet('訂單總表');
      
      // 建立標題行
      summarySheet.getRange(1, 1, 1, 9).setValues([
        ['訂購時間', '店名', '聯絡電話', '客戶姓名', '客戶電話', '取餐時間', '訂購清單', '備註', '總價格']
      ]);
      
      // 設定標題樣式
      const headerRange = summarySheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('white');
    }
    
    // 整理訂購清單
    let orderList = [];
    if (milkTea && milkTea !== '不選購') orderList.push('🥤 ' + milkTea);
    if (special && special !== '不選購') orderList.push('🍹 ' + special);
    const orderText = orderList.join('\n');
    
    // 新增訂單資料
    const newRow = summarySheet.getLastRow() + 1;
    summarySheet.getRange(newRow, 1, 1, 9).setValues([[
      new Date(),
      'MAYI 滿溢茶飲',
      '請更新店家電話',
      name,
      phone,
      time,
      orderText,
      notes,
      '$ ' + total
    ]]);
    
    // 美化新增的行
    const newRowRange = summarySheet.getRange(newRow, 1, 1, 9);
    newRowRange.setBorder(true, true, true, true, true, true);
    
    if (total > 0) {
      newRowRange.setBackground('#E8F5E8'); // 淺綠色背景
    }
    
    // 自動調整欄寬
    summarySheet.autoResizeColumns(1, 9);
    
    Logger.log('📊 訂單已新增到統計表');
    
  } catch (error) {
    Logger.log('❌ 更新統計表錯誤: ' + error.toString());
  }
}

// 測試函數
function testOrderProcessing() {
  const testData = {
    namedValues: {
      '姓名': ['測試客戶'],
      '聯絡電話': ['0912345678'],
      '取餐時間': ['下午2點'],
      '奶茶系列': ['茉莉奶綠 M杯 $45'],
      '特調系列': ['不選購'],
      '備註': ['少糖少冰']
    }
  };
  
  onSpreadsheetEdit(testData);
  Logger.log('測試完成');
}