function setupFormTrigger() {
  // 從執行記錄中複製你的表單 ID
  // 表單 ID 是 URL 中 /forms/d/ 和 /edit 之間的部分
  const FORM_ID = '1Eni0w1nx6alefWEWsAAnRaEl57I6fY0Db133hR7W4fI'; // 從編輯表單連結取得的 ID
  
  try {
    // 取得表單
    const form = FormApp.openById(FORM_ID);
    
    // 刪除現有的觸發器（如果有的話）
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 使用不同的方式建立觸發器
    form.setDestination(FormApp.DestinationType.SPREADSHEET, SpreadsheetApp.getActiveSpreadsheet().getId());
    
    Logger.log('請手動設定觸發器：')
    Logger.log('1. 到觸發器頁面點選 + 新增觸發器');
    Logger.log('2. 函數選擇：onFormSubmit');
    Logger.log('3. 事件來源：來自表單');
    Logger.log('4. 表單選擇：MAYI 滿溢茶飲訂購表單');
    Logger.log('5. 事件類型：提交表單時');
    
    Logger.log('請依照上述步驟手動設定觸發器');
    Logger.log('表單 ID: ' + FORM_ID);
    
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    Logger.log('請確認表單 ID 是否正確');
  }
}

// 表單提交處理函數
function onFormSubmit(e) {
  try {
    Logger.log('表單提交觸發！');
    
    const itemResponses = e.response.getItemResponses();
    
    // 取得回應資料
    let customerName = '';
    let customerPhone = '';
    let pickupTime = '';
    let milkTea = '';
    let special = '';
    let notes = '';
    let totalPrice = 0;
    
    itemResponses.forEach(function(itemResponse) {
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
          notes = answer;
          break;
      }
    });
    
    // 更新統計表
    updateOrderSheet(customerName, customerPhone, pickupTime, milkTea, special, notes, totalPrice);
    
    Logger.log('訂單處理完成: ' + customerName + ' - $' + totalPrice);
    
  } catch (error) {
    Logger.log('處理表單錯誤: ' + error.toString());
  }
}

function extractPrice(option) {
  if (!option) return 0;
  const match = option.match(/\$(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function updateOrderSheet(name, phone, time, milkTea, special, notes, total) {
  try {
    // 找到統計表
    const files = DriveApp.getFilesByName('MAYI滿溢茶飲訂單統計');
    if (!files.hasNext()) {
      Logger.log('找不到統計表');
      return;
    }
    
    const spreadsheet = SpreadsheetApp.openById(files.next().getId());
    let sheet = spreadsheet.getSheetByName('訂單總表');
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet('訂單總表');
      // 建立標題
      sheet.getRange(1, 1, 1, 9).setValues([
        ['訂購時間', '店名', '聯絡電話', '客戶姓名', '客戶電話', '取餐時間', '訂購清單', '備註', '總價格']
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }
    
    // 整理訂購清單
    let orderList = [];
    if (milkTea && milkTea !== '不選購') orderList.push(milkTea);
    if (special && special !== '不選購') orderList.push(special);
    const orderText = orderList.join(';\n');
    
    // 新增資料
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 9).setValues([[
      new Date(),
      'MAYI 滿溢茶飲',
      '請更新店家電話',
      name,
      phone,
      time,
      orderText,
      notes,
      total
    ]]);
    
    // 自動調整欄寬
    sheet.autoResizeColumns(1, 9);
    
    Logger.log('訂單已新增到統計表');
    
  } catch (error) {
    Logger.log('更新統計表錯誤: ' + error.toString());
  }
}