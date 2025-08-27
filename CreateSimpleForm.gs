function createSimpleWebOrderForm() {
  // 建立新表單
  const form = FormApp.create('MAYI 滿溢茶飲 - 網頁訂單接收');
  form.setDescription('此表單用於接收網頁系統的訂單資料');
  
  // 建立欄位（與網頁完全匹配）
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
  const spreadsheet = SpreadsheetApp.create('MAYI滿溢茶飲網頁訂單統計');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  Logger.log('=== 簡潔版網頁訂單接收系統建立成功 ===');
  Logger.log('📝 表單連結: ' + form.getPublishedUrl());
  Logger.log('✏️ 編輯表單: ' + form.getEditUrl());
  Logger.log('📊 統計表連結: ' + spreadsheet.getUrl());
  Logger.log('🔗 表單 ID: ' + form.getId());
  
  // 設定觸發器
  try {
    const trigger = ScriptApp.newTrigger('onWebOrderSubmit')
      .form(form)
      .onFormSubmit()
      .create();
    Logger.log('✅ 觸發器建立成功！');
  } catch (error) {
    Logger.log('⚠️ 觸發器建立失敗，請手動設定: ' + error.toString());
  }
  
  return {
    formUrl: form.getPublishedUrl(),
    formEditUrl: form.getEditUrl(),
    spreadsheetUrl: spreadsheet.getUrl(),
    formId: form.getId()
  };
}