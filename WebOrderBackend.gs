// 建立簡化的接收表單
function createWebOrderForm() {
  const form = FormApp.create('MAYI 滿溢茶飲 - 網頁訂單接收');
  
  form.setDescription('此表單用於接收網頁訂購系統的訂單資料');
  
  // 基本資訊
  form.addTextItem()
    .setTitle('訂購者')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('聯絡方式')
    .setRequired(true);
    
  // 客製化選項
  form.addTextItem()
    .setTitle('冰塊程度')
    .setRequired(false);
    
  form.addTextItem()
    .setTitle('糖分程度')
    .setRequired(false);
    
  form.addTextItem()
    .setTitle('奶量程度')
    .setRequired(false);
    
  // 訂單資訊
  form.addParagraphTextItem()
    .setTitle('訂購清單')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('總數量')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('總金額')
    .setRequired(true);
    
  form.addParagraphTextItem()
    .setTitle('備註')
    .setRequired(false);
  
  // 建立試算表
  const spreadsheet = SpreadsheetApp.create('MAYI滿溢茶飲網頁訂單統計');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  Logger.log('=== 網頁訂單接收系統建立成功 ===');
  Logger.log('📝 表單連結: ' + form.getPublishedUrl());
  Logger.log('✏️ 編輯表單: ' + form.getEditUrl());
  Logger.log('📊 統計表連結: ' + spreadsheet.getUrl());
  
  // 取得表單 ID 供網頁使用
  const formId = form.getId();
  Logger.log('🔗 表單 ID: ' + formId);
  Logger.log('');
  Logger.log('請將此表單 ID 更新到網頁的 submitOrder() 函數中');
  
  return {
    formUrl: form.getPublishedUrl(),
    formEditUrl: form.getEditUrl(),
    spreadsheetUrl: spreadsheet.getUrl(),
    formId: formId
  };
}

// 處理網頁訂單
function onWebOrderSubmit(e) {
  try {
    Logger.log('🌐 收到網頁訂單！');
    
    const itemResponses = e.response.getItemResponses();
    
    let orderData = {
      customer: '',
      contact: '',
      ice: '',
      sugar: '',
      milk: '',
      orderList: '',
      totalQty: 0,
      totalAmount: 0,
      notes: ''
    };
    
    // 處理回應
    itemResponses.forEach(itemResponse => {
      const title = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      
      switch(title) {
        case '訂購者':
          orderData.customer = answer;
          break;
        case '聯絡方式':
          orderData.contact = answer;
          break;
        case '冰塊程度':
          orderData.ice = answer;
          break;
        case '糖分程度':
          orderData.sugar = answer;
          break;
        case '奶量程度':
          orderData.milk = answer;
          break;
        case '訂購清單':
          orderData.orderList = answer;
          break;
        case '總數量':
          orderData.totalQty = parseInt(answer) || 0;
          break;
        case '總金額':
          orderData.totalAmount = parseInt(answer) || 0;
          break;
        case '備註':
          orderData.notes = answer || '';
          break;
      }
    });
    
    // 更新美化統計表
    updateWebOrderSheet(orderData);
    
    Logger.log('✅ 網頁訂單處理完成: ' + orderData.customer + ' - $' + orderData.totalAmount);
    
  } catch (error) {
    Logger.log('❌ 處理網頁訂單錯誤: ' + error.toString());
  }
}

function updateWebOrderSheet(orderData) {
  try {
    // 找到統計表
    const files = DriveApp.getFilesByName('MAYI滿溢茶飲網頁訂單統計');
    if (!files.hasNext()) {
      Logger.log('找不到統計表');
      return;
    }
    
    const spreadsheet = SpreadsheetApp.openById(files.next().getId());
    let summarySheet = spreadsheet.getSheetByName('🌐 網頁訂單總表');
    
    if (!summarySheet) {
      summarySheet = spreadsheet.insertSheet('🌐 網頁訂單總表');
      
      // 建立標題行
      summarySheet.getRange(1, 1, 1, 11).setValues([
        ['📅 訂購時間', '👤 訂購者', '📱 聯絡方式', '❄️ 冰塊', '🍯 糖分', '🥛 奶量', '🛒 訂購清單', '🔢 總數量', '💰 總金額', '📝 備註', '✅ 狀態']
      ]);
      
      // 設定標題樣式
      const headerRange = summarySheet.getRange(1, 1, 1, 11);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('white');
      headerRange.setBorder(true, true, true, true, true, true);
    }
    
    // 新增訂單資料
    const newRow = summarySheet.getLastRow() + 1;
    const currentTime = new Date();
    const timeStr = Utilities.formatDate(currentTime, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
    
    summarySheet.getRange(newRow, 1, 1, 11).setValues([[
      timeStr,
      orderData.customer,
      orderData.contact,
      orderData.ice,
      orderData.sugar,
      orderData.milk,
      orderData.orderList.replace(/\\n/g, '\n'), // 處理換行符號
      orderData.totalQty,
      '$' + orderData.totalAmount,
      orderData.notes,
      '待處理'
    ]]);
    
    // 美化新增的行
    const newRowRange = summarySheet.getRange(newRow, 1, 1, 11);
    newRowRange.setBorder(true, true, true, true, true, true);
    
    // 根據金額設定背景色
    if (orderData.totalAmount >= 500) {
      newRowRange.setBackground('#E8F5E8'); // 大單：淺綠色
    } else if (orderData.totalAmount >= 200) {
      newRowRange.setBackground('#FFF3E0'); // 中單：淺橘色
    } else {
      newRowRange.setBackground('#F0F8FF'); // 小單：淺藍色
    }
    
    // 自動調整欄寬
    summarySheet.autoResizeColumns(1, 11);
    
    // 將統計表移到最前面
    spreadsheet.setActiveSheet(summarySheet);
    spreadsheet.moveActiveSheet(1);
    
    Logger.log('📊 網頁訂單已新增到統計表第 ' + newRow + ' 行');
    
  } catch (error) {
    Logger.log('❌ 更新網頁訂單統計表錯誤: ' + error.toString());
  }
}

// 更新網頁中的表單提交 URL
function getFormSubmitUrl() {
  // 先執行 createWebOrderForm() 取得表單 ID
  const FORM_ID = 'YOUR_FORM_ID_HERE'; // 需要更新為實際的表單 ID
  
  const submitUrl = `https://docs.google.com/forms/d/${FORM_ID}/formResponse`;
  
  Logger.log('表單提交 URL: ' + submitUrl);
  Logger.log('');
  Logger.log('請將此 URL 更新到網頁的 JavaScript 中');
  
  return submitUrl;
}

// 測試網頁訂單系統
function testWebOrderSystem() {
  Logger.log('🧪 測試網頁訂單系統...');
  
  const testData = {
    customer: '研發部-張小華',
    contact: '分機456',
    ice: '少冰',
    sugar: '半糖',
    milk: '正常奶',
    orderList: '茉莉奶綠 M × 3 = $135\n滿溢珍珠奶茶 L × 2 = $110\n異漾凍飲 M × 1 = $70',
    totalQty: 6,
    totalAmount: 315,
    notes: '會議室取貨，謝謝！'
  };
  
  updateWebOrderSheet(testData);
  
  Logger.log('✅ 測試完成！');
  Logger.log('📊 請檢查統計表是否正確顯示');
}