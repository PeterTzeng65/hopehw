const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../database/work_log.db');

function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('SQLite 資料庫連接成功');
        });
        
        db.serialize(() => {
            // 創建工作日誌表格
            db.run(`CREATE TABLE IF NOT EXISTS work_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                serial_number TEXT NOT NULL UNIQUE,
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                current_status TEXT NOT NULL,
                improved_status TEXT,
                problem_category TEXT NOT NULL CHECK(problem_category IN ('硬體', '軟體', '網路', '周邊', '其他')),
                department TEXT NOT NULL,
                extension TEXT,
                reporter TEXT NOT NULL,
                resolver TEXT,
                status TEXT NOT NULL DEFAULT '處理中' CHECK(status IN ('處理中', '已處理', '無法處理', '已提出需求')),
                notes TEXT,
                updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_deleted INTEGER DEFAULT 0 CHECK(is_deleted IN (0, 1)),
                deleted_date DATETIME,
                deleted_by INTEGER,
                FOREIGN KEY (deleted_by) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('work_logs 表格已建立或已存在');
                    // 檢查並添加軟刪除欄位（針對現有資料庫）
                    db.run(`ALTER TABLE work_logs ADD COLUMN is_deleted INTEGER DEFAULT 0 CHECK(is_deleted IN (0, 1))`, () => {});
                    db.run(`ALTER TABLE work_logs ADD COLUMN deleted_date DATETIME`, () => {});
                    db.run(`ALTER TABLE work_logs ADD COLUMN deleted_by INTEGER REFERENCES users (id)`, () => {});
                }
            });

            // 創建使用者表格
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT,
                department TEXT NOT NULL,
                role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'user', 'viewer')),
                permissions TEXT DEFAULT '[]',
                is_active INTEGER DEFAULT 1,
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('建立使用者表格錯誤:', err.message);
                } else {
                    console.log('users 表格已建立或已存在');
                    // 創建預設管理員帳號
                    createDefaultAdmin(db);
                }
            });

            // 創建登入記錄表格
            db.run(`CREATE TABLE IF NOT EXISTS login_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'success',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    console.error('建立登入記錄表格錯誤:', err.message);
                } else {
                    console.log('login_logs 表格已建立或已存在');
                }
            });

            // 創建工單照片表格
            db.run(`CREATE TABLE IF NOT EXISTS work_log_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_log_id INTEGER NOT NULL,
                photo_type TEXT NOT NULL, -- 'before' 或 'after'
                file_name TEXT NOT NULL,
                original_name TEXT,
                file_path TEXT NOT NULL,
                thumbnail_path TEXT,
                file_size INTEGER,
                mime_type TEXT,
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                sort_order INTEGER DEFAULT 0,
                created_by INTEGER,
                FOREIGN KEY (work_log_id) REFERENCES work_logs (id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    console.error('建立工單照片表格錯誤:', err.message);
                } else {
                    console.log('work_log_photos 表格已建立或已存在');
                }
            });

            // 創建操作記錄表格
            db.run(`CREATE TABLE IF NOT EXISTS operation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_log_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                operation_type TEXT NOT NULL CHECK(operation_type IN ('create', 'update', 'delete', 'restore', 'photo_upload', 'photo_delete')),
                old_data TEXT, -- JSON格式存儲修改前的資料
                new_data TEXT, -- JSON格式存儲修改後的資料
                description TEXT, -- 操作描述
                ip_address TEXT,
                user_agent TEXT,
                operation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (work_log_id) REFERENCES work_logs (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    console.error('建立操作記錄表格錯誤:', err.message);
                } else {
                    console.log('operation_logs 表格已建立或已存在');
                    console.log('正在建立索引...');
                    
                    // 建立索引
                    db.run(`CREATE INDEX IF NOT EXISTS idx_serial_number ON work_logs(serial_number)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_created_date ON work_logs(created_date)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_status ON work_logs(status)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_problem_category ON work_logs(problem_category)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_username ON users(username)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_user_role ON users(role)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_work_log_id ON operation_logs(work_log_id)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_operation_date ON operation_logs(operation_date)`);
                    
                    console.log('索引建立完成，返回資料庫實例...');
                    resolve(db);
                }
            });
        });
    });
}

function generateSerialNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + 
                 String(now.getMinutes()).padStart(2, '0') + 
                 String(now.getSeconds()).padStart(2, '0');
    
    return `IT${year}${month}${day}-${time}`;
}

function getDatabase() {
    return new sqlite3.Database(dbPath);
}

function createDefaultAdmin(db) {
    // 檢查是否已有管理員
    db.get("SELECT id FROM users WHERE role = 'admin'", [], (err, row) => {
        if (err) {
            console.error('檢查管理員錯誤:', err.message);
            return;
        }
        
        if (!row) {
            // 創建預設管理員帳號
            const defaultPassword = 'admin123'; // TODO: Change this in production!
            bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('密碼加密錯誤:', err.message);
                    return;
                }
                
                const permissions = JSON.stringify([
                    'create', 'read', 'update', 'delete', 
                    'manage_users', 'view_stats', 'export_data'
                ]);
                
                db.run(`INSERT INTO users (username, password, full_name, email, department, role, permissions) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    ['admin', hashedPassword, '系統管理員', 'admin@company.com', 'IT部門', 'admin', permissions],
                    function(err) {
                        if (err) {
                            console.error('建立預設管理員錯誤:', err.message);
                        } else {
                            console.log('預設管理員帳號已建立: admin/admin123');
                        }
                    }
                );
            });
        }
    });
}

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
}

module.exports = {
    initDatabase,
    generateSerialNumber,
    getDatabase,
    hashPassword,
    verifyPassword
};