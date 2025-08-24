const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, generateSerialNumber, getDatabase, hashPassword, verifyPassword } = require('./database');
const { createBackup, listBackups } = require('./backup');
const { restoreFromBackup, validateBackupFile } = require('./restore');

const app = express();
const PORT = process.env.PORT || 3008;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // 在生產環境中設為 true (需要 HTTPS)
        maxAge: 24 * 60 * 60 * 1000 // 24小時
    }
}));
app.use(express.static(path.join(__dirname, '../public')));

// 靜態照片服務
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Multer配置 - 照片上傳
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const uploadDir = path.join(__dirname, '../uploads/photos', String(year), month);
        
        // 確保目錄存在
        require('fs').mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const workLogId = req.params.id || req.body.work_log_id;
        const photoType = req.body.photo_type || 'unknown';
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = path.extname(file.originalname).toLowerCase();
        
        const filename = `work_log_${workLogId}_${photoType}_${timestamp}_${randomStr}${extension}`;
        cb(null, filename);
    }
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
    // 檢查檔案類型
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('只允許上傳圖片檔案'), false);
    }
};

// Multer實例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 限制
        files: 10 // 最多10個檔案
    }
});

// 生成縮圖函數
async function generateThumbnail(inputPath, outputDir) {
    try {
        const filename = path.basename(inputPath, path.extname(inputPath)) + '_thumb.jpg';
        const outputPath = path.join(outputDir, filename);
        
        await sharp(inputPath)
            .resize(200, 200, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(outputPath);
            
        return outputPath;
    } catch (error) {
        console.error('生成縮圖錯誤:', error);
        return null;
    }
}

let db;

// 認證中間件
function authenticateToken(req, res, next) {
    const token = req.session.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '需要登入' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '無效的認證' });
        }
        req.user = user;
        next();
    });
}

// 檢查權限中間件
function checkPermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '需要登入' });
        }
        
        const userPermissions = JSON.parse(req.user.permissions || '[]');
        
        if (req.user.role === 'admin' || userPermissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ error: '沒有權限執行此操作' });
        }
    };
}

async function startServer() {
    try {
        console.log('正在初始化資料庫...');
        db = await initDatabase();
        console.log('資料庫初始化完成');
        
        console.log('正在啟動伺服器...');
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`伺服器運行在 http://localhost:${PORT}`);
            console.log('API 路由已設置:');
            console.log('- POST /api/auth/login');
            console.log('- GET /api/auth/me');
            console.log('- GET /api/logs');
        });
        
        server.on('error', (err) => {
            console.error('伺服器錯誤:', err);
        });
        
        // 確保伺服器持續運行
        process.on('SIGTERM', () => {
            console.log('收到 SIGTERM 信號，正在關閉伺服器...');
            server.close(() => {
                console.log('伺服器已關閉');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            console.log('收到 SIGINT 信號，正在關閉伺服器...');
            server.close(() => {
                console.log('伺服器已關閉');
                process.exit(0);
            });
        });
        
    } catch (err) {
        console.error('啟動伺服器時發生錯誤:', err);
        process.exit(1);
    }
}

// 添加全局錯誤處理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未處理的 Promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('未捕獲的異常:', error);
    process.exit(1);
});

// ========== 認證與使用者管理 API ==========

// 登入
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '用戶名和密碼為必填' });
    }

    const database = getDatabase();
    database.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!user || !verifyPassword(password, user.password)) {
            res.status(401).json({ error: '用戶名或密碼錯誤' });
            return;
        }

        const token = jwt.sign(
            { 
                id: user.id,
                username: user.username,
                role: user.role,
                department: user.department,
                permissions: user.permissions
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        req.session.token = token;
        req.session.user = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            department: user.department,
            permissions: user.permissions
        };

        // 記錄登入日誌
        database.run(
            'INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES (?, ?, ?)',
            [user.id, req.ip, req.get('User-Agent')],
            (err) => {
                if (err) console.error('記錄登入日誌錯誤:', err.message);
            }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                department: user.department,
                permissions: JSON.parse(user.permissions || '[]')
            }
        });
        database.close();
    });
});

// 登出
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    req.session.destroy();
    res.json({ message: '已登出' });
});

// 驗證當前用戶
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const database = getDatabase();
    database.get('SELECT id, username, full_name, email, department, role, permissions, is_active FROM users WHERE id = ?', 
        [req.user.id], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!user) {
            res.status(404).json({ error: '用戶不存在' });
            return;
        }
        res.json({
            ...user,
            permissions: JSON.parse(user.permissions || '[]')
        });
        database.close();
    });
});

