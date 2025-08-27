// 取得表單欄位 ID
function getFormFieldIds() {
  const FORM_ID = '1ewZszHvAr4VHxqFJvvzxJ7pVJls2srypEs2UYTk1kU4';
  
  try {
    const form = FormApp.openById(FORM_ID);
    const items = form.getItems();
    
    Logger.log('=== 表單欄位資訊 ===');
    Logger.log('表單標題: ' + form.getTitle());
    Logger.log('');
    
    items.forEach((item, index) => {
      const title = item.getTitle();
      const id = item.getId();
      const type = item.getType();
      
      Logger.log(`欄位 ${index + 1}:`);
      Logger.log(`  標題: ${title}`);
      Logger.log(`  ID: ${id}`);
      Logger.log(`  類型: ${type}`);
      Logger.log(`  Entry ID: entry.${id}`);
      Logger.log('');
    });
    
    Logger.log('=== 網頁提交用的 Entry IDs ===');
    Logger.log('請將以下 entry IDs 更新到網頁中:');
    
    items.forEach((item, index) => {
      const title = item.getTitle();
      const id = item.getId();
      Logger.log(`${title}: entry.${id}`);
    });
    
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
  }
}

// 建立完整的網頁提交範例
function generateWebSubmitCode() {
  Logger.log('=== 網頁提交程式碼範例 ===');
  Logger.log('');
  Logger.log('請在網頁的 submitOrder() 函數中使用以下程式碼:');
  Logger.log('');
  Logger.log(`
// 提交到 Google 表單
const FORM_ID = '1R9MKQlRD9RcfsyE61y2pS3BCifHMy8ktwTH5fqenXgw';
const formUrl = \`https://docs.google.com/forms/d/e/\${FORM_ID}/formResponse\`;

const formData = new FormData();
formData.append('entry.XXXXXXX', customerName);        // 訂購者
formData.append('entry.XXXXXXX', customerContact);     // 聯絡方式
formData.append('entry.XXXXXXX', detailedItems.join('\\n')); // 訂購清單
formData.append('entry.XXXXXXX', totalQuantity);       // 總數量
formData.append('entry.XXXXXXX', totalPrice);          // 總金額
formData.append('entry.XXXXXXX', customerNotes);       // 備註

await fetch(formUrl, {
    method: 'POST',
    body: formData,
    mode: 'no-cors'
});
  `);
  
  Logger.log('執行 getFormFieldIds() 取得實際的 entry IDs');
}