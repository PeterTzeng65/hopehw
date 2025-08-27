function setupFormTriggerManually() {
  const FORM_ID = '1jVd-_I2nwEYedRvts3UoDBYEdSQgsneBIhYKU4TtmWY';
  
  try {
    // 開啟表單
    const form = FormApp.openById(FORM_ID);
    
    // 刪除現有觸發器
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onWebOrderSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 嘗試建立表單觸發器
    try {
      const trigger = ScriptApp.newTrigger('onWebOrderSubmit')
        .form(form)
        .onFormSubmit()
        .create();
        
      Logger.log('✅ 觸發器建立成功！');
      Logger.log('觸發器 ID: ' + trigger.getUniqueId());
      
    } catch (triggerError) {
      Logger.log('❌ 無法建立表單觸發器: ' + triggerError.toString());
      Logger.log('');
      Logger.log('🔄 替代方案：使用定時觸發器');
      
      // 使用定時觸發器作為備選方案
      const timeTrigger = ScriptApp.newTrigger('checkFormResponses')
        .timeBased()
        .everyMinutes(1)
        .create();
        
      Logger.log('✅ 定時觸發器建立成功（每分鐘檢查一次）');
      Logger.log('觸發器 ID: ' + timeTrigger.getUniqueId());
    }
    
    Logger.log('');
    Logger.log('🎯 測試方法：');
    Logger.log('1. 開啟表單填寫測試資料');
    Logger.log('2. 檢查統計表是否有新資料');
    Logger.log('表單連結: ' + form.getPublishedUrl());
    Logger.log('統計表: https://docs.google.com/spreadsheets/d/1odYUbiQboH5d0v3wTh2v-MVffRlsdWZ8FHKSoiTZ6iQ/edit');
    
  } catch (error) {
    Logger.log('❌ 設定失敗: ' + error.toString());
  }
}

// 定時檢查表單回應的備選函數
function checkFormResponses() {
  const FORM_ID = '1jVd-_I2nwEYedRvts3UoDBYEdSQgsneBIhYKU4TtmWY';
  
  try {
    const form = FormApp.openById(FORM_ID);
    const responses = form.getResponses();
    
    // 檢查是否有新的回應需要處理
    if (responses.length > 0) {
      const lastResponse = responses[responses.length - 1];
      const timestamp = lastResponse.getTimestamp();
      const now = new Date();
      
      // 如果是最近一分鐘內的回應，就處理它
      if (now - timestamp < 60000) {
        Logger.log('🎉 發現新的表單回應，開始處理...');
        
        // 模擬表單提交事件
        const mockEvent = {
          response: lastResponse
        };
        
        onWebOrderSubmit(mockEvent);
      }
    }
  } catch (error) {
    Logger.log('檢查表單回應錯誤: ' + error.toString());
  }
}