// 獲取所有使用者 (僅管理員)
app.get('/api/users', authenticateToken, checkPermission('manage_users'), (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT id, username, full_name, email, department, role, permissions, is_active, created_date FROM users WHERE 1=1';
    let params = [];
    
    if (search) {
        query += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ? OR department LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const database = getDatabase();
    database.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1' + 
            (search ? ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ? OR department LIKE ?)' : '');
        
        let countParams = [];
        if (search) countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        
        database.get(countQuery, countParams, (err, count) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            const users = rows.map(user => ({
                ...user,
                permissions: JSON.parse(user.permissions || '[]')
            }));
            
            res.json({
                data: users,
                total: count.total,
                page: parseInt(page),
                totalPages: Math.ceil(count.total / limit)
            });
            database.close();
        });
    });
});

// 創建新使用者
app.post('/api/users', authenticateToken, checkPermission('manage_users'), (req, res) => {
    const { username, password, full_name, email, department, role = 'user', permissions = [] } = req.body;
    
    if (!username || !password || !full_name || !department) {
        return res.status(400).json({ error: '用戶名、密碼、姓名和單位為必填欄位' });
    }

    const hashedPassword = hashPassword(password);
    const permissionsJson = JSON.stringify(permissions);
    
    const database = getDatabase();
    database.run(`INSERT INTO users (username, password, full_name, email, department, role, permissions) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [username, hashedPassword, full_name, email, department, role, permissionsJson],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: '用戶名已存在' });
                } else {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            res.status(201).json({
                id: this.lastID,
                message: '使用者創建成功'
            });
            database.close();
        });
});

// 更新使用者
app.put('/api/users/:id', authenticateToken, checkPermission('manage_users'), (req, res) => {
    const { full_name, email, department, role, permissions, is_active } = req.body;
    const userId = req.params.id;
    
    let updateFields = [];
    let params = [];
    
    if (full_name !== undefined) { updateFields.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined) { updateFields.push('email = ?'); params.push(email); }
    if (department !== undefined) { updateFields.push('department = ?'); params.push(department); }
    if (role !== undefined) { updateFields.push('role = ?'); params.push(role); }
    if (permissions !== undefined) { updateFields.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); params.push(is_active); }
    
    updateFields.push('updated_date = CURRENT_TIMESTAMP');
    params.push(userId);
    
    const database = getDatabase();
    database.run(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: '使用者不存在' });
            return;
        }
        res.json({ message: '使用者更新成功' });
        database.close();
    });
});

// 刪除使用者
app.delete('/api/users/:id', authenticateToken, checkPermission('manage_users'), (req, res) => {
    const userId = req.params.id;
    
    if (userId == req.user.id) {
        return res.status(400).json({ error: '不能刪除自己的帳號' });
    }
    
    const database = getDatabase();
    database.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: '使用者不存在' });
            return;
        }
        res.json({ message: '使用者刪除成功' });
        database.close();
    });
});

// 重設使用者密碼
app.post('/api/users/:id/reset-password', authenticateToken, checkPermission('manage_users'), (req, res) => {
    const { password } = req.body;
    const userId = req.params.id;
    
    if (!password) {
        return res.status(400).json({ error: '新密碼為必填' });
    }

    const hashedPassword = hashPassword(password);
    
    const database = getDatabase();
    database.run('UPDATE users SET password = ?, updated_date = CURRENT_TIMESTAMP WHERE id = ?', 
        [hashedPassword, userId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: '使用者不存在' });
            return;
        }
        res.json({ message: '密碼重設成功' });
        database.close();
    });
});

// 獲取登入記錄
app.get('/api/login-logs', authenticateToken, checkPermission('manage_users'), (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const database = getDatabase();
    database.all(`SELECT l.*, u.username, u.full_name 
                  FROM login_logs l 
                  LEFT JOIN users u ON l.user_id = u.id 
                  ORDER BY l.login_time DESC 
                  LIMIT ? OFFSET ?`, 
        [parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        database.get('SELECT COUNT(*) as total FROM login_logs', [], (err, count) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({
                data: rows,
                total: count.total,
                page: parseInt(page),
                totalPages: Math.ceil(count.total / limit)
            });
            database.close();
        });
    });
});

// ========== 工作日誌 API (需要認證) ==========

app.get('/api/logs', authenticateToken, checkPermission('read'), (req, res) => {
    const { page = 1, limit = 10, status, category, search, include_deleted } = req.query;
    const offset = (page - 1) * limit;
    
    // 預設只顯示未刪除的記錄，只有管理員可以查看已刪除記錄
    let query = 'SELECT * FROM work_logs WHERE 1=1';
    let params = [];
    
    // 軟刪除邏輯：只有管理員或組長可以查看已刪除記錄
    if (include_deleted === 'true' && (req.user.role === 'admin' || req.user.role === 'manager')) {
        // 不添加is_deleted條件，顯示所有記錄
    } else {
        query += ' AND (is_deleted = 0 OR is_deleted IS NULL)';
    }
    
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    if (category) {
        query += ' AND problem_category = ?';
        params.push(category);
    }
    
    if (search) {
        const searchTerms = search.split('').map(char => `%${char}%`).join('');
        query += ' AND (reporter LIKE ? OR department LIKE ? OR notes LIKE ? OR current_status LIKE ? OR improved_status LIKE ? OR serial_number LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const database = getDatabase();
    database.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // 構建計數查詢
        let countQuery = 'SELECT COUNT(*) as total FROM work_logs WHERE 1=1';
        let countParams = [];
        
        // 與主查詢保持一致的軟刪除邏輯
        if (include_deleted === 'true' && (req.user.role === 'admin' || req.user.role === 'manager')) {
            // 不添加is_deleted條件
        } else {
            countQuery += ' AND (is_deleted = 0 OR is_deleted IS NULL)';
        }
        
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        if (category) {
            countQuery += ' AND problem_category = ?';
            countParams.push(category);
        }
        if (search) {
            countQuery += ' AND (reporter LIKE ? OR department LIKE ? OR notes LIKE ? OR current_status LIKE ? OR improved_status LIKE ? OR serial_number LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        database.get(countQuery, countParams, (err, count) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // 映射欄位名稱以符合前端期待
            const mappedRows = rows.map(row => ({
                ...row,
                category: row.problem_category,
                created_at: row.created_date,
                updated_at: row.updated_date,
                remarks: row.notes
            }));
            
            res.json({
                data: mappedRows,
                total: count.total,
                page: parseInt(page),
                totalPages: Math.ceil(count.total / limit)
            });
            database.close();
        });
    });
});

// 獲取已刪除的工單列表 (僅管理員和組長) - 必須在 :id 路由之前
app.get('/api/logs/deleted', authenticateToken, (req, res) => {
    // 檢查權限：只有管理員和組長可以查看已刪除記錄
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: '權限不足，只有管理員和組長可以查看已刪除記錄' });
    }
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const database = getDatabase();
    
    const query = `
        SELECT wl.*, u.full_name as deleted_by_name
        FROM work_logs wl
        LEFT JOIN users u ON wl.deleted_by = u.id
        WHERE wl.is_deleted = 1
        ORDER BY wl.deleted_date DESC
        LIMIT ? OFFSET ?
    `;
    
    database.all(query, [parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            database.close();
            return;
        }
        // 獲取總數
        database.get('SELECT COUNT(*) as total FROM work_logs WHERE is_deleted = 1', (err, count) => {
            if (err) {
                res.status(500).json({ error: err.message });
                database.close();
                return;
            }
            // 映射欄位名稱以符合前端期待
            const mappedRows = rows.map(row => ({
                ...row,
                category: row.problem_category,
                created_at: row.created_date,
                updated_at: row.updated_date,
                remarks: row.notes
            }));
            res.json({
                data: mappedRows,
                total: count.total,
                page: parseInt(page),
                pages: Math.ceil(count.total / limit)
            });
            database.close();
        });
    });
});

app.get('/api/logs/:id', authenticateToken, checkPermission('read'), (req, res) => {
    const database = getDatabase();
    database.get('SELECT * FROM work_logs WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: '找不到該記錄' });
            return;
        }
        
        // 映射欄位名稱以符合前端期待
        const mappedRow = {
            ...row,
            category: row.problem_category,
            created_at: row.created_date,
            updated_at: row.updated_date,
            remarks: row.notes
        };
        
        res.json(mappedRow);
        database.close();
    });
});

app.post('/api/logs', authenticateToken, checkPermission('create'), (req, res) => {
    const {
        current_status,
        improved_status,
        problem_category,
        department,
        extension,
        reporter,
        resolver,
        status = '處理中',
        notes
    } = req.body;
    
    if (!current_status || !problem_category || !department || !reporter) {
        res.status(400).json({ error: '必填欄位不能為空' });
        return;
    }
    
    const serial_number = generateSerialNumber();
    const database = getDatabase();
    
    database.run(`INSERT INTO work_logs 
        (serial_number, current_status, improved_status, problem_category, 
         department, extension, reporter, resolver, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [serial_number, current_status, improved_status, problem_category,
         department, extension, reporter, resolver, status, notes],
        async function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                database.close();
                return;
            }

            const newLogId = this.lastID;
            const newData = {
                id: newLogId,
                serial_number,
                current_status,
                improved_status,
                problem_category,
                department,
                extension,
                reporter,
                resolver,
                status,
                notes
            };

            // 記錄操作日誌
            await logOperation(newLogId, req.user.id, 'create', null, newData, `新增工單: ${serial_number}`, req);

            res.status(201).json({
                id: newLogId,
                serial_number,
                message: '記錄已新增成功'
            });
            database.close();
        });
});

