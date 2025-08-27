const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./database');

function createBackup() {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        database.all('SELECT * FROM work_logs ORDER BY id', (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const backupData = {
                timestamp,
                version: '1.0',
                data: rows,
                count: rows.length
            };

            const backupFileName = `work_log_backup_${timestamp}.json`;
            const backupPath = path.join(backupDir, backupFileName);

            fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`備份已建立: ${backupPath}`);
                    console.log(`備份記錄數: ${rows.length}`);
                    resolve({ path: backupPath, count: rows.length });
                }
                database.close();
            });
        });
    });
}

function listBackups() {
    const backupDir = path.join(__dirname, '../backups');
    
    if (!fs.existsSync(backupDir)) {
        return [];
    }

    return fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            return {
                filename: file,
                path: filePath,
                size: stats.size,
                created: stats.birthtime
            };
        })
        .sort((a, b) => b.created - a.created);
}

if (require.main === module) {
    createBackup()
        .then(result => {
            console.log('備份完成:', result);
            process.exit(0);
        })
        .catch(err => {
            console.error('備份失敗:', err);
            process.exit(1);
        });
}

module.exports = {
    createBackup,
    listBackups
};