function createCompanyDrinkOrderForm() {
  // 建立新的Google表單
  const form = FormApp.create('MAYI 滿溢茶飲 - 公司團購訂單');
  
  // 設定表單描述
  form.setDescription('🏢 公司會議團購訂飲料！個人或組別都可以訂購，請詳細填寫客製化選項。');
  
  // 訂購者基本資訊
  form.addTextItem()
    .setTitle('👤 訂購者姓名/組別名稱')
    .setHelpText('例如：王小明、財務部、研發組')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('📱 聯絡方式')
    .setHelpText('分機或手機號碼')
    .setRequired(true);
  
  // 分隔線
  form.addSectionHeaderItem()
    .setTitle('🥤 奶茶系列訂購');
  
  // 奶茶系列 - 改為網格問題
  createDrinkOrderSection(form, '奶茶系列', [
    '可可風味奶茶 M杯 $50',
    '可可風味奶茶 L杯 $60', 
    '茉莉奶綠 M杯 $45',
    '茉莉奶綠 L杯 $50',
    '滿溢珍珠奶茶 M杯 $50',
    '滿溢珍珠奶茶 L杯 $55',
    '滿溢烤香奶茶 M杯 $50',
    '滿溢烤香奶茶 L杯 $55',
    '炭燒烏龍奶茶 M杯 $50',
    '炭燒烏龍奶茶 L杯 $55',
    '布丁伯爵奶茶 M杯 $50',
    '布丁伯爵奶茶 L杯 $60'
  ]);
  
  // 分隔線
  form.addSectionHeaderItem()
    .setTitle('🍹 特調系列訂購');
    
  createDrinkOrderSection(form, '特調系列', [
    '嚴選雲南昆明茶 $55',
    '茉莉原萃綠茶奶霜 $55',
    '蜜柚高麗綠茶奶霜 $55',
    '炭焙高山烏龍奶霜 $55',
    '異漾凍飲 M杯 $70',
    '異漾凍飲 L杯 $75',
    '貴妃荔枝紅茶凍飲 M杯 $75',
    '貴妃荔枝紅茶凍飲 L杯 $80',
    '冰鎮蘋果氣泡飲 $75',
    '冰鎮百香果氣泡飲 $75'
  ]);
  
  // 備註
  form.addParagraphTextItem()
    .setTitle('📝 特殊需求備註')
    .setHelpText('其他特殊要求或備註事項');
  
  // 建立回應試算表
  const spreadsheet = SpreadsheetApp.create('MAYI滿溢茶飲公司團購統計');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  Logger.log('=== 公司團購表單建立成功 ===');
  Logger.log('📝 表單連結: ' + form.getPublishedUrl());
  Logger.log('✏️ 編輯表單: ' + form.getEditUrl());
  Logger.log('📊 統計表連結: ' + spreadsheet.getUrl());
  
  return {
    formUrl: form.getPublishedUrl(),
    formEditUrl: form.getEditUrl(),
    spreadsheetUrl: spreadsheet.getUrl()
  };
}

