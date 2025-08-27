function createDrinkOrderForm() {
  // 建立新的Google表單
  const form = FormApp.create('MAYI 滿溢茶飲訂購表單');
  
  // 設定表單描述
  form.setDescription('歡迎訂購 MAYI 滿溢茶飲！請填寫以下資訊完成訂購。');
  
  // 客戶基本資訊
  form.addTextItem()
    .setTitle('姓名')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('聯絡電話')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('取餐時間')
    .setHelpText('例如：14:30 或 下午2點半')
    .setRequired(true);
  
  // 找奶茶系列
  const milkTeaSection = form.addPageBreakItem()
    .setTitle('找奶茶系列');
  
  addDrinkOptions(form, '可可風味奶茶', ['M杯 $50', 'L杯 $60']);
  addDrinkOptions(form, '仙草凍奶茶', ['單一尺寸 $50']);
  addDrinkOptions(form, '茉莉奶綠', ['M杯 $45', 'L杯 $50']);
  addDrinkOptions(form, '滿溢烤香奶茶', ['M杯 $50', 'L杯 $55']);
  addDrinkOptions(form, '滿溢珍珠奶茶', ['M杯 $50', 'L杯 $55']);
  addDrinkOptions(form, '炭燒烏龍奶茶', ['M杯 $50', 'L杯 $55']);
  addDrinkOptions(form, '布丁伯爵奶茶', ['M杯 $50', 'L杯 $60']);
  addDrinkOptions(form, '可可環果奶', ['M杯 $60', 'L杯 $65']);
  addDrinkOptions(form, '手炒黑糖鐵觀音奶', ['M杯 $60', 'L杯 $75']);
  
  // 找烏味系列
  const specialSection = form.addPageBreakItem()
    .setTitle('找烏味系列');
    
  const uTasteItems = [
    '嚴選雲南昆明茶',
    '茉莉原萃綠茶奶霜',
    '蜜柚高麗綠茶奶霜',
    '炭焙高山烏龍奶霜',
    '檸檬四季春奶霜',
    '熱帶醇香紅茶奶霜',
    '紅玉醇香紅茶奶霜'
  ];
  
  uTasteItems.forEach(item => {
    addDrinkOptions(form, item, ['單一尺寸 $55']);
  });
  
  // 找口感系列
  const textureSection = form.addPageBreakItem()
    .setTitle('找口感系列');
    
  addDrinkOptions(form, '異漾凍飲', ['M杯 $70', 'L杯 $75']);
  addDrinkOptions(form, '貴妃荔枝紅茶凍飲', ['M杯 $75', 'L杯 $80']);
  addDrinkOptions(form, '手沖紫奶師凍飲', ['M杯 $75', 'L杯 $80']);
  
  // 清爽微酸打系列
  const sparklingSection = form.addPageBreakItem()
    .setTitle('清爽微酸打系列');
    
  const sparklingItems = [
    ['冰鎮蘋果氣泡飲', '單一尺寸 $75'],
    ['冰鎮百香果氣泡飲', '單一尺寸 $75'],
    ['冰鎮綜合莓果氣泡飲', '單一尺寸 $80'],
    ['冰鎮鳳果氣泡飲', '單一尺寸 $80']
  ];
  
  sparklingItems.forEach(([name, price]) => {
    addDrinkOptions(form, name, [price]);
  });
  
  // 季節限定
  const seasonalSection = form.addPageBreakItem()
    .setTitle('季節限定');
    
  addDrinkOptions(form, '古意人柿橘汁', ['M杯 $49', 'L杯 $55']);
  addDrinkOptions(form, '蘋果肉桂紅茶飲', ['M杯 $49', 'L杯 $55']);
  addDrinkOptions(form, '金桔檸檬蜂蜜氣泡', ['M杯 $49', 'L杯 $55']);
  addDrinkOptions(form, '暖薑檸奶(熱)', ['單一尺寸 $49']);
  
  // 備註
  form.addParagraphTextItem()
    .setTitle('備註')
    .setHelpText('特殊需求或備註事項');
  
  // 設定回應處理
  const spreadsheet = SpreadsheetApp.create('MAYI滿溢茶飲訂單統計');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  // 設定觸發器 - 需要手動設定
  // 請到「觸發器」頁面手動新增表單提交觸發器
  
  Logger.log('表單已建立: ' + form.getPublishedUrl());
  Logger.log('試算表: ' + spreadsheet.getUrl());
  
  return {
    formUrl: form.getPublishedUrl(),
    spreadsheetUrl: spreadsheet.getUrl()
  };
}

