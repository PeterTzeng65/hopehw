function createSimpleDrinkForm() {
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
  
  // 簡化的飲料選項 - 找奶茶系列
  const milkTeaOptions = [
    '不選購',
    '可可風味奶茶 M杯 $50',
    '可可風味奶茶 L杯 $60',
    '茉莉奶綠 M杯 $45',
    '茉莉奶綠 L杯 $50',
    '滿溢珍珠奶茶 M杯 $50',
    '滿溢珍珠奶茶 L杯 $55'
  ];
  
  form.addMultipleChoiceItem()
    .setTitle('奶茶系列')
    .setChoiceValues(milkTeaOptions)
    .setRequired(false);
  
  // 特調系列
  const specialOptions = [
    '不選購',
    '嚴選雲南昆明茶 $55',
    '茉莉原萃綠茶奶霜 $55',
    '異漾凍飲 M杯 $70',
    '異漾凍飲 L杯 $75'
  ];
  
  form.addMultipleChoiceItem()
    .setTitle('特調系列')
    .setChoiceValues(specialOptions)
    .setRequired(false);
  
  // 備註
  form.addParagraphTextItem()
    .setTitle('備註')
    .setHelpText('特殊需求或其他飲料需求');
  
  // 建立回應試算表
  const spreadsheet = SpreadsheetApp.create('MAYI滿溢茶飲訂單統計');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  // 設定統計表標題
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('訂單統計');
  
  Logger.log('=== 建立成功 ===');
  Logger.log('表單連結: ' + form.getPublishedUrl());
  Logger.log('編輯表單: ' + form.getEditUrl());
  Logger.log('統計表連結: ' + spreadsheet.getUrl());
  
  return {
    formUrl: form.getPublishedUrl(),
    formEditUrl: form.getEditUrl(),
    spreadsheetUrl: spreadsheet.getUrl()
  };
}

function onFormSubmit(e) {
  try {
    const form = FormApp.getActiveForm();
    const responses = form.getResponses();
    const latestResponse = responses[responses.length - 1];
    const itemResponses = latestResponse.getItemResponses();
    
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
          if (answer !== '不選購') {
            totalPrice += extractPrice(answer);
          }
          break;
        case '特調系列':
          special = answer;
          if (answer !== '不選購') {
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
    
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
  }
}

function extractPrice(option) {
  const match = option.match(/\$(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function updateOrderSheet(name, phone, time, milkTea, special, notes, total) {
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
  
  Logger.log('訂單已新增: ' + name + ' - $' + total);
}