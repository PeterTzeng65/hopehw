function createCompleteOrderForm() {
  // 建立完整的6欄位訂單表單
  const form = FormApp.create('MAYI 滿溢茶飲 - 完整訂單系統');
  form.setDescription('此表單用於接收網頁系統的完整訂單資料');
  
  // 建立6個欄位（與網頁完全匹配）
  form.addTextItem()
    .setTitle('訂購者')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('聯絡方式')
    .setRequired(true);
    
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
  const spreadsheet = SpreadsheetApp.create('MAYI滿溢茶飲完整訂單統計');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  Logger.log('=== 完整訂單表單建立成功 ===');
  Logger.log('📝 表單連結: ' + form.getPublishedUrl());
  Logger.log('✏️ 編輯表單: ' + form.getEditUrl());
  Logger.log('📊 統計表連結: ' + spreadsheet.getUrl());
  Logger.log('🔗 表單 ID: ' + form.getId());
  
  return {
    formUrl: form.getPublishedUrl(),
    formEditUrl: form.getEditUrl(),
    spreadsheetUrl: spreadsheet.getUrl(),
    formId: form.getId()
  };
}