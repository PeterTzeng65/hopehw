function checkFormConnection() {
  const FORM_ID = '1jVd-_I2nwEYedRvts3UoDBYEdSQgsneBIhYKU4TtmWY';
  
  try {
    const form = FormApp.openById(FORM_ID);
    Logger.log('✅ 成功連接到表單: ' + form.getTitle());
    Logger.log('表單 URL: ' + form.getPublishedUrl());
    
    // 嘗試設定觸發器
    const triggers = ScriptApp.getProjectTriggers();
    Logger.log('現有觸發器數量: ' + triggers.length);
    
    triggers.forEach((trigger, index) => {
      Logger.log(`觸發器 ${index + 1}: ${trigger.getHandlerFunction()}`);
    });
    
  } catch (error) {
    Logger.log('❌ 連接表單失敗: ' + error.toString());
  }
}