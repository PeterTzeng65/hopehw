// 設定公司團購表單觸發器
function setupCompanyFormTrigger() {
  const FORM_ID = '1zqQ5RMBozv8WFXuE4yRTjzeW1gVowqJcMjrLnlLObec'; // 公司團購表單ID
  
  Logger.log('設定公司團購表單觸發器...');
  Logger.log('表單 ID: ' + FORM_ID);
  Logger.log('');
  Logger.log('⚠️  由於 API 限制，請手動設定觸發器：');
  Logger.log('1. 到左側「觸發器」頁面');
  Logger.log('2. 點選「+ 新增觸發器」');
  Logger.log('3. 函數選擇：onCompanyFormSubmit');
  Logger.log('4. 事件來源：來自表單');
  Logger.log('5. 表單選擇：MAYI 滿溢茶飲 - 公司團購訂單');
  Logger.log('6. 事件類型：提交表單時');
  Logger.log('7. 點選「儲存」');
  Logger.log('');
  Logger.log('✅ 設定完成後，每當有人提交表單就會自動處理訂單');
}

// 測試團購系統
function testCompanySystem() {
  Logger.log('🧪 測試公司團購系統...');
  
  // 執行測試
  testCompanyOrderSystem();
  
  Logger.log('');
  Logger.log('🔗 快速連結：');
  Logger.log('📝 團購表單: https://docs.google.com/forms/d/e/1FAIpQLSdYuCOV266KH4hG_FMwzrhXkGUTqcAqxt3xBQhgOE8ntK0GQA/viewform');
  Logger.log('📊 統計表: https://docs.google.com/spreadsheets/d/1ykwA9h-mQAWGIqFz-b34J90oZVynO_Iq8iyThUJH3xI/edit');
}