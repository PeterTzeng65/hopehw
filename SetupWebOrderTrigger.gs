// 設定網頁訂單表單觸發器
function setupWebOrderTrigger() {
  const FORM_ID = '1R9MKQlRD9RcfsyE61y2pS3BCifHMy8ktwTH5fqenXgw'; // 網頁訂單表單ID
  
  Logger.log('設定網頁訂單表單觸發器...');
  Logger.log('表單 ID: ' + FORM_ID);
  Logger.log('');
  Logger.log('⚠️  請手動設定觸發器：');
  Logger.log('1. 到左側「觸發器」頁面');
  Logger.log('2. 點選「+ 新增觸發器」');
  Logger.log('3. 函數選擇：onWebOrderSubmit');
  Logger.log('4. 事件來源：來自表單');
  Logger.log('5. 表單選擇：MAYI 滿溢茶飲 - 網頁訂單接收');
  Logger.log('6. 事件類型：提交表單時');
  Logger.log('7. 點選「儲存」');
  Logger.log('');
  Logger.log('✅ 設定完成後，網頁提交的訂單會自動處理到統計表');
}

// 測試網頁訂單系統
function testWebOrderSystem() {
  Logger.log('🧪 測試網頁訂單系統...');
  
  // 模擬網頁訂單資料
  const testOrderData = {
    customer: '研發部-張小華',
    contact: '分機456',
    items: [
      '茉莉奶綠 (M杯) × 3 [少冰|半糖|少奶] = $135',
      '異漾凍飲 (L杯) × 1 [正常冰|無糖|正常奶] = $75',
      '古意人柿橘汁 (M杯) × 2 [去冰|正常糖|無奶] = $98'
    ],
    totalQuantity: 6,
    totalPrice: 308,
    notes: '會議室取貨，下午3點前需要，謝謝！'
  };
  
  // 測試統計表更新
  updateWebOrderSheet(testOrderData);
  
  Logger.log('✅ 測試完成！');
  Logger.log('📊 請檢查統計表: https://docs.google.com/spreadsheets/d/1xnLOnTCu3xcIZJvc53lWklDLRbWLla_W2xa9BRMtJB8/edit');
  
  return testOrderData;
}