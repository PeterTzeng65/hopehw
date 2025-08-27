const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./database');

function restoreFromBackup(backupFilePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(backupFilePath)) {
            reject(new Error('備份檔案不存在'));
            return;
        }

        fs.readFile(backupFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            let backupData;
            try {
                backupData = JSON.parse(data);
            } catch (parseErr) {
                reject(new Error('備份檔案格式錯誤'));
                return;
            }

            if (!backupData.data || !Array.isArray(backupData.data)) {
                reject(new Error('備份檔案內容無效'));
                return;
            }

            const database = getDatabase();
            
            database.serialize(() => {
                database.run('DELETE FROM work_logs', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    console.log('已清空現有資料');
                    
                    const stmt = database.prepare(`INSERT INTO work_logs 
                        (id, serial_number, created_date, current_status, improved_status, 
                         problem_category, department, extension, reporter, resolver, 
                         status, notes, updated_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                    let successCount = 0;
                    let errorCount = 0;

                    backupData.data.forEach(record => {
                        stmt.run([
                            record.id,
                            record.serial_number,
                            record.created_date,
                            record.current_status,
                            record.improved_status,
                            record.problem_category,
                            record.department,
                            record.extension,
                            record.reporter,
                            record.resolver,
                            record.status,
                            record.notes,
                            record.updated_date
                        ], function(err) {
                            if (err) {
                                errorCount++;
                                console.error('插入記錄失敗:', record.serial_number, err.message);
                            } else {
                                successCount++;
                            }

                            if (successCount + errorCount === backupData.data.length) {
                                stmt.finalize();
                                
                                if (errorCount === 0) {
                                    console.log(`資料回復完成，共恢復 ${successCount} 筆記錄`);
                                    resolve({ success: successCount, errors: errorCount });
                                } else {
                                    console.log(`資料回復完成，成功 ${successCount} 筆，失敗 ${errorCount} 筆`);
                                    resolve({ success: successCount, errors: errorCount });
                                }
                                database.close();
                            }
                        });
                    });
                });
            });
        });
    });
}

function validateBackupFile(backupFilePath) {
    try {
        if (!fs.existsSync(backupFilePath)) {
            return { valid: false, error: '檔案不存在' };
        }

        const data = fs.readFileSync(backupFilePath, 'utf8');
        const backupData = JSON.parse(data);

        if (!backupData.data || !Array.isArray(backupData.data)) {
            return { valid: false, error: '備份檔案格式錯誤' };
        }

        return { 
            valid: true, 
            info: {
                timestamp: backupData.timestamp,
                version: backupData.version,
                recordCount: backupData.count || backupData.data.length
            }
        };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

if (require.main === module) {
    const backupPath = process.argv[2];
    
    if (!backupPath) {
        console.error('請指定備份檔案路徑');
        console.log('用法: node restore.js <備份檔案路徑>');
        process.exit(1);
    }

    const validation = validateBackupFile(backupPath);
    if (!validation.valid) {
        console.error('備份檔案驗證失敗:', validation.error);
        process.exit(1);
    }

    console.log('備份檔案資訊:', validation.info);
    console.log('確定要恢復資料嗎？這將刪除所有現有資料！');
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('輸入 "yes" 確認恢復: ', (answer) => {
        readline.close();
        
        if (answer.toLowerCase() === 'yes') {
            restoreFromBackup(backupPath)
                .then(result => {
                    console.log('恢復完成:', result);
                    process.exit(0);
                })
                .catch(err => {
                    console.error('恢復失敗:', err);
                    process.exit(1);
                });
        } else {
            console.log('操作已取消');
            process.exit(0);
        }
    });
}

module.exports = {
    restoreFromBackup,
    validateBackupFile
};