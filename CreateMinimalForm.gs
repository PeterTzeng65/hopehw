function createMinimalTestForm() {
  // 建立最簡單的測試表單
  const form = FormApp.create('簡單測試表單');
  form.setDescription('僅用於測試網頁提交功能');
  
  // 只建立2個基本欄位
  form.addTextItem()
    .setTitle('姓名')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('電話')
    .setRequired(true);
  
  // 建立試算表
  const spreadsheet = SpreadsheetApp.create('簡單測試統計');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  Logger.log('=== 簡單測試表單建立成功 ===');
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