app.put('/api/logs/:id', authenticateToken, checkPermission('update'), async (req, res) => {
    const {
        current_status,
        improved_status,
        problem_category,
        department,
        extension,
        reporter,
        resolver,
        status,
        notes
    } = req.body;
    
    const workLogId = req.params.id;
    const database = getDatabase();
    
    try {
        // 先獲取原始資料用於記錄
        const originalData = await new Promise((resolve, reject) => {
            database.get('SELECT * FROM work_logs WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)', [workLogId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!originalData) {
            res.status(404).json({ error: '找不到該記錄' });
            database.close();
            return;
        }

        // 執行更新
        await new Promise((resolve, reject) => {
            database.run(`UPDATE work_logs SET 
                current_status = ?, improved_status = ?, problem_category = ?,
                department = ?, extension = ?, reporter = ?, resolver = ?,
                status = ?, notes = ?, updated_date = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [current_status, improved_status, problem_category, department,
                 extension, reporter, resolver, status, notes, workLogId],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        const newData = {
            ...originalData,
            current_status,
            improved_status,
            problem_category,
            department,
            extension,
            reporter,
            resolver,
            status,
            notes
        };

        // 記錄操作日誌
        await logOperation(workLogId, req.user.id, 'update', originalData, newData, `更新工單: ${originalData.serial_number}`, req);

        res.json({ message: '記錄已更新成功' });
        database.close();

    } catch (error) {
        console.error('更新記錄錯誤:', error);
        res.status(500).json({ error: error.message });
        database.close();
    }
});

// 軟刪除工單
app.delete('/api/logs/:id', authenticateToken, checkPermission('delete'), async (req, res) => {
    const workLogId = req.params.id;
    const userId = req.user.id;
    const database = getDatabase();
    
    try {
        // 先獲取原始資料用於記錄
        const originalData = await new Promise((resolve, reject) => {
            database.get('SELECT * FROM work_logs WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)', [workLogId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!originalData) {
            res.status(404).json({ error: '找不到該記錄或記錄已被刪除' });
            database.close();
            return;
        }

        // 執行軟刪除
        await new Promise((resolve, reject) => {
            database.run(
                'UPDATE work_logs SET is_deleted = 1, deleted_date = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ?',
                [userId, workLogId],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // 記錄操作日誌
        await logOperation(workLogId, userId, 'delete', originalData, null, `軟刪除工單: ${originalData.serial_number}`, req);

        res.json({ message: '記錄已刪除成功' });
        database.close();

    } catch (error) {
        console.error('軟刪除錯誤:', error);
        res.status(500).json({ error: error.message });
        database.close();
    }
});

// 恢復已刪除的工單 (僅管理員和組長)
app.post('/api/logs/:id/restore', authenticateToken, (req, res) => {
    // 檢查權限：只有管理員和組長可以恢復
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: '權限不足，只有管理員和組長可以恢復刪除的記錄' });
    }

    const workLogId = req.params.id;
    const userId = req.user.id;
    const database = getDatabase();
    
    // 先獲取已刪除的記錄
    database.get('SELECT * FROM work_logs WHERE id = ? AND is_deleted = 1', [workLogId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            database.close();
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: '找不到已刪除的記錄' });
            database.close();
            return;
        }

        // 恢復記錄
        database.run(
            'UPDATE work_logs SET is_deleted = 0, deleted_date = NULL, deleted_by = NULL WHERE id = ?',
            [workLogId],
            async function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    database.close();
                    return;
                }

                // 記錄操作日誌
                await logOperation(workLogId, userId, 'restore', null, row, `恢復工單: ${row.serial_number}`, req);

                res.json({ message: '記錄已恢復成功' });
                database.close();
            }
        );
    });
});

// 獲取操作記錄 (僅管理員和組長)
app.get('/api/logs/:id/operations', authenticateToken, (req, res) => {
    // 檢查權限：只有管理員和組長可以查看操作記錄
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: '權限不足，只有管理員和組長可以查看操作記錄' });
    }

    const workLogId = req.params.id;
    const database = getDatabase();
    
    const query = `
        SELECT ol.*, u.username, u.full_name 
        FROM operation_logs ol
        LEFT JOIN users u ON ol.user_id = u.id
        WHERE ol.work_log_id = ?
        ORDER BY ol.operation_date DESC
    `;
    
    database.all(query, [workLogId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            database.close();
            return;
        }

        // 解析JSON數據
        const operations = rows.map(row => ({
            ...row,
            old_data: row.old_data ? JSON.parse(row.old_data) : null,
            new_data: row.new_data ? JSON.parse(row.new_data) : null
        }));

        res.json(operations);
        database.close();
    });
});

app.post('/api/backup', authenticateToken, checkPermission('manage_users'), async (req, res) => {
    try {
        const result = await createBackup();
        res.json({
            message: '備份建立成功',
            ...result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/backups', authenticateToken, checkPermission('manage_users'), (req, res) => {
    try {
        const backups = listBackups();
        res.json(backups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/restore', authenticateToken, checkPermission('manage_users'), async (req, res) => {
    const { backupPath } = req.body;
    
    if (!backupPath) {
        res.status(400).json({ error: '請提供備份檔案路徑' });
        return;
    }

    try {
        const validation = validateBackupFile(backupPath);
        if (!validation.valid) {
            res.status(400).json({ error: validation.error });
            return;
        }

        const result = await restoreFromBackup(backupPath);
        res.json({
            message: '資料恢復成功',
            ...result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 操作記錄功能 ==========
async function logOperation(workLogId, userId, operationType, oldData = null, newData = null, description = '', req = null) {
    const ip = req ? req.ip || req.connection.remoteAddress : null;
    const userAgent = req ? req.get('User-Agent') : null;
    
    const oldDataJson = oldData ? JSON.stringify(oldData) : null;
    const newDataJson = newData ? JSON.stringify(newData) : null;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO operation_logs 
            (work_log_id, user_id, operation_type, old_data, new_data, description, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [workLogId, userId, operationType, oldDataJson, newDataJson, description, ip, userAgent], 
        function(err) {
            if (err) {
                console.error('記錄操作日誌失敗:', err);
                resolve(); // 不讓日誌錯誤影響主要操作
            } else {
                resolve();
            }
        });
    });
}

// ========== 照片管理API ==========

// 上傳工單照片
app.post('/api/logs/:id/photos', authenticateToken, checkPermission('update'), upload.array('photos', 10), async (req, res) => {
    const workLogId = req.params.id;
    const photoType = req.body.photo_type; // 'before' 或 'after'
    const userId = req.user.id;

    if (!photoType || !['before', 'after'].includes(photoType)) {
        return res.status(400).json({ error: '請指定正確的照片類型 (before 或 after)' });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '請選擇要上傳的照片' });
    }

    try {
        // 檢查工單是否存在
        const workLog = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM work_logs WHERE id = ?', [workLogId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!workLog) {
            return res.status(404).json({ error: '工單不存在' });
        }

        // 檢查現有照片數量
        const existingCount = await new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) as count FROM work_log_photos WHERE work_log_id = ? AND photo_type = ?',
                [workLogId, photoType],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        if (existingCount + req.files.length > 10) {
            return res.status(400).json({ error: `${photoType === 'before' ? '現況' : '改善後'}照片最多只能上傳10張` });
        }

        const uploadedPhotos = [];

        // 處理每個上傳的檔案
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            
            // 生成縮圖
            const relativePath = path.relative(path.join(__dirname, '../uploads/photos'), file.path);
            const relativeDir = path.dirname(relativePath);
            const thumbnailDir = path.join(__dirname, '../uploads/thumbnails', relativeDir);
            
            // 確保縮圖目錄存在
            await fs.mkdir(thumbnailDir, { recursive: true });
            
            const thumbnailPath = await generateThumbnail(file.path, thumbnailDir);

            // 生成正確的URL路徑
            const fileUrlPath = `/uploads/photos/${relativePath.replace(/\\/g, '/')}`;
            const thumbnailUrlPath = thumbnailPath ? 
                `/uploads/thumbnails/${relativeDir}/${path.basename(thumbnailPath)}`.replace(/\\/g, '/') : 
                null;

            // 獲取下一個排序順序
            const nextOrder = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM work_log_photos WHERE work_log_id = ? AND photo_type = ?',
                    [workLogId, photoType],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.next_order);
                    }
                );
            });

            // 保存照片記錄到資料庫
            const result = await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO work_log_photos 
                    (work_log_id, photo_type, file_name, original_name, file_path, thumbnail_path, 
                     file_size, mime_type, sort_order, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    workLogId, photoType, path.basename(file.path), file.originalname,
                    fileUrlPath, thumbnailUrlPath, file.size, file.mimetype, nextOrder, userId
                ], function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                });
            });

            uploadedPhotos.push({
                id: result.id,
                file_name: path.basename(file.path),
                original_name: file.originalname,
                file_path: fileUrlPath,
                thumbnail_path: thumbnailUrlPath,
                file_size: file.size,
                sort_order: nextOrder
            });
        }

        res.json({ 
            success: true, 
            message: `成功上傳 ${uploadedPhotos.length} 張照片`,
            photos: uploadedPhotos 
        });

    } catch (error) {
        console.error('照片上傳錯誤:', error);
        res.status(500).json({ error: '照片上傳失敗' });
    }
});

// 獲取工單照片列表
app.get('/api/logs/:id/photos', authenticateToken, checkPermission('read'), (req, res) => {
    const workLogId = req.params.id;
    const photoType = req.query.type; // 可選：'before' 或 'after'

    let query = `
        SELECT id, photo_type, file_name, original_name, file_path, thumbnail_path, 
               file_size, mime_type, upload_date, sort_order
        FROM work_log_photos 
        WHERE work_log_id = ?
    `;
    let params = [workLogId];

    if (photoType && ['before', 'after'].includes(photoType)) {
        query += ' AND photo_type = ?';
        params.push(photoType);
    }

    query += ' ORDER BY photo_type ASC, sort_order ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('獲取照片列表錯誤:', err);
            res.status(500).json({ error: '獲取照片列表失敗' });
            return;
        }

        // 轉換檔案路徑為URL路徑
        const photos = rows.map(row => ({
            ...row,
            file_path: row.file_path.replace(/\\/g, '/').replace(/^.*uploads/, '/uploads'),
            thumbnail_path: row.thumbnail_path ? row.thumbnail_path.replace(/\\/g, '/').replace(/^.*uploads/, '/uploads') : null
        }));

        res.json(photos);
    });
});

// 刪除照片
app.delete('/api/photos/:photoId', authenticateToken, checkPermission('delete'), async (req, res) => {
    const photoId = req.params.photoId;

    try {
        // 獲取照片資訊
        const photo = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM work_log_photos WHERE id = ?', [photoId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!photo) {
            return res.status(404).json({ error: '照片不存在' });
        }

        // 刪除實體檔案
        try {
            await fs.unlink(photo.file_path);
            if (photo.thumbnail_path) {
                await fs.unlink(photo.thumbnail_path);
            }
        } catch (fileError) {
            console.warn('刪除檔案失敗:', fileError);
        }

        // 從資料庫刪除記錄
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM work_log_photos WHERE id = ?', [photoId], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ success: true, message: '照片刪除成功' });

    } catch (error) {
        console.error('刪除照片錯誤:', error);
        res.status(500).json({ error: '刪除照片失敗' });
    }
});

// 更新照片排序
app.put('/api/logs/:id/photos/reorder', authenticateToken, checkPermission('update'), async (req, res) => {
    const workLogId = req.params.id;
    const { photo_orders } = req.body; // [{ photo_id: 1, sort_order: 1 }, ...]

    if (!Array.isArray(photo_orders)) {
        return res.status(400).json({ error: '請提供正確的排序資料' });
    }

    try {
        // 批次更新排序
        for (const item of photo_orders) {
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE work_log_photos SET sort_order = ? WHERE id = ? AND work_log_id = ?',
                    [item.sort_order, item.photo_id, workLogId],
                    function(err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        res.json({ success: true, message: '照片排序更新成功' });

    } catch (error) {
        console.error('更新照片排序錯誤:', error);
        res.status(500).json({ error: '更新照片排序失敗' });
    }
});

startServer();