function addDrinkOptions(form, drinkName, options) {
  const item = form.addMultipleChoiceItem()
    .setTitle(drinkName)
    .setChoiceValues(['不選購'].concat(options))
    .setRequired(false);
}

function onFormSubmit(event) {
  const response = event.response;
  const itemResponses = response.getItemResponses();
  
  // 取得回應資料
  let customerInfo = {};
  let orders = [];
  let totalPrice = 0;
  
  itemResponses.forEach(itemResponse => {
    const title = itemResponse.getItem().getTitle();
    const answer = itemResponse.getResponse();
    
    // 處理客戶基本資訊
    if (['姓名', '聯絡電話', '取餐時間', '備註'].includes(title)) {
      customerInfo[title] = answer;
    }
    // 處理飲料訂單
    else if (answer && answer !== '不選購') {
      const price = extractPrice(answer);
      orders.push({
        item: title,
        option: answer,
        price: price
      });
      totalPrice += price;
    }
  });
  
  // 更新統計表
  updateOrderSummary(customerInfo, orders, totalPrice);
}

function extractPrice(option) {
  const match = option.match(/\$(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function updateOrderSummary(customerInfo, orders, totalPrice) {
  // 開啟統計表
  const files = DriveApp.getFilesByName('MAYI滿溢茶飲訂單統計');
  if (!files.hasNext()) return;
  
  const spreadsheet = SpreadsheetApp.openById(files.next().getId());
  let sheet = spreadsheet.getSheetByName('訂單總表');
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet('訂單總表');
    // 建立標題行
    sheet.getRange(1, 1, 1, 8).setValues([
      ['店名', '聯絡電話', '訂購時間', '客戶姓名', '客戶電話', '取餐時間', '訂購清單', '總價格']
    ]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }
  
  // 準備訂單清單文字
  const orderList = orders.map(order => 
    `${order.item} - ${order.option}`
  ).join('\n');
  
  // 新增訂單資料
  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, 8).setValues([[
    'MAYI 滿溢茶飲',
    '請提供店家電話', // 需要手動更新
    new Date(),
    customerInfo['姓名'] || '',
    customerInfo['聯絡電話'] || '',
    customerInfo['取餐時間'] || '',
    orderList,
    totalPrice
  ]]);
  
  // 自動調整欄寬
  sheet.autoResizeColumns(1, 8);
  
  // 發送確認郵件 (可選)
  sendConfirmationEmail(customerInfo, orders, totalPrice);
}

function sendConfirmationEmail(customerInfo, orders, totalPrice) {
  const subject = 'MAYI 滿溢茶飲 - 訂購確認';
  const orderList = orders.map(order => 
    `• ${order.item} - ${order.option}`
  ).join('\n');
  
  const body = `
親愛的 ${customerInfo['姓名']}，

您的訂購已收到！以下是您的訂購資訊：

訂購清單：
${orderList}

總價格：$${totalPrice}
取餐時間：${customerInfo['取餐時間']}

感謝您的訂購！

MAYI 滿溢茶飲
  `;
  
  // 如果有客戶email可以發送確認信
  // MailApp.sendEmail(customerEmail, subject, body);
}

function getFormAndSpreadsheetUrls() {
  // 取得已建立的表單和試算表連結
  const forms = FormApp.openByUrl('your-form-url-here'); // 需要更新
  const spreadsheets = SpreadsheetApp.openByUrl('your-spreadsheet-url-here'); // 需要更新
  
  return {
    formUrl: forms.getPublishedUrl(),
    spreadsheetUrl: spreadsheets.getUrl()
  };
}