function createDrinkOrderSection(form, sectionName, drinks) {
  // 為每個飲料建立訂購區塊
  drinks.forEach((drink, index) => {
    const drinkName = drink.split(' $')[0]; // 取得飲料名稱（去除價格）
    
    // 數量選擇
    form.addMultipleChoiceItem()
      .setTitle(`${drinkName} - 數量`)
      .setChoiceValues(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'])
      .setRequired(false);
    
    // 冰塊程度 (3-8)
    form.addMultipleChoiceItem()
      .setTitle(`${drinkName} - 冰塊程度`)
      .setChoiceValues(['不適用', '3分冰', '4分冰', '5分冰（正常）', '6分冰', '7分冰', '8分冰（去冰）'])
      .setRequired(false);
    
    // 糖分程度 (3-8) 
    form.addMultipleChoiceItem()
      .setTitle(`${drinkName} - 糖分程度`)
      .setChoiceValues(['不適用', '3分糖', '4分糖', '5分糖（正常）', '6分糖', '7分糖', '8分糖（無糖）'])
      .setRequired(false);
    
    // 奶量程度 (3-8)
    form.addMultipleChoiceItem()
      .setTitle(`${drinkName} - 奶量程度`)
      .setChoiceValues(['不適用', '3分奶', '4分奶', '5分奶（正常）', '6分奶', '7分奶', '8分奶（濃奶）'])
      .setRequired(false);
      
    // 分隔線（除了最後一個）
    if (index < drinks.length - 1) {
      form.addPageBreakItem().setTitle('---');
    }
  });
}

// 處理公司團購表單提交
function onCompanyFormSubmit(e) {
  try {
    Logger.log('🏢 收到公司團購訂單！');
    
    const itemResponses = e.response.getItemResponses();
    
    // 基本資訊
    let orderInfo = {
      orderBy: '',
      contact: '',
      notes: '',
      items: [],
      totalAmount: 0
    };
    
    // 處理回應
    itemResponses.forEach(itemResponse => {
      const title = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      
      if (title.includes('訂購者姓名') || title.includes('組別名稱')) {
        orderInfo.orderBy = answer;
      } else if (title.includes('聯絡方式')) {
        orderInfo.contact = answer;
      } else if (title.includes('備註')) {
        orderInfo.notes = answer;
      } else if (title.includes('數量') && answer !== '0') {
        // 處理飲料訂購
        processDrinkOrder(title, answer, itemResponses, orderInfo);
      }
    });
    
    // 更新統計表
    updateCompanyOrderSheet(orderInfo);
    
    Logger.log('✅ 公司團購訂單處理完成: ' + orderInfo.orderBy + ' - 總金額: $' + orderInfo.totalAmount);
    
  } catch (error) {
    Logger.log('❌ 處理團購訂單錯誤: ' + error.toString());
  }
}

function processDrinkOrder(quantityTitle, quantity, allResponses, orderInfo) {
  // 從數量標題取得飲料名稱
  const drinkName = quantityTitle.replace(' - 數量', '');
  
  // 找出對應的客製選項
  let iceLevel = '5分冰（正常）';
  let sugarLevel = '5分糖（正常）';
  let milkLevel = '5分奶（正常）';
  
  allResponses.forEach(response => {
    const title = response.getItem().getTitle();
    const answer = response.getResponse();
    
    if (title === `${drinkName} - 冰塊程度` && answer !== '不適用') {
      iceLevel = answer;
    } else if (title === `${drinkName} - 糖分程度` && answer !== '不適用') {
      sugarLevel = answer;
    } else if (title === `${drinkName} - 奶量程度` && answer !== '不適用') {
      milkLevel = answer;
    }
  });
  
  // 計算價格
  const price = getDrinkPrice(drinkName);
  const totalPrice = price * parseInt(quantity);
  
  // 加入訂單項目
  orderInfo.items.push({
    name: drinkName,
    quantity: quantity,
    price: price,
    totalPrice: totalPrice,
    ice: iceLevel,
    sugar: sugarLevel,
    milk: milkLevel
  });
  
  orderInfo.totalAmount += totalPrice;
}

function getDrinkPrice(drinkName) {
  // 價格對應表
  const priceMap = {
    '可可風味奶茶 M杯': 50,
    '可可風味奶茶 L杯': 60,
    '茉莉奶綠 M杯': 45,
    '茉莉奶綠 L杯': 50,
    '滿溢珍珠奶茶 M杯': 50,
    '滿溢珍珠奶茶 L杯': 55,
    '滿溢烤香奶茶 M杯': 50,
    '滿溢烤香奶茶 L杯': 55,
    '炭燒烏龍奶茶 M杯': 50,
    '炭燒烏龍奶茶 L杯': 55,
    '布丁伯爵奶茶 M杯': 50,
    '布丁伯爵奶茶 L杯': 60,
    '嚴選雲南昆明茶': 55,
    '茉莉原萃綠茶奶霜': 55,
    '蜜柚高麗綠茶奶霜': 55,
    '炭焙高山烏龍奶霜': 55,
    '異漾凍飲 M杯': 70,
    '異漾凍飲 L杯': 75,
    '貴妃荔枝紅茶凍飲 M杯': 75,
    '貴妃荔枝紅茶凍飲 L杯': 80,
    '冰鎮蘋果氣泡飲': 75,
    '冰鎮百香果氣泡飲': 75
  };
  
  return priceMap[drinkName] || 0;
}

function updateCompanyOrderSheet(orderInfo) {
  try {
    // 找到統計表
    const files = DriveApp.getFilesByName('MAYI滿溢茶飲公司團購統計');
    if (!files.hasNext()) {
      Logger.log('找不到統計表');
      return;
    }
    
    const spreadsheet = SpreadsheetApp.openById(files.next().getId());
    let summarySheet = spreadsheet.getSheetByName('🏢 團購訂單總表');
    
    if (!summarySheet) {
      summarySheet = spreadsheet.insertSheet('🏢 團購訂單總表');
      
      // 建立標題行
      summarySheet.getRange(1, 1, 1, 10).setValues([
        ['📅 訂購時間', '👤 訂購者', '📱 聯絡方式', '🍹 飲料名稱', '🔢 數量', '❄️ 冰塊', '🍯 糖分', '🥛 奶量', '💰 單價', '💵 小計']
      ]);
      
      // 設定標題樣式
      const headerRange = summarySheet.getRange(1, 1, 1, 10);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('white');
      headerRange.setBorder(true, true, true, true, true, true);
    }
    
    // 為每個訂購項目新增一行
    const currentTime = new Date();
    const timeStr = Utilities.formatDate(currentTime, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
    
    orderInfo.items.forEach(item => {
      const newRow = summarySheet.getLastRow() + 1;
      
      summarySheet.getRange(newRow, 1, 1, 10).setValues([[
        timeStr,
        orderInfo.orderBy,
        orderInfo.contact,
        item.name,
        item.quantity,
        item.ice,
        item.sugar,
        item.milk,
        '$' + item.price,
        '$' + item.totalPrice
      ]]);
      
      // 美化新增的行
      const newRowRange = summarySheet.getRange(newRow, 1, 1, 10);
      newRowRange.setBorder(true, true, true, true, true, true);
      newRowRange.setBackground('#F0F8FF');
    });
    
    // 新增總計行
    if (orderInfo.items.length > 0) {
      const totalRow = summarySheet.getLastRow() + 1;
      summarySheet.getRange(totalRow, 1, 1, 10).setValues([[
        '',
        `📋 ${orderInfo.orderBy} 訂單總計`,
        '',
        '總計',
        orderInfo.items.reduce((sum, item) => sum + parseInt(item.quantity), 0),
        '',
        '',
        '',
        '',
        '$' + orderInfo.totalAmount
      ]]);
      
      // 總計行樣式
      const totalRowRange = summarySheet.getRange(totalRow, 1, 1, 10);
      totalRowRange.setFontWeight('bold');
      totalRowRange.setBackground('#FFE4B5');
      totalRowRange.setBorder(true, true, true, true, true, true);
    }
    
    // 自動調整欄寬
    summarySheet.autoResizeColumns(1, 10);
    
    Logger.log('📊 團購訂單已新增到統計表');
    
  } catch (error) {
    Logger.log('❌ 更新團購統計表錯誤: ' + error.toString());
  }
}

// 測試函數
function testCompanyOrderSystem() {
  Logger.log('開始測試公司團購系統...');
  
  // 模擬訂單資料
  const testOrderInfo = {
    orderBy: '財務部-王小明',
    contact: '分機123',
    notes: '會議室取貨',
    items: [
      {
        name: '茉莉奶綠 M杯',
        quantity: '3',
        price: 45,
        totalPrice: 135,
        ice: '6分冰',
        sugar: '4分糖',
        milk: '5分奶（正常）'
      },
      {
        name: '滿溢珍珠奶茶 L杯',
        quantity: '2', 
        price: 55,
        totalPrice: 110,
        ice: '5分冰（正常）',
        sugar: '3分糖',
        milk: '7分奶'
      }
    ],
    totalAmount: 245
  };
  
  // 測試統計表更新
  updateCompanyOrderSheet(testOrderInfo);
  
  Logger.log('✅ 測試完成！總金額: $' + testOrderInfo.totalAmount);
  Logger.log('請檢查統計表是否正確顯示訂單');
}