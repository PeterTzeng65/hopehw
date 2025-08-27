class WorkLogManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentEditId = null;
        this.departments = this.migrateDepartments('departments', ['總務處', '會計室', '人事室', '研發部', '業務部', 'IT部門', '行政部']);
        this.categories = this.migrateCategories('categories', ['硬體', '軟體', '網路', '周邊', '其他']);
        this.floors = ['B1', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        
        // 使用者管理相關屬性
        this.currentUser = null;
        this.userCurrentPage = 1;
        this.userItemsPerPage = 10;
        this.currentEditUserId = null;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.registerServiceWorker();
        this.initOfflineSupport();
    }
    
    async checkAuthentication() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.initializeApp();
            } else {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_info');
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('認證檢查錯誤:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            window.location.href = '/login.html';
        }
    }
    
    initializeApp() {
        this.updateUserInterface();
        this.bindEvents();
        this.loadDropdownOptions();
        this.loadWorkLogs();
        this.initStatistics();
        this.initUserManagement();
        this.initDashboard();
        this.initAutoBackup();
        this.initSecurityEnhancements();
    }
    
    updateUserInterface() {
        // 更新使用者資訊顯示
        const currentUserSpan = document.getElementById('currentUser');
        if (currentUserSpan) {
            currentUserSpan.textContent = `${this.currentUser.full_name} (${this.currentUser.role})`;
        }
        
        // 根據權限顯示/隱藏功能按鈕
        this.updatePermissionBasedUI();
    }
    
    updatePermissionBasedUI() {
        const userPermissions = this.currentUser.permissions || [];
        
        // 使用者管理按鈕
        const userManageBtn = document.getElementById('userManageBtn');
        if (userManageBtn) {
            if (this.currentUser.role === 'admin' || userPermissions.includes('manage_users')) {
                userManageBtn.style.display = 'inline-block';
            }
        }
        
        // 統計按鈕
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn && !userPermissions.includes('view_stats') && this.currentUser.role !== 'admin') {
            statsBtn.style.display = 'none';
        }
        
        // 新增按鈕
        const addBtn = document.getElementById('addBtn');
        if (addBtn && !userPermissions.includes('create') && this.currentUser.role !== 'admin') {
            addBtn.style.display = 'none';
        }
        
        // 根據用戶角色顯示/隱藏功能
        if (this.currentUser.role === 'viewer') {
            const editElements = document.querySelectorAll('.btn-edit, .btn-delete, #addBtn, #manageBtn');
            editElements.forEach(el => el.style.display = 'none');
        }
        
        // 只有管理員和組長可以查看已刪除記錄
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'manager') {
            const deletedRecordsBtn = document.getElementById('deletedRecordsBtn');
            if (deletedRecordsBtn) {
                deletedRecordsBtn.style.display = 'inline-block';
            }
        }
    }

    async logout() {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('登出錯誤:', error);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            window.location.href = '/login.html';
        }
    }

    // 為所有API請求添加認證標頭
    async makeAuthenticatedRequest(url, options = {}) {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login.html';
            return null;
        }

        const authHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const requestOptions = {
            ...options,
            headers: {
                ...authHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, requestOptions);
            
            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_info');
                window.location.href = '/login.html';
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('API請求錯誤:', error);
            throw error;
        }
    }

    bindEvents() {
        // 登出功能
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        
        // 原有功能
        document.getElementById('addBtn')?.addEventListener('click', () => this.showModal());
        document.getElementById('searchBtn')?.addEventListener('click', () => this.searchLogs());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetFilters());
        document.getElementById('prevBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('logForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        document.querySelector('.close').addEventListener('click', () => this.hideModal());
        document.getElementById('addDepartmentBtn').addEventListener('click', () => this.addNewDepartment());
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.addNewCategory());
        document.getElementById('manageBtn').addEventListener('click', () => this.showManageModal());
        document.getElementById('manageModalClose').addEventListener('click', () => this.hideManageModal());
        document.getElementById('manageModalCancel').addEventListener('click', () => this.hideManageModal());
        document.getElementById('addDepartmentManageBtn').addEventListener('click', () => this.addDepartmentFromManage());
        document.getElementById('addCategoryManageBtn').addEventListener('click', () => this.addCategoryFromManage());
        
        // 照片上傳功能
        this.initPhotoUpload();
        
        // 操作記錄和刪除記錄功能
        this.initOperationLogs();
        this.initDeletedRecords();
        
        document.getElementById('newDepartmentInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addDepartmentFromManage();
            }
        });
        
        document.getElementById('newCategoryInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCategoryFromManage();
            }
        });
        
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLogs();
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal')) {
                this.hideModal();
            }
            if (e.target === document.getElementById('manageModal')) {
                this.hideManageModal();
            }
        });
    }

    async loadWorkLogs(page = 1) {
        try {
            const searchParams = new URLSearchParams({
                page,
                limit: this.itemsPerPage,
                search: document.getElementById('searchInput')?.value || '',
                status: document.getElementById('statusFilter')?.value || '',
                category: document.getElementById('categoryFilter')?.value || ''
            });

            const response = await this.makeAuthenticatedRequest(`/api/logs?${searchParams}`);
            if (!response) return;
            
            const data = await response.json();

            this.renderTable(data.data);
            this.updatePagination(data.page, data.totalPages, data.total);
            this.currentPage = page;
            
            // 更新儀表板數據
            this.updateDashboardData();
        } catch (error) {
            console.error('載入資料失敗:', error);
            this.showMessage('載入資料失敗', 'error');
        }
    }

    renderTable(logs) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: #999;">沒有找到符合條件的記錄</td></tr>';
            return;
        }

        const searchKeyword = document.getElementById('searchInput').value.trim();

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.highlightKeyword(log.serial_number, searchKeyword)}</td>
                <td>${this.formatDate(log.created_date)}</td>
                <td title="${log.current_status}">${this.truncateTextWithHighlight(log.current_status, searchKeyword, 30)}</td>
                <td title="${log.improved_status || ''}">${this.truncateTextWithHighlight(log.improved_status || '', searchKeyword, 30)}</td>
                <td>${log.problem_category}</td>
                <td>${this.highlightKeyword(log.department, searchKeyword)}</td>
                <td>${log.extension || ''}</td>
                <td>${this.highlightKeyword(log.reporter, searchKeyword)}</td>
                <td>${this.highlightKeyword(log.resolver || '', searchKeyword)}</td>
                <td><span class="status-${this.getStatusClass(log.status)}">${log.status}</span></td>
                <td title="${log.notes || ''}">${this.truncateTextWithHighlight(log.notes || '', searchKeyword, 30)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-view" onclick="workLogManager.viewLog(${log.id})">檢視</button>
                        <button class="btn-edit" onclick="workLogManager.editLog(${log.id})">編輯</button>
                        ${(this.currentUser.role === 'admin' || this.currentUser.role === 'manager') ? 
                            `<button class="btn-operations" onclick="workLogManager.showOperationLogs(${log.id}, '${log.serial_number}')" title="查看操作記錄">
                                <i class="fas fa-history"></i>
                            </button>` : ''
                        }
                        <button class="btn-delete" onclick="workLogManager.deleteLog(${log.id})">刪除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updatePagination(currentPage, totalPages, totalItems) {
        document.getElementById('pageInfo').textContent = `第 ${currentPage} 頁 / 共 ${totalPages} 頁 (總計 ${totalItems} 筆)`;
        document.getElementById('prevBtn').disabled = currentPage <= 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        
        // 如果文字包含HTML標籤，先計算純文字長度
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (plainText.length <= maxLength) {
            return text;
        }
        
        // 如果需要截斷，重新處理
        const truncatedPlainText = plainText.substring(0, maxLength);
        // 在截斷的文字中應用醒目標示
        const searchKeyword = document.getElementById('searchInput').value.trim();
        const highlightedText = this.highlightKeyword(truncatedPlainText, searchKeyword);
        return highlightedText + '...';
    }

    getStatusClass(status) {
        const statusMap = {
            '處理中': 'processing',
            '已處理': 'completed',
            '無法處理': 'cannot',
            '已提出需求': 'request'
        };
        return statusMap[status] || 'processing';
    }

    showModal(editData = null) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('logForm');

        // 清除任何現有的照片區域
        const existingPhotoSection = document.getElementById('photoSection');
        if (existingPhotoSection) {
            existingPhotoSection.remove();
        }

        if (editData) {
            modalTitle.textContent = '編輯工作記錄';
            this.populateForm(editData);
            this.currentEditId = editData.id;
            // 為編輯模式添加照片功能
            this.addPhotoSectionToModal(editData.id);
            this.loadExistingPhotos(editData.id);
        } else {
            modalTitle.textContent = '新增工作記錄';
            form.reset();
            this.currentEditId = null;
            // 為新增模式添加照片功能（暫時性的）
            this.addPhotoSectionToModal('new');
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        const modal = document.getElementById('modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.currentEditId = null;
    }

    populateForm(data) {
        document.getElementById('currentStatus').value = data.current_status || '';
        document.getElementById('improvedStatus').value = data.improved_status || '';
        document.getElementById('problemCategory').value = data.problem_category || '';
        document.getElementById('department').value = data.department || '';
        document.getElementById('extension').value = data.extension || '';
        document.getElementById('reporter').value = data.reporter || '';
        document.getElementById('resolver').value = data.resolver || '';
        document.getElementById('status').value = data.status || '處理中';
        document.getElementById('notes').value = data.notes || '';
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const formData = {
            current_status: document.getElementById('currentStatus').value,
            improved_status: document.getElementById('improvedStatus').value,
            problem_category: document.getElementById('problemCategory').value,
            department: document.getElementById('department').value,
            extension: document.getElementById('extension').value,
            reporter: document.getElementById('reporter').value,
            resolver: document.getElementById('resolver').value,
            status: document.getElementById('status').value,
            notes: document.getElementById('notes').value
        };

        try {
            let response;
            if (this.currentEditId) {
                response = await this.makeAuthenticatedRequest(`/api/logs/${this.currentEditId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                response = await this.makeAuthenticatedRequest('/api/logs', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }

            if (!response) return;

            if (response.ok) {
                const responseData = await response.json();
                
                if (this.currentEditId) {
                    // 編輯模式
                    this.hideModal();
                    this.loadWorkLogs(this.currentPage);
                    this.showMessage('記錄已更新成功', 'success');
                } else {
                    // 新增模式 - 詢問是否要上傳照片
                    const newLogId = responseData.id;
                    const uploadPhotos = confirm('記錄已新增成功！是否要立即上傳照片？');
                    
                    this.hideModal();
                    this.loadWorkLogs(this.currentPage);
                    this.showMessage('記錄已新增成功', 'success');
                    
                    if (uploadPhotos && newLogId) {
                        // 直接開啟編輯模式進行照片上傳
                        setTimeout(() => {
                            this.editLog(newLogId);
                        }, 500);
                    }
                }
            } else {
                const error = await response.json();
                this.showMessage(error.error || '操作失敗', 'error');
            }
        } catch (error) {
            console.error('提交表單失敗:', error);
            this.showMessage('操作失敗', 'error');
        }
    }

    async viewLog(id) {
        try {
            // 載入工單資料
            const response = await this.makeAuthenticatedRequest(`/api/logs/${id}`);
            if (!response) return;
            
            if (response.ok) {
                const log = await response.json();
                this.showViewModal(log, id);
            } else {
                this.showMessage('載入記錄失敗', 'error');
            }
        } catch (error) {
            console.error('載入記錄失敗:', error);
            this.showMessage('載入記錄失敗', 'error');
        }
    }

    async editLog(id) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/logs/${id}`);
            if (!response) return;
            
            if (response.ok) {
                const log = await response.json();
                this.showEditModalWithPhotos(id, log);
            } else {
                this.showMessage('載入記錄失敗', 'error');
            }
        } catch (error) {
            console.error('載入記錄失敗:', error);
            this.showMessage('載入記錄失敗', 'error');
        }
    }

    async deleteLog(id) {
        if (!confirm('確定要刪除這筆記錄嗎？')) {
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest(`/api/logs/${id}`, {
                method: 'DELETE'
            });

            if (!response) return;

            if (response.ok) {
                this.loadWorkLogs(this.currentPage);
                this.showMessage('記錄已刪除成功', 'success');
            } else {
                const error = await response.json();
                this.showMessage(error.error || '刪除失敗', 'error');
            }
        } catch (error) {
            console.error('刪除記錄失敗:', error);
            this.showMessage('刪除失敗', 'error');
        }
    }

    searchLogs() {
        this.currentPage = 1;
        this.loadWorkLogs(1);
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('categoryFilter').value = '';
        this.currentPage = 1;
        this.loadWorkLogs(1);
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.loadWorkLogs(this.currentPage - 1);
        }
    }

    nextPage() {
        // 檢查是否還有下一頁
        const nextBtn = document.getElementById('nextBtn');
        if (!nextBtn.disabled) {
            this.loadWorkLogs(this.currentPage + 1);
        }
    }

    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text;
        
        // 將搜尋關鍵字轉為正則表達式，忽略大小寫
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    truncateTextWithHighlight(text, keyword, maxLength) {
        if (!text) return '';
        
        // 先截斷純文字
        if (text.length <= maxLength) {
            return this.highlightKeyword(text, keyword);
        }
        
        const truncated = text.substring(0, maxLength);
        return this.highlightKeyword(truncated, keyword) + '...';
    }

    showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            color: white;
            z-index: 2000;
            background-color: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    loadFromStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    }

    saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    migrateDepartments(key, defaultItems) {
        const stored = this.loadFromStorage(key);
        
        // 如果沒有儲存的資料，用預設值建立
        if (!stored) {
            return defaultItems.map((name, index) => ({
                id: index + 1,
                name: name,
                floor: '',
                createdDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString()
            }));
        }
        
        // 如果儲存的是舊格式（字串陣列），轉換為新格式
        if (Array.isArray(stored) && stored.length > 0 && typeof stored[0] === 'string') {
            return stored.map((name, index) => ({
                id: index + 1,
                name: name,
                floor: '',
                createdDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString()
            }));
        }
        
        // 如果已經是物件格式但沒有樓層欄位，加入樓層欄位
        if (Array.isArray(stored) && stored.length > 0 && typeof stored[0] === 'object' && !stored[0].hasOwnProperty('floor')) {
            return stored.map(item => ({
                ...item,
                floor: ''
            }));
        }
        
        // 如果已經是完整格式，直接返回
        return stored;
    }

    migrateCategories(key, defaultItems) {
        const stored = this.loadFromStorage(key);
        
        // 如果沒有儲存的資料，用預設值建立
        if (!stored) {
            return defaultItems.map((name, index) => ({
                id: index + 1,
                name: name,
                createdDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString()
            }));
        }
        
        // 如果儲存的是舊格式（字串陣列），轉換為新格式
        if (Array.isArray(stored) && stored.length > 0 && typeof stored[0] === 'string') {
            return stored.map((name, index) => ({
                id: index + 1,
                name: name,
                createdDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString()
            }));
        }
        
        // 如果已經是新格式，直接返回
        return stored;
    }

    getNextId(items) {
        if (items.length === 0) return 1;
        return Math.max(...items.map(item => item.id)) + 1;
    }

    formatDateTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    compareFloors(floor1, floor2) {
        // 處理空值
        if (!floor1 && !floor2) return 0;
        if (!floor1) return 1;
        if (!floor2) return -1;

        // 轉換樓層為數字進行比較
        const getFloorNumber = (floor) => {
            if (floor === 'B1') return -1;
            if (floor === 'B2') return -2;
            if (floor === 'B3') return -3;
            return parseInt(floor) || 0;
        };

        return getFloorNumber(floor1) - getFloorNumber(floor2);
    }

    loadDropdownOptions() {
        this.updateDepartmentDropdown();
        this.updateCategoryDropdown();
        this.updateFilterDropdowns();
    }

    updateDepartmentDropdown() {
        const select = document.getElementById('department');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">請選擇</option>';
        this.departments.sort((a, b) => a.name.localeCompare(b.name)).forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            select.appendChild(option);
        });
        
        if (currentValue && this.departments.find(d => d.name === currentValue)) {
            select.value = currentValue;
        }
    }

    updateCategoryDropdown() {
        const select = document.getElementById('problemCategory');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">請選擇</option>';
        this.categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            select.appendChild(option);
        });
        
        if (currentValue && this.categories.find(c => c.name === currentValue)) {
            select.value = currentValue;
        }
    }

    updateFilterDropdowns() {
        const categoryFilter = document.getElementById('categoryFilter');
        const currentCategoryFilter = categoryFilter.value;
        
        // 只保留第一個選項
        while (categoryFilter.children.length > 1) {
            categoryFilter.removeChild(categoryFilter.lastChild);
        }
        
        this.categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
        
        if (currentCategoryFilter && this.categories.find(c => c.name === currentCategoryFilter)) {
            categoryFilter.value = currentCategoryFilter;
        }
    }

    addNewDepartment() {
        const newDept = prompt('請輸入新的單位名稱:');
        if (newDept && newDept.trim() && !this.departments.find(d => d.name === newDept.trim())) {
            const now = new Date().toISOString();
            this.departments.push({
                id: this.getNextId(this.departments),
                name: newDept.trim(),
                floor: '',
                createdDate: now,
                modifiedDate: now
            });
            this.saveToStorage('departments', this.departments);
            this.updateDepartmentDropdown();
            document.getElementById('department').value = newDept.trim();
            this.showMessage(`已新增單位: ${newDept.trim()}`, 'success');
        } else if (newDept && this.departments.find(d => d.name === newDept.trim())) {
            this.showMessage('該單位已存在', 'error');
        }
    }

    addNewCategory() {
        const newCat = prompt('請輸入新的問題類別:');
        if (newCat && newCat.trim() && !this.categories.find(c => c.name === newCat.trim())) {
            const now = new Date().toISOString();
            this.categories.push({
                id: this.getNextId(this.categories),
                name: newCat.trim(),
                createdDate: now,
                modifiedDate: now
            });
            this.saveToStorage('categories', this.categories);
            this.updateCategoryDropdown();
            this.updateFilterDropdowns();
            document.getElementById('problemCategory').value = newCat.trim();
            this.showMessage(`已新增類別: ${newCat.trim()}`, 'success');
        } else if (newCat && this.categories.find(c => c.name === newCat.trim())) {
            this.showMessage('該類別已存在', 'error');
        }
    }

    showManageModal() {
        const modal = document.getElementById('manageModal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.renderManageItems();
    }

    hideManageModal() {
        const modal = document.getElementById('manageModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    renderManageItems() {
        this.renderDepartmentsList();
        this.renderCategoriesList();
    }

    renderDepartmentsList(sortBy = 'name') {
        const container = document.getElementById('departmentsList');
        container.innerHTML = `
            <div class="department-controls">
                <label>排序方式：</label>
                <select id="departmentSortSelect" onchange="workLogManager.renderDepartmentsList(this.value)">
                    <option value="name" ${sortBy === 'name' ? 'selected' : ''}>按名稱</option>
                    <option value="floor" ${sortBy === 'floor' ? 'selected' : ''}>按樓層</option>
                    <option value="created" ${sortBy === 'created' ? 'selected' : ''}>按創建日期</option>
                    <option value="modified" ${sortBy === 'modified' ? 'selected' : ''}>按修改日期</option>
                </select>
            </div>
            <div class="items-header">
                <span class="header-id">編號</span>
                <span class="header-name">名稱</span>
                <span class="header-floor">樓層</span>
                <span class="header-date">創建日期</span>
                <span class="header-date">修改日期</span>
                <span class="header-actions">操作</span>
            </div>
        `;
        
        // 排序邏輯
        let sortedDepartments = [...this.departments];
        switch(sortBy) {
            case 'floor':
                sortedDepartments.sort((a, b) => this.compareFloors(a.floor || '', b.floor || ''));
                break;
            case 'created':
                sortedDepartments.sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));
                break;
            case 'modified':
                sortedDepartments.sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
                break;
            default:
                sortedDepartments.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        sortedDepartments.forEach((dept, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-row';
            itemDiv.innerHTML = `
                <span class="item-id">${dept.id}</span>
                <span class="item-name">${dept.name}</span>
                <span class="item-floor">${dept.floor || '未設定'}</span>
                <span class="item-date">${this.formatDateTime(dept.createdDate)}</span>
                <span class="item-date">${this.formatDateTime(dept.modifiedDate)}</span>
                <div class="item-actions">
                    <button class="btn-small btn-edit-small" onclick="workLogManager.editDepartment(${dept.id})">編輯</button>
                    <button class="btn-small btn-delete-small" onclick="workLogManager.deleteDepartment(${dept.id})">刪除</button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    renderCategoriesList() {
        const container = document.getElementById('categoriesList');
        container.innerHTML = `
            <div class="items-header">
                <span class="header-id">編號</span>
                <span class="header-name">名稱</span>
                <span class="header-date">創建日期</span>
                <span class="header-date">修改日期</span>
                <span class="header-actions">操作</span>
            </div>
        `;
        
        this.categories.sort((a, b) => a.name.localeCompare(b.name)).forEach((cat, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-row';
            itemDiv.innerHTML = `
                <span class="item-id">${cat.id}</span>
                <span class="item-name">${cat.name}</span>
                <span class="item-date">${this.formatDateTime(cat.createdDate)}</span>
                <span class="item-date">${this.formatDateTime(cat.modifiedDate)}</span>
                <div class="item-actions">
                    <button class="btn-small btn-edit-small" onclick="workLogManager.editCategory(${cat.id})">編輯</button>
                    <button class="btn-small btn-delete-small" onclick="workLogManager.deleteCategory(${cat.id})">刪除</button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    addDepartmentFromManage() {
        const nameInput = document.getElementById('newDepartmentInput');
        const floorSelect = document.getElementById('newDepartmentFloorSelect');
        const newDept = nameInput.value.trim();
        const newFloor = floorSelect.value;
        
        if (newDept && !this.departments.find(d => d.name === newDept)) {
            const now = new Date().toISOString();
            this.departments.push({
                id: this.getNextId(this.departments),
                name: newDept,
                floor: newFloor,
                createdDate: now,
                modifiedDate: now
            });
            this.saveToStorage('departments', this.departments);
            this.updateDepartmentDropdown();
            nameInput.value = '';
            floorSelect.value = '';
            
            // 保持當前的排序方式
            const currentSort = document.getElementById('departmentSortSelect')?.value || 'name';
            this.renderDepartmentsList(currentSort);
            this.showMessage(`已新增單位: ${newDept}${newFloor ? ' (樓層: ' + newFloor + ')' : ''}`, 'success');
        } else if (newDept && this.departments.find(d => d.name === newDept)) {
            this.showMessage('該單位已存在', 'error');
        } else {
            this.showMessage('請輸入單位名稱', 'error');
        }
    }

    addCategoryFromManage() {
        const input = document.getElementById('newCategoryInput');
        const newCat = input.value.trim();
        
        if (newCat && !this.categories.find(c => c.name === newCat)) {
            const now = new Date().toISOString();
            this.categories.push({
                id: this.getNextId(this.categories),
                name: newCat,
                createdDate: now,
                modifiedDate: now
            });
            this.saveToStorage('categories', this.categories);
            this.updateCategoryDropdown();
            this.updateFilterDropdowns();
            this.renderCategoriesList();
            input.value = '';
            this.showMessage(`已新增類別: ${newCat}`, 'success');
        } else if (newCat && this.categories.find(c => c.name === newCat)) {
            this.showMessage('該類別已存在', 'error');
        } else {
            this.showMessage('請輸入類別名稱', 'error');
        }
    }

    editDepartment(id) {
        const dept = this.departments.find(d => d.id === id);
        if (!dept) return;
        
        // 顯示編輯對話框
        this.showEditDepartmentDialog(dept);
    }

    showEditDepartmentDialog(dept) {
        // 移除任何現有的編輯對話框
        const existingModal = document.querySelector('.edit-dept-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal edit-dept-modal';
        modal.style.display = 'block';
        modal.id = 'editDeptModal';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>編輯單位資訊</h3>
                    <span class="close">&times;</span>
                </div>
                <div style="padding: 20px;">
                    <div class="form-group">
                        <label>單位名稱：</label>
                        <input type="text" id="editDeptName" value="${dept.name}" style="width: 100%; margin-bottom: 15px;">
                    </div>
                    <div class="form-group">
                        <label>樓層：</label>
                        <select id="editDeptFloor" style="width: 100%; margin-bottom: 15px;">
                            <option value="">請選擇樓層</option>
                            ${this.floors.map(floor => 
                                `<option value="${floor}" ${dept.floor === floor ? 'selected' : ''}>${floor}樓</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button id="editCancelBtn">取消</button>
                        <button class="primary" id="editSaveBtn">儲存</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // 使用事件監聽器而不是内联onclick
        modal.querySelector('.close').addEventListener('click', () => this.closeEditDialog());
        modal.querySelector('#editCancelBtn').addEventListener('click', () => this.closeEditDialog());
        modal.querySelector('#editSaveBtn').addEventListener('click', () => this.updateDepartment(dept.id));
        
        // 點擊外部關閉
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditDialog();
            }
        });
    }

    closeEditDialog() {
        const modal = document.querySelector('.edit-dept-modal');
        if (modal) {
            modal.remove();
        }
        document.body.style.overflow = 'auto';
    }

    updateDepartment(id) {
        const newName = document.getElementById('editDeptName').value.trim();
        const newFloor = document.getElementById('editDeptFloor').value;
        
        const dept = this.departments.find(d => d.id === id);
        if (!dept) return;
        
        if (newName && newName !== dept.name && this.departments.find(d => d.name === newName && d.id !== id)) {
            this.showMessage('該單位名稱已存在', 'error');
            return;
        }
        
        if (newName) {
            const oldName = dept.name;
            const oldFloor = dept.floor;
            
            dept.name = newName;
            dept.floor = newFloor;
            dept.modifiedDate = new Date().toISOString();
            
            this.saveToStorage('departments', this.departments);
            this.updateDepartmentDropdown();
            
            // 關閉對話框
            this.closeEditDialog();
            
            // 保持當前的排序方式
            const currentSort = document.getElementById('departmentSortSelect')?.value || 'name';
            this.renderDepartmentsList(currentSort);
            
            let message = `已修改單位: ${oldName} → ${newName}`;
            if (oldFloor !== newFloor) {
                message += `，樓層: ${oldFloor || '未設定'} → ${newFloor || '未設定'}`;
            }
            this.showMessage(message, 'success');
        }
    }

    editCategory(id) {
        const cat = this.categories.find(c => c.id === id);
        if (!cat) return;
        
        const oldName = cat.name;
        const newName = prompt('請輸入新的類別名稱:', oldName);
        
        if (newName && newName.trim() && newName.trim() !== oldName) {
            if (!this.categories.find(c => c.name === newName.trim() && c.id !== id)) {
                cat.name = newName.trim();
                cat.modifiedDate = new Date().toISOString();
                this.saveToStorage('categories', this.categories);
                this.updateCategoryDropdown();
                this.updateFilterDropdowns();
                this.renderCategoriesList();
                this.showMessage(`已修改類別: ${oldName} → ${newName.trim()}`, 'success');
            } else {
                this.showMessage('該類別名稱已存在', 'error');
            }
        }
    }

    deleteDepartment(id) {
        const dept = this.departments.find(d => d.id === id);
        if (!dept) return;
        
        if (confirm(`確定要刪除單位「${dept.name}」嗎？`)) {
            const index = this.departments.findIndex(d => d.id === id);
            this.departments.splice(index, 1);
            this.saveToStorage('departments', this.departments);
            this.updateDepartmentDropdown();
            
            // 保持當前的排序方式
            const currentSort = document.getElementById('departmentSortSelect')?.value || 'name';
            this.renderDepartmentsList(currentSort);
            this.showMessage(`已刪除單位: ${dept.name}`, 'success');
        }
    }

    deleteCategory(id) {
        const cat = this.categories.find(c => c.id === id);
        if (!cat) return;
        
        if (confirm(`確定要刪除類別「${cat.name}」嗎？`)) {
            const index = this.categories.findIndex(c => c.id === id);
            this.categories.splice(index, 1);
            this.saveToStorage('categories', this.categories);
            this.updateCategoryDropdown();
            this.updateFilterDropdowns();
            this.renderCategoriesList();
            this.showMessage(`已刪除類別: ${cat.name}`, 'success');
        }
    }

    // ========== 統計報表功能 ==========
    initStatistics() {
        const statsBtn = document.getElementById('statsBtn');
        const statsModal = document.getElementById('statsModal');
        const statsModalClose = document.getElementById('statsModalClose');
        const dateRangeSelect = document.getElementById('dateRange');
        const customDateRange = document.getElementById('customDateRange');
        const generateStatsBtn = document.getElementById('generateStatsBtn');

        statsBtn?.addEventListener('click', () => {
            statsModal.style.display = 'block';
            this.initializeStatsControls();
            this.loadDepartmentFilterOptions();
        });

        statsModalClose?.addEventListener('click', () => {
            statsModal.style.display = 'none';
        });

        // 日期範圍選擇
        dateRangeSelect?.addEventListener('change', (e) => {
            customDateRange.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        });

        // 產生報表
        generateStatsBtn?.addEventListener('click', () => {
            this.generateStatistics();
        });

        // 匯出功能
        document.getElementById('printBtn')?.addEventListener('click', () => this.printReport());
        document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.exportToCsv());
        document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportPdfBtn')?.addEventListener('click', () => this.exportToPdf());
        document.getElementById('exportPptBtn')?.addEventListener('click', () => this.exportToPpt());
        document.getElementById('saveReportBtn')?.addEventListener('click', () => this.saveReport());

        // 關閉模態框
        window.addEventListener('click', (e) => {
            if (e.target === statsModal) {
                statsModal.style.display = 'none';
            }
        });
    }

    initializeStatsControls() {
        const today = new Date();
        const endDate = document.getElementById('endDate');
        const startDate = document.getElementById('startDate');
        
        if (endDate) endDate.value = today.toISOString().split('T')[0];
        if (startDate) {
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.value = firstDayOfMonth.toISOString().split('T')[0];
        }
    }

    loadDepartmentFilterOptions() {
        const departmentFilter = document.getElementById('departmentFilter');
        if (!departmentFilter) return;
        
        // 清除現有選項，保留"全部單位"
        departmentFilter.innerHTML = '<option value="">全部單位</option>';
        
        // 從管理的單位清單中載入選項
        this.departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            departmentFilter.appendChild(option);
        });
    }

    async generateStatistics() {
        const statsType = document.getElementById('statsType').value || 'status';
        const chartType = document.getElementById('chartType').value || 'pie';
        const dateRange = document.getElementById('dateRange').value || 'all';
        const departmentFilter = document.getElementById('departmentFilter').value || '';

        console.log('開始產生統計報表:', { statsType, chartType, dateRange, departmentFilter });

        try {
            const filteredData = await this.getFilteredData(dateRange, departmentFilter);
            console.log('取得篩選後資料:', filteredData.length, '筆');
            
            if (!filteredData || filteredData.length === 0) {
                this.showMessage('沒有符合條件的資料', 'warning');
                return;
            }

            const statsData = this.processStatisticsData(filteredData, statsType);
            console.log('處理後的統計資料:', statsData);
            
            if (!statsData || !statsData.labels || statsData.labels.length === 0) {
                this.showMessage('統計資料處理失敗', 'error');
                return;
            }

            this.currentStatsData = {
                type: statsType,
                chartType: chartType,
                data: statsData,
                filteredData: filteredData,
                dateRange: dateRange,
                departmentFilter: departmentFilter
            };

            this.renderChart(statsData, chartType, statsType);
            this.renderStatsTable(statsData, statsType);
            
        } catch (error) {
            console.error('統計資料產生錯誤:', error);
            this.showMessage('產生統計資料時發生錯誤: ' + error.message, 'error');
        }
    }


    processStatisticsData(data, statsType) {
        const result = { labels: [], data: [], colors: [], details: [] };

        switch (statsType) {
            case 'status':
                return this.processStatusStats(data);
            case 'category':
                return this.processCategoryStats(data);
            case 'department':
                return this.processDepartmentStats(data);
            case 'resolver':
                return this.processResolverStats(data);
            case 'monthly':
                return this.processMonthlyStats(data);
            default:
                return result;
        }
    }

    processStatusStats(data) {
        const statusCount = {};
        const statusColors = {
            '處理中': '#f39c12',
            '已處理': '#27ae60', 
            '無法處理': '#e74c3c',
            '已提出需求': '#8e44ad'
        };

        data.forEach(item => {
            const status = item.status || '未知';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });

        const labels = Object.keys(statusCount);
        const counts = Object.values(statusCount);
        const colors = labels.map(label => statusColors[label] || '#95a5a6');

        return {
            labels: labels,
            data: counts,
            colors: colors,
            details: labels.map((label, index) => ({
                category: label,
                count: counts[index],
                percentage: ((counts[index] / data.length) * 100).toFixed(1)
            }))
        };
    }

    processCategoryStats(data) {
        const categoryCount = {};
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

        data.forEach(item => {
            const category = item.problem_category || '未分類';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        const labels = Object.keys(categoryCount);
        const counts = Object.values(categoryCount);

        return {
            labels: labels,
            data: counts,
            colors: colors.slice(0, labels.length),
            details: labels.map((label, index) => ({
                category: label,
                count: counts[index],
                percentage: ((counts[index] / data.length) * 100).toFixed(1)
            }))
        };
    }

    processDepartmentStats(data) {
        const deptCount = {};
        const colors = ['#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

        data.forEach(item => {
            const dept = item.department || '未知單位';
            deptCount[dept] = (deptCount[dept] || 0) + 1;
        });

        const sortedEntries = Object.entries(deptCount).sort((a, b) => b[1] - a[1]);
        const labels = sortedEntries.map(entry => entry[0]);
        const counts = sortedEntries.map(entry => entry[1]);

        return {
            labels: labels,
            data: counts,
            colors: colors.slice(0, labels.length),
            details: labels.map((label, index) => ({
                category: label,
                count: counts[index],
                percentage: ((counts[index] / data.length) * 100).toFixed(1)
            }))
        };
    }

    processResolverStats(data) {
        const resolverCount = {};
        const colors = ['#27ae60', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

        data.forEach(item => {
            const resolver = item.resolver || '未指定';
            resolverCount[resolver] = (resolverCount[resolver] || 0) + 1;
        });

        const sortedEntries = Object.entries(resolverCount).sort((a, b) => b[1] - a[1]);
        const labels = sortedEntries.map(entry => entry[0]);
        const counts = sortedEntries.map(entry => entry[1]);

        return {
            labels: labels,
            data: counts,
            colors: colors.slice(0, labels.length),
            details: labels.map((label, index) => ({
                category: label,
                count: counts[index],
                percentage: ((counts[index] / data.length) * 100).toFixed(1)
            }))
        };
    }

    processMonthlyStats(data) {
        const monthCount = {};
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#d35400', '#8e44ad', '#16a085'];

        data.forEach(item => {
            const date = new Date(item.created_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthCount[monthKey] = (monthCount[monthKey] || 0) + 1;
        });

        const sortedEntries = Object.entries(monthCount).sort((a, b) => a[0].localeCompare(b[0]));
        const labels = sortedEntries.map(entry => entry[0]);
        const counts = sortedEntries.map(entry => entry[1]);

        return {
            labels: labels,
            data: counts,
            colors: colors.slice(0, labels.length),
            details: labels.map((label, index) => ({
                category: label,
                count: counts[index],
                percentage: ((counts[index] / data.length) * 100).toFixed(1)
            }))
        };
    }

    renderChart(statsData, chartType, statsType) {
        const canvas = document.getElementById('statsChart');
        if (!canvas) {
            console.error('找不到圖表canvas元素');
            this.showMessage('圖表元素載入失敗', 'error');
            return;
        }

        // 檢查Chart.js是否載入
        if (typeof Chart === 'undefined') {
            console.error('Chart.js 未載入');
            this.showMessage('圖表庫載入失敗，請重新整理頁面', 'error');
            return;
        }

        // 檢查資料是否存在 - 支援新的資料格式
        if (!statsData || !statsData.labels || (!statsData.data && !statsData.datasets)) {
            console.error('統計資料不完整:', statsData);
            this.showMessage('統計資料不完整', 'error');
            return;
        }

        const ctx = canvas.getContext('2d');

        // 清除現有圖表
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        // 準備圖表配置 - 支援新格式
        let datasets;
        if (statsData.datasets) {
            // 新格式：使用傳入的datasets
            datasets = statsData.datasets;
        } else {
            // 舊格式：轉換為標準格式
            datasets = [{
                data: statsData.data,
                backgroundColor: statsData.colors,
                borderColor: statsData.colors.map(color => this.darkenColor(color, 20)),
                borderWidth: 2
            }];
        }

        // 保存this引用用於onClick事件
        const self = this;
        
        const chartConfig = {
            type: chartType,
            data: {
                labels: statsData.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: 10
                },
                plugins: {
                    legend: {
                        position: (chartType === 'pie' || chartType === 'doughnut') ? 'right' : 'top'
                    },
                    title: {
                        display: true,
                        text: this.getChartTitle(statsType, this.currentStatsData?.departmentFilter)
                    }
                },
                onClick: function(event, elements, chart) {
                    console.log('圖表點擊事件觸發:', { event, elements, chart });
                    
                    if (elements && elements.length > 0) {
                        const elementIndex = elements[0].index;
                        const label = statsData.labels[elementIndex];
                        const value = statsData.data[elementIndex];
                        
                        console.log('點擊詳細信息:', { 
                            elementIndex, 
                            label, 
                            value, 
                            statsType, 
                            statsDataLabels: statsData.labels,
                            statsDataValues: statsData.data 
                        });
                        
                        self.showChartDetails(label, value, statsType, elementIndex);
                    } else {
                        console.log('沒有點擊到圖表元素');
                    }
                }
            }
        };

        if (chartType === 'bar') {
            chartConfig.options.scales = {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            };
        }

        try {
            this.currentChart = new Chart(ctx, chartConfig);
            console.log('圖表創建成功');
        } catch (error) {
            console.error('圖表創建失敗:', error);
            this.showMessage('圖表創建失敗: ' + error.message, 'error');
        }
    }

    getChartTitle(statsType, departmentFilter = '') {
        const titles = {
            'status': '狀態分佈統計',
            'category': '問題類別統計',
            'department': '單位分佈統計',
            'resolver': '改善者統計',
            'monthly': '月份統計'
        };
        
        let title = titles[statsType] || '統計圖表';
        
        // 如果有部門篩選，在標題中顯示
        if (departmentFilter && typeof departmentFilter === 'string' && departmentFilter.trim() !== '') {
            title += ` (${departmentFilter})`;
        }
        
        return title;
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    renderStatsTable(statsData, statsType) {
        const tableHead = document.getElementById('statsTableHead');
        const tableBody = document.getElementById('statsTableBody');

        // 清除現有內容
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // 設置表頭
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>項目</th>
            <th>數量</th>
            <th>百分比</th>
        `;
        tableHead.appendChild(headerRow);

        // 添加資料行
        statsData.details.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.category}</td>
                <td>
                    <span class="clickable-count" 
                          data-label="${item.category}" 
                          data-value="${item.count}" 
                          data-stats-type="${statsType}"
                          data-index="${index}"
                          style="color: #007bff; cursor: pointer; text-decoration: underline; font-weight: bold;"
                          onmouseover="this.style.color='#0056b3'; this.style.background='#f8f9fa'"
                          onmouseout="this.style.color='#007bff'; this.style.background=''"
                          title="點擊查看詳細資料">
                        ${item.count}
                    </span>
                </td>
                <td>${item.percentage}%</td>
            `;
            tableBody.appendChild(row);
        });

        // 添加總計行
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#e9ecef';
        totalRow.innerHTML = `
            <td>總計</td>
            <td>${statsData.data.reduce((sum, val) => sum + val, 0)}</td>
            <td>100.0%</td>
        `;
        tableBody.appendChild(totalRow);

        // 綁定數字點擊事件
        const clickableCounts = document.querySelectorAll('.clickable-count');
        clickableCounts.forEach(element => {
            element.addEventListener('click', () => {
                const label = element.getAttribute('data-label');
                const value = parseInt(element.getAttribute('data-value'));
                const statsTypeFromData = element.getAttribute('data-stats-type');
                const index = parseInt(element.getAttribute('data-index'));
                
                console.log('表格數字點擊事件:', { label, value, statsTypeFromData, index });
                
                this.showChartDetails(label, value, statsTypeFromData, index);
            });
        });
    }

    // ========== 匯出功能 ==========
    async printReport() {
        if (!this.currentStatsData) {
            this.showMessage('請先產生統計資料', 'error');
            return;
        }
        
        try {
            // 獲取圖表圖片
            let chartImageData = '';
            const canvas = document.getElementById('statsChart');
            if (canvas && this.currentChart) {
                chartImageData = canvas.toDataURL('image/png');
            }
            
            // 複製統計內容（排除控制項）
            const statsContent = document.querySelector('.stats-content').cloneNode(true);
            
            // 移除控制按鈕
            const controls = statsContent.querySelector('.stats-controls');
            const exportControls = statsContent.querySelector('.export-controls');
            if (controls) controls.remove();
            if (exportControls) exportControls.remove();
            
            // 將圖表canvas替換為圖片
            const chartContainer = statsContent.querySelector('.chart-container');
            if (chartContainer && chartImageData) {
                chartContainer.innerHTML = `<img src="${chartImageData}" alt="統計圖表" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">`;
            }
            
            // 如果統計資料太多，只顯示前10筆以確保能在一頁顯示
            const statsTableBody = statsContent.querySelector('#statsTableBody');
            if (statsTableBody && data && data.details && data.details.length > 10) {
                const rows = statsTableBody.querySelectorAll('tr');
                for (let i = 10; i < rows.length - 1; i++) { // 保留最後的總計行
                    if (rows[i]) {
                        rows[i].style.display = 'none';
                    }
                }
                
                // 添加省略說明
                const ellipsisRow = document.createElement('tr');
                ellipsisRow.innerHTML = '<td colspan="3" style="text-align: center; font-style: italic; color: #666;">... 其他項目已省略 ...</td>';
                if (statsTableBody.lastElementChild) {
                    statsTableBody.insertBefore(ellipsisRow, statsTableBody.lastElementChild);
                } else {
                    statsTableBody.appendChild(ellipsisRow);
                }
            }

            // 準備標題資訊
            const departmentInfo = this.currentStatsData.departmentFilter 
                ? ` (${this.currentStatsData.departmentFilter})`
                : '';
            
            const chartTitle = this.getChartTitle(this.currentStatsData.type, this.currentStatsData.departmentFilter);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>統計報表 - 資訊組工作日誌${departmentInfo}</title>
                    <style>
                        body { 
                            font-family: 'Microsoft JhengHei', Arial, sans-serif; 
                            margin: 20px; 
                            color: #333;
                        }
                        .chart-container { 
                            margin: 10px 0 5px 0; 
                            text-align: center; 
                            page-break-inside: avoid;
                            page-break-after: avoid;
                        }
                        .chart-container img { 
                            max-width: 70%; 
                            max-height: 200px; 
                            height: auto; 
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        }
                        .stats-table-container {
                            page-break-inside: avoid;
                            margin: 5px 0 20px 0;
                            page-break-before: avoid;
                        }
                        .stats-data-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin: 10px 0; 
                            font-size: 14px;
                        }
                        .stats-data-table th, .stats-data-table td { 
                            border: 1px solid #ddd; 
                            padding: 6px 8px; 
                            text-align: center; 
                        }
                        .stats-data-table th { 
                            background-color: #f8f9fa; 
                            font-weight: bold; 
                            font-size: 13px;
                        }
                        h1 { 
                            text-align: center; 
                            color: #2c3e50; 
                            border-bottom: 2px solid #3498db; 
                            padding-bottom: 5px; 
                            margin-bottom: 8px;
                            font-size: 18px;
                        }
                        h2 { 
                            color: #34495e; 
                            text-align: center; 
                            margin: 5px 0;
                            font-size: 14px;
                        }
                        .print-date { 
                            text-align: right; 
                            margin-bottom: 8px; 
                            color: #666; 
                            font-size: 10px;
                        }
                        .print-info { 
                            margin-bottom: 8px; 
                            text-align: center; 
                        }
                        @media print {
                            body { 
                                margin: 8px; 
                                font-size: 12px;
                            }
                            .chart-container { 
                                margin: 3px 0 2px 0; 
                                page-break-before: avoid;
                                page-break-after: avoid;
                            }
                            .chart-container img {
                                max-height: 150px;
                                max-width: 60%;
                            }
                            .stats-table-container {
                                margin: 2px 0 8px 0;
                                page-break-before: avoid;
                            }
                            .stats-data-table {
                                font-size: 10px;
                                margin: 2px 0;
                            }
                            .stats-data-table th, .stats-data-table td {
                                padding: 2px 4px;
                                line-height: 1.2;
                            }
                            h1 { 
                                font-size: 16px; 
                                margin-bottom: 5px;
                                padding-bottom: 3px;
                            }
                            h2 { 
                                font-size: 12px; 
                                margin: 3px 0;
                            }
                            .print-date {
                                margin-bottom: 5px;
                                font-size: 9px;
                            }
                            .print-info {
                                margin-bottom: 5px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>資訊組工作日誌 - 統計報表${departmentInfo}</h1>
                    <div class="print-date">列印時間: ${new Date().toLocaleString('zh-TW')}</div>
                    <div class="print-info">
                        <h2>${chartTitle}</h2>
                        ${this.currentStatsData.departmentFilter ? `<p><strong>篩選單位:</strong> ${this.currentStatsData.departmentFilter}</p>` : ''}
                    </div>
                    ${statsContent.innerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            
            // 等待內容載入後再列印
            printWindow.onload = function() {
                printWindow.print();
            };
            
        } catch (error) {
            console.error('列印報表錯誤:', error);
            this.showMessage('列印報表時發生錯誤: ' + error.message, 'error');
        }
    }

    exportToCsv() {
        if (!this.currentStatsData) {
            this.showMessage('請先產生統計資料', 'error');
            return;
        }

        const csvContent = this.generateCsvContent();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            // 生成文件名，包含部門篩選資訊
            const fileName = this.currentStatsData.departmentFilter 
                ? `統計報表_${this.currentStatsData.departmentFilter}_${new Date().toISOString().split('T')[0]}.csv`
                : `統計報表_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    generateCsvContent() {
        const { data, type } = this.currentStatsData;
        let csv = '\uFEFF'; // UTF-8 BOM
        csv += '統計報表\n';
        csv += `產生時間,${new Date().toLocaleString('zh-TW')}\n`;
        csv += `統計類型,${this.getChartTitle(type, this.currentStatsData.departmentFilter)}\n`;
        
        // 如果有部門篩選，加入篩選資訊
        if (this.currentStatsData.departmentFilter) {
            csv += `篩選單位,${this.currentStatsData.departmentFilter}\n`;
        }
        csv += '\n';
        csv += '項目,數量,百分比\n';
        
        data.details.forEach(item => {
            csv += `${item.category},${item.count},${item.percentage}%\n`;
        });
        
        csv += `總計,${data.data.reduce((sum, val) => sum + val, 0)},100.0%\n`;
        return csv;
    }

    exportToExcel() {
        if (!this.currentStatsData) {
            this.showMessage('請先產生統計資料', 'error');
            return;
        }

        try {
            const { data, type } = this.currentStatsData;
            const workbook = XLSX.utils.book_new();
            
            // 創建工作表資料，左側放表格，右側留空給圖表
            const wsData = [];
            
            // 標題區域 - 合併儲存格效果
            wsData.push(['📊 資訊組工作日誌 - 統計報表', '', '', '', '', '🔵 圓餅圖製作區域', '']);
            wsData.push(['⏰ 產生時間', new Date().toLocaleString('zh-TW'), '', '', '', '1️⃣ 選取圖表數據工作表', '']);
            wsData.push(['📈 統計類型', this.getChartTitle(type, this.currentStatsData.departmentFilter), '', '', '', '2️⃣ 全選資料 (Ctrl+A)', '']);
            
            // 如果有部門篩選，加入篩選資訊
            if (this.currentStatsData.departmentFilter) {
                wsData.push(['🏢 篩選單位', this.currentStatsData.departmentFilter, '', '', '', '3️⃣ 插入圖表 → 圓餅圖', '']);
                wsData.push(['', '', '', '', '', '4️⃣ 拖拉圖表到此區域', '']);
                wsData.push(['', '', '', '', '', '', '']);
                wsData.push(['', '', '', '', '', '📊 長條圖製作區域', '']);
            } else {
                wsData.push(['', '', '', '', '', '3️⃣ 插入圖表 → 圓餅圖', '']);
                wsData.push(['', '', '', '', '', '4️⃣ 拖拉圖表到此區域', '']);
                wsData.push(['', '', '', '', '', '', '']);
                wsData.push(['', '', '', '', '', '📊 長條圖製作區域', '']);
            }
            
            // 表格標題（左側）
            wsData.push(['📋 項目', '📊 數量', '📈 百分比', '📏 視覺化比例', '', '🔄 重複步驟1-2', '']);
            
            // 統計資料
            let maxCount = Math.max(...data.data);
            data.details.forEach((item, index) => {
                const barLength = Math.round((item.count / maxCount) * 15); // 條狀圖長度調整
                const bar = '█'.repeat(barLength) + '▓'.repeat(Math.max(0, 8-barLength)) + '░'.repeat(Math.max(0, 7));
                
                let instruction = '';
                if (index === 0) instruction = '5️⃣ 插入圖表 → 直條圖';
                else if (index === 1) instruction = '6️⃣ 拖拉圖表到此區域';
                else if (index === 2) instruction = '✨ 完成！雙圖表報表';
                else if (index === 3) instruction = '💡 提示：可調整圖表大小';
                else if (index === 4) instruction = '🎨 美化：修改顏色樣式';
                
                wsData.push([
                    item.category, 
                    item.count, 
                    item.percentage + '%', 
                    bar,
                    '',
                    instruction,
                    ''
                ]);
            });
            
            // 總計行
            wsData.push(['📊 總計', data.data.reduce((sum, val) => sum + val, 0), '100.0%', '█'.repeat(15) + '▓'.repeat(8) + '░'.repeat(7), '', '🎉 報表製作完成', '']);
            
            // 創建工作表
            const worksheet = XLSX.utils.aoa_to_sheet(wsData);
            
            // 設定欄寬
            const columnWidths = [
                { wch: 18 }, // 項目
                { wch: 10 }, // 數量
                { wch: 12 }, // 百分比
                { wch: 30 }, // 視覺化比例
                { wch: 2 },  // 分隔
                { wch: 25 }, // 圖表製作說明
                { wch: 5 }   // 額外空間
            ];
            worksheet['!cols'] = columnWidths;
            
            // 設定儲存格樣式
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            // 主標題樣式 (A1)
            if (!worksheet['A1'].s) worksheet['A1'].s = {};
            worksheet['A1'].s = {
                font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "1F4E79" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
            
            // 圓餅圖區域標題 (F1)
            if (!worksheet['F1']) worksheet['F1'] = { t: 's', v: '🔵 圓餅圖製作區域' };
            worksheet['F1'].s = {
                font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "E74C3C" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
            
            // 長條圖區域標題
            const barChartRowIndex = this.currentStatsData.departmentFilter ? 7 : 6;
            const barChartCellAddr = `F${barChartRowIndex}`;
            if (!worksheet[barChartCellAddr]) worksheet[barChartCellAddr] = { t: 's', v: '📊 長條圖製作區域' };
            worksheet[barChartCellAddr].s = {
                font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "27AE60" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
            
            // 表格標題行樣式 (第7行)
            const headerRowIndex = this.currentStatsData.departmentFilter ? 6 : 5;
            for (let col = 0; col <= 3; col++) {
                const cellAddr = XLSX.utils.encode_cell({ c: col, r: headerRowIndex });
                if (!worksheet[cellAddr]) continue;
                worksheet[cellAddr].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4472C4" } },
                    alignment: { horizontal: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                };
            }
            
            // 資料行樣式（斑馬紋）
            const startDataRow = headerRowIndex + 1;
            const endDataRow = startDataRow + data.details.length;
            
            for (let row = startDataRow; row < endDataRow; row++) {
                const isEvenRow = (row - startDataRow) % 2 === 0;
                const bgColor = isEvenRow ? "F2F2F2" : "FFFFFF";
                
                for (let col = 0; col <= 3; col++) {
                    const cellAddr = XLSX.utils.encode_cell({ c: col, r: row });
                    if (!worksheet[cellAddr]) continue;
                    worksheet[cellAddr].s = {
                        fill: { fgColor: { rgb: bgColor } },
                        alignment: { horizontal: col === 0 ? "left" : "center" },
                        border: {
                            top: { style: "thin", color: { rgb: "CCCCCC" } },
                            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                            left: { style: "thin", color: { rgb: "CCCCCC" } },
                            right: { style: "thin", color: { rgb: "CCCCCC" } }
                        }
                    };
                }
            }
            
            // 總計行樣式
            for (let col = 0; col <= 3; col++) {
                const cellAddr = XLSX.utils.encode_cell({ c: col, r: endDataRow });
                if (!worksheet[cellAddr]) continue;
                worksheet[cellAddr].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "70AD47" } },
                    alignment: { horizontal: "center" },
                    border: {
                        top: { style: "medium", color: { rgb: "000000" } },
                        bottom: { style: "medium", color: { rgb: "000000" } },
                        left: { style: "medium", color: { rgb: "000000" } },
                        right: { style: "medium", color: { rgb: "000000" } }
                    }
                };
            }
            
            // 添加圖表數據工作表（供圖表使用）
            const chartData = [
                ['類別', '數量'],
                ...data.details.map(item => [item.category, item.count])
            ];
            const chartWorksheet = XLSX.utils.aoa_to_sheet(chartData);
            XLSX.utils.book_append_sheet(workbook, chartWorksheet, '圖表數據');
            
            // 添加詳細工單清單工作表
            if (this.currentStatsData && this.currentStatsData.filteredData) {
                const detailData = [
                    ['📋 詳細工單清單', '', '', '', '', '', '', '', ''],
                    [`📊 統計類型: ${this.getStatsTypeDisplayName(type)}`, '', '', '', '', '', '', '', ''],
                    [`📅 匯出時間: ${new Date().toLocaleString('zh-TW')}`, '', '', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', '', '', ''],
                    ['工單編號', '問題描述', '改善後狀況', '問題類別', '部門', '通報人', '改善者', '狀態', '建立日期']
                ];
                
                // 按統計類型分組顯示
                data.details.forEach(category => {
                    const categoryLabel = category.category;
                    let categoryRecords = [];
                    
                    // 根據統計類型篩選記錄
                    switch(type) {
                        case 'status':
                            categoryRecords = this.currentStatsData.filteredData.filter(log => log.status === categoryLabel);
                            break;
                        case 'category':
                            categoryRecords = this.currentStatsData.filteredData.filter(log => log.category === categoryLabel);
                            break;
                        case 'department':
                            categoryRecords = this.currentStatsData.filteredData.filter(log => log.department === categoryLabel);
                            break;
                        case 'resolver':
                            categoryRecords = this.currentStatsData.filteredData.filter(log => (log.resolver || '未指派') === categoryLabel);
                            break;
                        default:
                            categoryRecords = this.currentStatsData.filteredData.filter(log => log[type] === categoryLabel);
                    }
                    
                    if (categoryRecords.length > 0) {
                        // 添加分類標題
                        detailData.push([]);
                        detailData.push([`📊 ${categoryLabel} (${categoryRecords.length}筆)`, '', '', '', '', '', '', '', '']);
                        detailData.push([]);
                        
                        // 添加該分類的記錄
                        categoryRecords.forEach(record => {
                            detailData.push([
                                record.serial_number || record.id,
                                record.current_status || '',
                                record.improved_status || '',
                                record.category || '',
                                record.department || '',
                                record.reporter || '',
                                record.resolver || '',
                                record.status || '',
                                record.created_at ? new Date(record.created_at).toLocaleDateString('zh-TW') : ''
                            ]);
                        });
                    }
                });
                
                const detailWorksheet = XLSX.utils.aoa_to_sheet(detailData);
                
                // 設置詳細清單工作表的欄寬
                detailWorksheet['!cols'] = [
                    { wch: 18 }, // 工單編號
                    { wch: 35 }, // 問題描述
                    { wch: 35 }, // 改善後狀況
                    { wch: 12 }, // 問題類別
                    { wch: 15 }, // 部門
                    { wch: 12 }, // 通報人
                    { wch: 12 }, // 改善者
                    { wch: 10 }, // 狀態
                    { wch: 15 }  // 建立日期
                ];
                
                XLSX.utils.book_append_sheet(workbook, detailWorksheet, '詳細清單');
            }
            
            // 簡化版Excel匯出，只包含統計數據
            XLSX.utils.book_append_sheet(workbook, worksheet, '統計報表');

            // 生成文件名，包含部門篩選資訊
            const fileName = this.currentStatsData.departmentFilter 
                ? `統計報表_${this.currentStatsData.departmentFilter}_${new Date().toISOString().split('T')[0]}.xlsx`
                : `統計報表_${new Date().toISOString().split('T')[0]}.xlsx`;
                
            XLSX.writeFile(workbook, fileName);
            this.showMessage('Excel 報表已下載！', 'success');
            
        } catch (error) {
            console.error('Excel export error:', error);
            this.showMessage('Excel 匯出失敗：' + error.message, 'error');
        }
    }
    
    generateVBACode(dataCount) {
        return `Sub 自動生成統計圖表()
    ' =========================================
    ' 統計圖表自動生成 VBA 程式
    ' 功能：一鍵生成圓餅圖和長條圖
    ' 使用：按 F5 執行此程式
    ' =========================================
    
    Dim ws統計 As Worksheet, ws數據 As Worksheet
    Dim 圓餅圖 As Chart, 長條圖 As Chart
    Dim 數據範圍 As Range
    
    Application.ScreenUpdating = False
    
    ' 設定工作表
    Set ws統計 = ThisWorkbook.Worksheets("統計報表")
    Set ws數據 = ThisWorkbook.Worksheets("圖表數據")
    Set 數據範圍 = ws數據.Range("A1:B" & (${dataCount} + 1))
    
    ' 清除現有圖表
    Dim obj As ChartObject
    For Each obj In ws統計.ChartObjects
        obj.Delete
    Next
    
    ' === 生成圓餅圖 ===
    Set 圓餅圖 = ws統計.ChartObjects.Add(ws統計.Range("F2").Left, ws統計.Range("F2").Top, 300, 200).Chart
    With 圓餅圖
        .SetSourceData 數據範圍
        .ChartType = xlPie
        .HasTitle = True
        .ChartTitle.Text = "📊 統計分析 - 圓餅圖"
        .ChartTitle.Font.Size = 12
        .ChartTitle.Font.Bold = True
        
        ' 數據標籤
        .SeriesCollection(1).HasDataLabels = True
        .SeriesCollection(1).DataLabels.ShowPercentage = True
        .SeriesCollection(1).DataLabels.ShowCategoryName = True
        .SeriesCollection(1).DataLabels.Position = xlLabelPositionBestFit
        .SeriesCollection(1).DataLabels.Font.Size = 9
        
        ' 圓餅圖顏色配置
        .SeriesCollection(1).Points(1).Format.Fill.ForeColor.RGB = RGB(68, 114, 196)
        If .SeriesCollection(1).Points.Count > 1 Then .SeriesCollection(1).Points(2).Format.Fill.ForeColor.RGB = RGB(237, 125, 49)
        If .SeriesCollection(1).Points.Count > 2 Then .SeriesCollection(1).Points(3).Format.Fill.ForeColor.RGB = RGB(165, 165, 165)
        If .SeriesCollection(1).Points.Count > 3 Then .SeriesCollection(1).Points(4).Format.Fill.ForeColor.RGB = RGB(255, 192, 0)
        If .SeriesCollection(1).Points.Count > 4 Then .SeriesCollection(1).Points(5).Format.Fill.ForeColor.RGB = RGB(112, 173, 71)
    End With
    
    ' === 生成長條圖 ===
    Set 長條圖 = ws統計.ChartObjects.Add(ws統計.Range("F15").Left, ws統計.Range("F15").Top, 300, 200).Chart
    With 長條圖
        .SetSourceData 數據範圍
        .ChartType = xlColumnClustered
        .HasTitle = True
        .ChartTitle.Text = "📈 統計分析 - 長條圖"
        .ChartTitle.Font.Size = 12
        .ChartTitle.Font.Bold = True
        
        ' 數據標籤和軸設定
        .SeriesCollection(1).HasDataLabels = True
        .SeriesCollection(1).DataLabels.ShowValue = True
        .SeriesCollection(1).DataLabels.Position = xlLabelPositionOutsideEnd
        .SeriesCollection(1).DataLabels.Font.Size = 9
        .SeriesCollection(1).Format.Fill.ForeColor.RGB = RGB(68, 114, 196)
        
        .Axes(xlCategory).TickLabels.Orientation = 45
        .Axes(xlValue).HasTitle = True
        .Axes(xlValue).AxisTitle.Text = "數量"
    End With
    
    ' === 美化報表標題 ===
    With ws統計.Range("A1:G1")
        .Interior.Color = RGB(31, 78, 121)
        .Font.Color = RGB(255, 255, 255)
        .Font.Bold = True
    End With
    
    ' 成功提示
    ws統計.Range("F1").Value = "✅ 圖表生成成功！"
    ws統計.Range("F1").Font.Color = RGB(39, 174, 96)
    ws統計.Range("F1").Font.Bold = True
    
    Application.ScreenUpdating = True
    MsgBox "🎉 統計圖表生成完成！" & vbCrLf & "• 圓餅圖：F2區域" & vbCrLf & "• 長條圖：F15區域", vbInformation
End Sub`
    }

    // ========== 儀表板功能 ==========
    async initDashboard() {
        try {
            await this.updateDashboardData();
        } catch (error) {
            console.error('儀表板初始化錯誤:', error);
        }
    }

    async updateDashboardData() {
        try {
            // 獲取所有工作日誌數據（取得全部資料而非分頁）
            const response = await fetch('/api/logs?limit=1000', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            
            if (!response.ok) throw new Error('獲取數據失敗');
            
            const result = await response.json();
            const logs = result.data || []; // 使用 result.data 而非 result 本身
            
            console.log('儀表板數據:', result); // 調試用
            
            // 總工單數 + 年度統計
            const totalCountElement = document.getElementById('totalCount');
            const totalCount = result.total || 0;
            
            // 計算各年度統計
            const yearStats = this.calculateYearlyStats(logs);
            const yearStatsText = yearStats.slice(0, 3).map(stat => 
                `${stat.year}/${stat.count}`
            ).join(' ');
            
            totalCountElement.innerHTML = `
                <div style="font-size: 1.8rem; font-weight: bold; margin-bottom: 5px;">${totalCount}</div>
                <div style="font-size: 0.8rem; color: #666; line-height: 1.2;">${yearStatsText}</div>
            `;
            
            // 本月新增工單
            const thisMonth = new Date();
            thisMonth.setDate(1);
            const monthlyLogs = logs.filter(log => new Date(log.created_at) >= thisMonth);
            document.getElementById('monthlyCount').textContent = monthlyLogs.length;
            
            // 活躍部門數
            const activeDepartments = [...new Set(logs.map(log => log.department))].length;
            document.getElementById('activeDepartments').textContent = activeDepartments;
            
            // 常見問題類型
            const categoryCount = logs.reduce((acc, log) => {
                acc[log.category] = (acc[log.category] || 0) + 1;
                return acc;
            }, {});
            
            let topCategory = '無資料';
            const categoryKeys = Object.keys(categoryCount);
            if (categoryKeys.length > 0) {
                topCategory = categoryKeys.reduce((a, b) => 
                    categoryCount[a] > categoryCount[b] ? a : b
                );
            }
            document.getElementById('topCategory').textContent = topCategory;
            
        } catch (error) {
            console.error('更新儀表板數據錯誤:', error);
        }
    }

    calculateYearlyStats(logs) {
        const yearCount = {};
        const currentYear = new Date().getFullYear();
        
        // 計算每年的工單數量
        logs.forEach(log => {
            const logDate = new Date(log.created_at);
            const year = logDate.getFullYear();
            yearCount[year] = (yearCount[year] || 0) + 1;
        });
        
        // 轉換為陣列並按年份降序排列
        const yearStats = Object.keys(yearCount)
            .map(year => ({
                year: parseInt(year),
                count: yearCount[year]
            }))
            .sort((a, b) => b.year - a.year);
        
        return yearStats;
    }

    // ========== 進階統計功能 ==========
    async getFilteredData(dateRange, departmentFilter) {
        try {
            const response = await fetch('/api/logs?limit=10000', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            
            if (!response.ok) throw new Error('獲取數據失敗');
            
            const result = await response.json();
            let logs = result.data || []; // 使用正確的API響應結構
            
            // 日期範圍篩選
            if (dateRange !== 'all') {
                logs = this.filterByDateRange(logs, dateRange);
            }
            
            // 部門篩選
            if (departmentFilter) {
                logs = logs.filter(log => log.department === departmentFilter);
            }
            
            return logs;
        } catch (error) {
            console.error('獲取篩選數據錯誤:', error);
            return [];
        }
    }

    filterByDateRange(logs, dateRange) {
        const now = new Date();
        let startDate;
        
        switch(dateRange) {
            case 'current-month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last-month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                return logs.filter(log => {
                    const logDate = new Date(log.created_at);
                    return logDate >= startDate && logDate <= endDate;
                });
            case 'last-3-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                break;
            case 'last-6-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                break;
            case 'current-quarter':
                const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                startDate = new Date(now.getFullYear(), quarterStart, 1);
                break;
            case 'last-quarter':
                const lastQuarterStart = Math.floor(now.getMonth() / 3) * 3 - 3;
                startDate = new Date(now.getFullYear(), lastQuarterStart, 1);
                const lastQuarterEnd = new Date(now.getFullYear(), lastQuarterStart + 3, 0);
                return logs.filter(log => {
                    const logDate = new Date(log.created_at);
                    return logDate >= startDate && logDate <= lastQuarterEnd;
                });
            case 'current-year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'last-year':
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
                return logs.filter(log => {
                    const logDate = new Date(log.created_at);
                    return logDate >= startDate && logDate <= lastYearEnd;
                });
            default:
                return logs;
        }
        
        return logs.filter(log => new Date(log.created_at) >= startDate);
    }

    processStatisticsData(data, statsType) {
        switch(statsType) {
            case 'status':
                return this.processStatusStats(data);
            case 'category':
                return this.processCategoryStats(data);
            case 'department':
                return this.processDepartmentStats(data);
            case 'resolver':
                return this.processResolverStats(data);
            case 'monthly':
                return this.processMonthlyStats(data);
            case 'personal':
                return this.processPersonalStats(data);
            case 'trend':
                return this.processTrendStats(data);
            case 'workload':
                return this.processWorkloadStats(data);
            case 'efficiency':
                return this.processEfficiencyStats(data);
            default:
                return this.processBasicStats(data, statsType);
        }
    }

    processPersonalStats(data) {
        const resolverStats = data.reduce((acc, log) => {
            const resolver = log.resolver || '未指派';
            if (!acc[resolver]) {
                acc[resolver] = {
                    total: 0,
                    completed: 0,
                    categories: {}
                };
            }
            acc[resolver].total++;
            if (log.status === '已處理') {
                acc[resolver].completed++;
            }
            acc[resolver].categories[log.category] = (acc[resolver].categories[log.category] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(resolverStats);
        const completionRates = labels.map(resolver => {
            const stats = resolverStats[resolver];
            return stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;
        });

        return {
            labels,
            datasets: [{
                label: '完成率 (%)',
                data: completionRates,
                backgroundColor: this.generateColors(labels.length)
            }],
            details: Object.entries(resolverStats).map(([resolver, stats]) => ({
                resolver,
                total: stats.total,
                completed: stats.completed,
                rate: `${((stats.completed / stats.total) * 100).toFixed(1)}%`
            }))
        };
    }

    processTrendStats(data) {
        const monthlyStats = data.reduce((acc, log) => {
            const date = new Date(log.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!acc[monthKey]) {
                acc[monthKey] = { total: 0, completed: 0 };
            }
            acc[monthKey].total++;
            if (log.status === '已處理') {
                acc[monthKey].completed++;
            }
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyStats).sort();
        const labels = sortedMonths.map(month => month);
        const totalData = sortedMonths.map(month => monthlyStats[month].total);
        const completedData = sortedMonths.map(month => monthlyStats[month].completed);

        return {
            labels,
            datasets: [
                {
                    label: '總工單數',
                    data: totalData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: true
                },
                {
                    label: '已完成',
                    data: completedData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    fill: true
                }
            ],
            details: sortedMonths.map(month => ({
                month,
                total: monthlyStats[month].total,
                completed: monthlyStats[month].completed,
                rate: `${((monthlyStats[month].completed / monthlyStats[month].total) * 100).toFixed(1)}%`
            }))
        };
    }

    processWorkloadStats(data) {
        const departmentWorkload = data.reduce((acc, log) => {
            const dept = log.department || '未分類';
            if (!acc[dept]) {
                acc[dept] = { total: 0, processing: 0, completed: 0 };
            }
            acc[dept].total++;
            if (log.status === '處理中') {
                acc[dept].processing++;
            } else if (log.status === '已處理') {
                acc[dept].completed++;
            }
            return acc;
        }, {});

        const labels = Object.keys(departmentWorkload);
        const totalData = labels.map(dept => departmentWorkload[dept].total);
        const processingData = labels.map(dept => departmentWorkload[dept].processing);

        return {
            labels,
            datasets: [
                {
                    label: '總工單',
                    data: totalData,
                    backgroundColor: '#3498db'
                },
                {
                    label: '處理中',
                    data: processingData,
                    backgroundColor: '#f39c12'
                }
            ],
            details: Object.entries(departmentWorkload).map(([dept, stats]) => ({
                department: dept,
                total: stats.total,
                processing: stats.processing,
                completed: stats.completed,
                load: stats.processing > 0 ? '高' : (stats.total > 5 ? '中' : '低')
            }))
        };
    }

    processEfficiencyStats(data) {
        const categoryEfficiency = data.reduce((acc, log) => {
            const category = log.category || '未分類';
            if (!acc[category]) {
                acc[category] = { total: 0, avgTime: 0, completed: 0 };
            }
            acc[category].total++;
            if (log.status === '已處理') {
                acc[category].completed++;
                // 假設處理時間計算（實際需要根據你的時間記錄邏輯）
                const createdTime = new Date(log.created_at);
                const resolvedTime = new Date(log.updated_at || log.created_at);
                const processingTime = (resolvedTime - createdTime) / (1000 * 60 * 60 * 24); // 天數
                acc[category].avgTime = (acc[category].avgTime + processingTime) / 2;
            }
            return acc;
        }, {});

        const labels = Object.keys(categoryEfficiency);
        const efficiencyData = labels.map(category => {
            const stats = categoryEfficiency[category];
            return stats.completed > 0 ? stats.avgTime.toFixed(1) : 0;
        });

        return {
            labels,
            datasets: [{
                label: '平均處理時間 (天)',
                data: efficiencyData,
                backgroundColor: this.generateColors(labels.length)
            }],
            details: Object.entries(categoryEfficiency).map(([category, stats]) => ({
                category,
                total: stats.total,
                completed: stats.completed,
                avgTime: `${stats.avgTime.toFixed(1)}天`,
                efficiency: stats.avgTime < 1 ? '高效' : (stats.avgTime < 3 ? '正常' : '需改進')
            }))
        };
    }

    processBasicStats(data, statsType) {
        // 原有的基本統計邏輯保持不變
        let groupedData;
        
        switch(statsType) {
            case 'status':
                groupedData = this.groupBy(data, 'status');
                break;
            case 'category':
                groupedData = this.groupBy(data, 'category');
                break;
            case 'department':
                groupedData = this.groupBy(data, 'department');
                break;
            case 'resolver':
                groupedData = this.groupBy(data, 'resolver');
                break;
            case 'monthly':
                groupedData = this.groupByMonth(data);
                break;
            default:
                groupedData = this.groupBy(data, 'category');
        }

        const labels = Object.keys(groupedData);
        const values = Object.values(groupedData);
        const total = values.reduce((sum, val) => sum + val, 0);

        return {
            labels,
            datasets: [{
                data: values,
                backgroundColor: this.generateColors(labels.length)
            }],
            details: labels.map((label, index) => ({
                category: label,
                count: values[index],
                percentage: total > 0 ? ((values[index] / total) * 100).toFixed(1) : 0
            }))
        };
    }

    generateColors(count) {
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ];
        return Array.from({length: count}, (_, i) => colors[i % colors.length]);
    }

    groupBy(data, key) {
        return data.reduce((acc, item) => {
            const value = item[key] || '未分類';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }

    groupByMonth(data) {
        return data.reduce((acc, item) => {
            const date = new Date(item.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
        }, {});
    }

    // ========== PWA 和技術功能 ==========
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker 註冊成功:', registration);
                
                // 檢查更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 顯示更新提示
                            this.showUpdateAvailable();
                        }
                    });
                });
            } catch (error) {
                console.log('Service Worker 註冊失敗:', error);
            }
        }
    }

    showUpdateAvailable() {
        const updateBar = document.createElement('div');
        updateBar.className = 'update-bar';
        updateBar.innerHTML = `
            <span>📱 新版本可用！</span>
            <button onclick="location.reload()">更新</button>
            <button onclick="this.parentNode.remove()">稍後</button>
        `;
        document.body.appendChild(updateBar);
    }

    initOfflineSupport() {
        // 檢查網路狀態
        this.updateOnlineStatus();
        
        window.addEventListener('online', () => {
            console.log('網路已連線');
            this.updateOnlineStatus();
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            console.log('網路已斷線');
            this.updateOnlineStatus();
        });

        // 檢查是否可安裝PWA
        this.initPWAInstall();
    }

    updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const statusEl = document.getElementById('networkStatus') || this.createNetworkStatus();
        
        statusEl.textContent = isOnline ? '🟢 線上' : '🔴 離線';
        statusEl.className = `network-status ${isOnline ? 'online' : 'offline'}`;
        
        // 更新儀表板樣式
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.classList.toggle('offline-mode', !isOnline);
        }
    }

    createNetworkStatus() {
        const statusEl = document.createElement('div');
        statusEl.id = 'networkStatus';
        statusEl.className = 'network-status';
        
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(statusEl);
        }
        
        return statusEl;
    }

    async syncOfflineData() {
        try {
            const offlineData = JSON.parse(localStorage.getItem('offlineWorkLogs') || '[]');
            
            if (offlineData.length > 0) {
                console.log(`正在同步 ${offlineData.length} 筆離線資料...`);
                
                for (const data of offlineData) {
                    try {
                        await this.saveWorkLogOnline(data.log);
                        console.log('離線資料同步成功:', data.id);
                    } catch (error) {
                        console.error('離線資料同步失敗:', error);
                        break; // 如果同步失敗，停止繼續同步
                    }
                }
                
                // 清除已同步的離線資料
                localStorage.removeItem('offlineWorkLogs');
                this.showMessage('離線資料同步完成!', 'success');
                
                // 重新載入資料
                await this.loadWorkLogs();
            }
        } catch (error) {
            console.error('同步離線資料時發生錯誤:', error);
        }
    }

    async saveWorkLogOffline(logData) {
        try {
            const offlineData = JSON.parse(localStorage.getItem('offlineWorkLogs') || '[]');
            const newEntry = {
                id: Date.now(),
                log: logData,
                timestamp: new Date().toISOString()
            };
            
            offlineData.push(newEntry);
            localStorage.setItem('offlineWorkLogs', JSON.stringify(offlineData));
            
            this.showMessage('資料已保存至離線儲存，將在連線時同步', 'info');
            return true;
        } catch (error) {
            console.error('離線儲存失敗:', error);
            return false;
        }
    }

    async saveWorkLogOnline(logData) {
        const token = localStorage.getItem('auth_token');
        const url = logData.id ? `/api/logs/${logData.id}` : '/api/logs';
        const method = logData.id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(logData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    initPWAInstall() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // 防止默認的安裝提示
            e.preventDefault();
            deferredPrompt = e;
            
            // 顯示自定義安裝按鈕
            this.showInstallButton(deferredPrompt);
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA 安裝成功');
            this.hideInstallButton();
            this.showMessage('應用程式已成功安裝！', 'success');
        });
    }

    showInstallButton(deferredPrompt) {
        const installButton = document.createElement('button');
        installButton.textContent = '📱 安裝應用程式';
        installButton.className = 'install-button';
        installButton.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const choiceResult = await deferredPrompt.userChoice;
                
                if (choiceResult.outcome === 'accepted') {
                    console.log('用戶接受安裝');
                } else {
                    console.log('用戶拒絕安裝');
                }
                
                deferredPrompt = null;
                this.hideInstallButton();
            }
        };
        
        const controls = document.querySelector('.controls .action-buttons');
        if (controls) {
            controls.appendChild(installButton);
        }
    }

    hideInstallButton() {
        const installButton = document.querySelector('.install-button');
        if (installButton) {
            installButton.remove();
        }
    }

    // ========== 自動備份功能 ==========
    initAutoBackup() {
        // 每24小時自動備份一次
        setInterval(() => {
            this.createAutoBackup();
        }, 24 * 60 * 60 * 1000);
        
        // 立即執行一次備份檢查
        setTimeout(() => {
            this.checkBackupNeeded();
        }, 5000);
    }

    async createAutoBackup() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('自動備份完成:', result);
                
                // 更新最後備份時間
                localStorage.setItem('lastBackupTime', new Date().toISOString());
            }
        } catch (error) {
            console.error('自動備份失敗:', error);
        }
    }

    async checkBackupNeeded() {
        const lastBackup = localStorage.getItem('lastBackupTime');
        const now = new Date();
        
        if (!lastBackup) {
            await this.createAutoBackup();
            return;
        }
        
        const lastBackupDate = new Date(lastBackup);
        const timeDiff = now - lastBackupDate;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        if (daysDiff >= 1) {
            await this.createAutoBackup();
        }
    }

    // ========== 安全性增強 ==========
    initSecurityEnhancements() {
        // JWT Token 自動續約
        this.initTokenRefresh();
        
        // 操作日誌記錄
        this.initActivityLogging();
        
        // 閒置檢測
        this.initIdleDetection();
    }

    initTokenRefresh() {
        // 每30分鐘檢查一次token是否需要續約
        setInterval(() => {
            this.checkTokenExpiry();
        }, 30 * 60 * 1000);
    }

    async checkTokenExpiry() {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
            // 解析JWT token的過期時間
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expTime = payload.exp * 1000;
            const now = Date.now();
            
            // 如果在30分鐘內過期，嘗試刷新
            if (expTime - now < 30 * 60 * 1000) {
                await this.refreshToken();
            }
        } catch (error) {
            console.error('檢查token過期時間失敗:', error);
        }
    }

    async refreshToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('auth_token', data.token);
                console.log('Token 續約成功');
            }
        } catch (error) {
            console.error('Token 續約失敗:', error);
            // 重新導向到登入頁面
            this.logout();
        }
    }

    initActivityLogging() {
        // 記錄重要操作
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch.apply(window, args);
            
            // 記錄API調用
            if (args[0] && args[0].includes('/api/')) {
                this.logActivity({
                    action: 'API_CALL',
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    timestamp: new Date().toISOString()
                });
            }
            
            return response;
        };
    }

    logActivity(activityData) {
        const activities = JSON.parse(localStorage.getItem('userActivities') || '[]');
        activities.push(activityData);
        
        // 只保留最近100筆記錄
        if (activities.length > 100) {
            activities.splice(0, activities.length - 100);
        }
        
        localStorage.setItem('userActivities', JSON.stringify(activities));
    }

    initIdleDetection() {
        let idleTime = 0;
        const idleThreshold = 30 * 60 * 1000; // 30分鐘
        
        const resetIdleTime = () => { idleTime = 0; };
        
        // 監聽用戶活動
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetIdleTime, true);
        });
        
        // 每分鐘檢查一次閒置狀態
        setInterval(() => {
            idleTime += 60000;
            
            if (idleTime >= idleThreshold) {
                this.handleIdleTimeout();
            }
        }, 60000);
    }

    handleIdleTimeout() {
        if (confirm('您已閒置超過30分鐘，是否要繼續使用？')) {
            // 用戶選擇繼續，重置閒置計時
            return;
        } else {
            // 用戶選擇登出或無回應
            this.logout();
        }
    }

    exportToPdf() {
        if (!this.currentStatsData) {
            this.showMessage('請先產生統計資料', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        try {
            // 設定字體和標題 (避免中文)
            doc.setFont('helvetica');
            doc.setFontSize(16);
            doc.text('IT Work Log Statistics Report', 20, 20);
            
            doc.setFontSize(12);
            doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 20, 35);
            
            // 處理統計類型標題，將中文轉換為英文
            const typeMapping = {
                'status': 'Status Distribution',
                'category': 'Problem Category',
                'department': 'Department Distribution', 
                'resolver': 'Resolver Statistics',
                'monthly': 'Monthly Statistics'
            };
            const typeTitle = typeMapping[this.currentStatsData.type] || this.currentStatsData.type;
            doc.text(`Type: ${typeTitle}`, 20, 45);
            
            // 如果有部門篩選，顯示篩選條件
            const departmentFilter = this.currentStatsData.departmentFilter;
            if (departmentFilter) {
                doc.text(`Department Filter: ${this.convertChineseToEnglish(departmentFilter)}`, 20, 55);
            }

            let yPosition = departmentFilter ? 70 : 60;
            
            // 表格標題
            doc.setFont('helvetica', 'bold');
            doc.text('Item', 20, yPosition);
            doc.text('Count', 80, yPosition);
            doc.text('Percentage', 140, yPosition);
            
            // 表格內容
            doc.setFont('helvetica', 'normal');
            yPosition += 10;
            this.currentStatsData.data.details.forEach(item => {
                // 將中文內容轉換為英文或拼音
                const itemName = this.convertChineseToEnglish(item.category);
                doc.text(itemName, 20, yPosition);
                doc.text(item.count.toString(), 80, yPosition);
                doc.text(item.percentage + '%', 140, yPosition);
                yPosition += 10;
            });

            // 添加圖表到PDF (如果有圖表的話)
            if (this.currentChart && yPosition < 200) { // 確保有足夠的空間
                try {
                    // 獲取圖表的canvas元素
                    const canvas = document.getElementById('statsChart');
                    if (canvas) {
                        const chartImage = canvas.toDataURL('image/png');
                        
                        // 在PDF中添加圖表圖片
                        yPosition += 10; // 增加一些間距
                        doc.text('Chart:', 20, yPosition);
                        yPosition += 10;
                        
                        // 計算圖片大小 (保持比例，適合頁面寬度)
                        const imgWidth = 150;
                        const imgHeight = 100;
                        
                        doc.addImage(chartImage, 'PNG', 20, yPosition, imgWidth, imgHeight);
                    }
                } catch (error) {
                    console.warn('無法添加圖表到PDF:', error);
                }
            }

            // 生成文件名
            const fileName = departmentFilter 
                ? `Stats_Report_${this.convertChineseToEnglish(departmentFilter)}_${new Date().toISOString().split('T')[0]}.pdf`
                : `Stats_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            
            doc.save(fileName);
            this.showMessage('PDF 報表已下載', 'success');
            
        } catch (error) {
            console.error('PDF export error:', error);
            this.showMessage('PDF 匯出失敗：' + error.message, 'error');
        }
    }

    convertChineseToEnglish(text) {
        if (!text) return '';
        
        // 常用中文翻譯對照表
        const translations = {
            // 狀態
            '處理中': 'Processing',
            '已處理': 'Completed', 
            '無法處理': 'Cannot Process',
            '已提出需求': 'Request Submitted',
            
            // 問題類別
            '硬體': 'Hardware',
            '軟體': 'Software',
            '網路': 'Network',
            '周邊': 'Peripheral',
            '其他': 'Others',
            
            // 常用單位
            'IT部門': 'IT Department',
            '資訊室': 'IT Office',
            '人事室': 'HR Office',
            '會計室': 'Accounting Office',
            '總務處': 'General Affairs',
            '學務處': 'Student Affairs',
            '教務處': 'Academic Affairs',
            '圖書館': 'Library',
            '秘書室': 'Secretary Office',
            '研發部': 'R&D Department',
            '業務部': 'Sales Department',
            '財務部': 'Finance Department',
            '企劃部': 'Planning Department',
            '行銷部': 'Marketing Department',
            '客服部': 'Customer Service',
            '法務部': 'Legal Department',
            '機房': 'Data Center',
            '會議室': 'Meeting Room',
            
            // 常見人名和職稱
            '李工程師': 'Engineer Li',
            '王技術員': 'Technician Wang',
            '陳技術員': 'Technician Chen',
            '李網管': 'Network Admin Li',
            '陳工程師': 'Engineer Chen',
            '資深工程師': 'Senior Engineer',
            '系統管理員': 'System Administrator',
            '網管人員': 'Network Administrator',
            '技術員': 'Technician',
            '工程師': 'Engineer',
            '主管': 'Supervisor',
            '專員': 'Specialist',
            
            // 月份
            '一月': 'January', '二月': 'February', '三月': 'March', '四月': 'April',
            '五月': 'May', '六月': 'June', '七月': 'July', '八月': 'August',
            '九月': 'September', '十月': 'October', '十一月': 'November', '十二月': 'December'
        };
        
        // 如果有直接對應的翻譯，返回翻譯
        if (translations[text]) {
            return translations[text];
        }
        
        // 檢查是否包含已知翻譯
        for (const [chinese, english] of Object.entries(translations)) {
            if (text.includes(chinese)) {
                return text.replace(chinese, english);
            }
        }
        
        // 如果沒有翻譯，使用拼音或保持原文（避免亂碼）
        return this.chineseToPinyin(text);
    }
    
    chineseToPinyin(text) {
        // 簡單的中文字符替換為拼音或代號
        const pinyinMap = {
            // 基本字符
            '資': 'Zi', '訊': 'Xun', '室': 'Shi', '處': 'Chu', '館': 'Guan',
            '人': 'Ren', '事': 'Shi', '會': 'Hui', '計': 'Ji', '總': 'Zong',
            '務': 'Wu', '學': 'Xue', '教': 'Jiao', '圖': 'Tu', '書': 'Shu',
            '秘': 'Mi', '樓': 'Lou', '月': 'Month', '部': 'Dept', '門': 'Men',
            
            // 數字
            '一': '1st', '二': '2nd', '三': '3rd', '四': '4th', '五': '5th',
            '六': '6th', '七': '7th', '八': '8th', '九': '9th', '十': '10th',
            
            // 常見姓氏
            '王': 'Wang', '李': 'Li', '張': 'Zhang', '劉': 'Liu', '陳': 'Chen',
            '楊': 'Yang', '趙': 'Zhao', '黃': 'Huang', '周': 'Zhou', '吳': 'Wu',
            '徐': 'Xu', '孫': 'Sun', '胡': 'Hu', '朱': 'Zhu', '高': 'Gao',
            '林': 'Lin', '何': 'He', '郭': 'Guo', '馬': 'Ma', '羅': 'Luo',
            
            // 職稱相關
            '工': 'Gong', '程': 'Cheng', '師': 'Shi', '技': 'Ji', '術': 'Shu',
            '員': 'Yuan', '管': 'Guan', '理': 'Li', '主': 'Zhu', '任': 'Ren',
            
            // 其他常用字
            '網': 'Wang', '硬': 'Ying', '軟': 'Ruan', '體': 'Ti', '電': 'Dian',
            '腦': 'Nao', '印': 'Yin', '表': 'Biao', '機': 'Ji', '器': 'Qi',
            '問': 'Wen', '題': 'Ti', '故': 'Gu', '障': 'Zhang', '修': 'Xiu',
            '復': 'Fu', '更': 'Geng', '換': 'Huan', '清': 'Qing', '潔': 'Jie'
        };
        
        let result = '';
        for (let char of text) {
            if (pinyinMap[char]) {
                result += pinyinMap[char];
            } else if (char.match(/[a-zA-Z0-9\s\-_.,()]/)) {
                // 保留英文、數字、空格和常用符號
                result += char;
            } else {
                // 其他字符用代碼表示
                result += `[${char.charCodeAt(0).toString(16)}]`;
            }
        }
        return result;
    }

    exportToPpt() {
        if (!this.currentStatsData) {
            this.showMessage('請先產生統計資料', 'error');
            return;
        }

        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();

        // 標題 (包含部門篩選資訊)
        const departmentInfo = this.currentStatsData.departmentFilter 
            ? ` (${this.currentStatsData.departmentFilter})`
            : '';
        slide.addText(`資訊組工作日誌 - 統計報表${departmentInfo}`, {
            x: 1, y: 0.5, w: 8, h: 1,
            fontSize: 24, bold: true, color: '2c3e50'
        });

        // 統計類型
        slide.addText(`統計類型: ${this.getChartTitle(this.currentStatsData.type, this.currentStatsData.departmentFilter)}`, {
            x: 1, y: 1.5, w: 8, h: 0.5,
            fontSize: 16
        });

        // 如果有部門篩選，加入篩選資訊
        let yPos = 2;
        if (this.currentStatsData.departmentFilter) {
            slide.addText(`篩選單位: ${this.currentStatsData.departmentFilter}`, {
                x: 1, y: yPos, w: 8, h: 0.5,
                fontSize: 14, color: '666666'
            });
            yPos += 0.5;
        }

        // 產生時間
        slide.addText(`產生時間: ${new Date().toLocaleString('zh-TW')}`, {
            x: 1, y: yPos, w: 8, h: 0.5,
            fontSize: 12, color: '666666'
        });

        // 統計表格
        const tableData = [['項目', '數量', '百分比']];
        this.currentStatsData.data.details.forEach(item => {
            tableData.push([item.category, item.count.toString(), item.percentage + '%']);
        });

        slide.addTable(tableData, {
            x: 1, y: 3, w: 8, h: 4,
            fontSize: 12,
            border: { pt: 1, color: 'CFCFCF' }
        });

        // 生成文件名，包含部門篩選資訊
        const fileName = this.currentStatsData.departmentFilter 
            ? `統計報表_${this.currentStatsData.departmentFilter}_${new Date().toISOString().split('T')[0]}.pptx`
            : `統計報表_${new Date().toISOString().split('T')[0]}.pptx`;
            
        pptx.writeFile(fileName);
        this.showMessage('PowerPoint 報表已下載', 'success');
    }

    saveReport() {
        if (!this.currentStatsData) {
            this.showMessage('請先產生統計資料', 'error');
            return;
        }

        const reportData = {
            timestamp: new Date().toISOString(),
            type: this.currentStatsData.type,
            chartType: this.currentStatsData.chartType,
            dateRange: this.currentStatsData.dateRange,
            data: this.currentStatsData.data,
            totalRecords: this.currentStatsData.filteredData.length
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `統計報表_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('報表已儲存', 'success');
    }

    // ========== 使用者管理功能 ==========
    initUserManagement() {
        const userManageBtn = document.getElementById('userManageBtn');
        const userManageModal = document.getElementById('userManageModal');
        const userManageModalClose = document.getElementById('userManageModalClose');
        const userFormModal = document.getElementById('userFormModal');
        const userFormModalClose = document.getElementById('userFormModalClose');
        const addUserBtn = document.getElementById('addUserBtn');
        const userForm = document.getElementById('userForm');
        const userFormCancel = document.getElementById('userFormCancel');
        const userSearchBtn = document.getElementById('userSearchBtn');
        const userPrevBtn = document.getElementById('userPrevBtn');
        const userNextBtn = document.getElementById('userNextBtn');

        // 事件綁定
        userManageBtn?.addEventListener('click', () => {
            userManageModal.style.display = 'block';
            this.loadUsers();
        });

        userManageModalClose?.addEventListener('click', () => {
            userManageModal.style.display = 'none';
        });

        userFormModalClose?.addEventListener('click', () => {
            userFormModal.style.display = 'none';
        });

        addUserBtn?.addEventListener('click', () => {
            this.showUserForm();
        });

        userForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });

        userFormCancel?.addEventListener('click', () => {
            userFormModal.style.display = 'none';
        });

        userSearchBtn?.addEventListener('click', () => {
            this.userCurrentPage = 1;
            this.loadUsers();
        });

        userPrevBtn?.addEventListener('click', () => {
            if (this.userCurrentPage > 1) {
                this.userCurrentPage--;
                this.loadUsers();
            }
        });

        userNextBtn?.addEventListener('click', () => {
            this.userCurrentPage++;
            this.loadUsers();
        });

        // 角色變更事件
        document.getElementById('userRole')?.addEventListener('change', (e) => {
            this.updatePermissionsByRole(e.target.value);
        });

        // 關閉模態框
        window.addEventListener('click', (e) => {
            if (e.target === userManageModal) {
                userManageModal.style.display = 'none';
            }
            if (e.target === userFormModal) {
                userFormModal.style.display = 'none';
            }
        });
    }

    async loadUsers(page = null) {
        if (page) this.userCurrentPage = page;

        try {
            const searchParams = new URLSearchParams({
                page: this.userCurrentPage,
                limit: this.userItemsPerPage,
                search: document.getElementById('userSearchInput')?.value || ''
            });

            const response = await this.makeAuthenticatedRequest(`/api/users?${searchParams}`);
            if (!response) return;

            const data = await response.json();
            this.renderUsersTable(data.data);
            this.updateUserPagination(data.page, data.totalPages, data.total);
        } catch (error) {
            console.error('載入使用者失敗:', error);
            this.showMessage('載入使用者失敗', 'error');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>${user.email || '-'}</td>
                <td>${user.department}</td>
                <td><span class="role-badge role-${user.role}">${this.getRoleDisplayName(user.role)}</span></td>
                <td><span class="status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? '啟用' : '停用'}</span></td>
                <td>${this.formatDateTime(user.created_date)}</td>
                <td class="user-actions">
                    <button class="btn-small btn-edit-small" onclick="workLogManager.editUser(${user.id})">編輯</button>
                    <button class="btn-small btn-reset-pwd" onclick="workLogManager.resetUserPassword(${user.id})">重設密碼</button>
                    <button class="btn-small btn-toggle-status ${user.is_active ? 'deactivate' : 'activate'}" 
                            onclick="workLogManager.toggleUserStatus(${user.id}, ${!user.is_active})">${user.is_active ? '停用' : '啟用'}</button>
                    ${user.id !== this.currentUser.id ? `<button class="btn-small btn-delete-small" onclick="workLogManager.deleteUser(${user.id})">刪除</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateUserPagination(page, totalPages, total) {
        document.getElementById('userPageInfo').textContent = `第 ${page} 頁 / 共 ${totalPages} 頁 (總計 ${total} 筆)`;
        document.getElementById('userPrevBtn').disabled = page === 1;
        document.getElementById('userNextBtn').disabled = page === totalPages;
    }

    showUserForm(userId = null) {
        this.currentEditUserId = userId;
        const modal = document.getElementById('userFormModal');
        const title = document.getElementById('userFormTitle');
        const passwordGroup = document.getElementById('passwordGroup');
        const form = document.getElementById('userForm');

        if (userId) {
            title.textContent = '編輯使用者';
            passwordGroup.style.display = 'none';
            document.getElementById('userPassword').required = false;
            this.loadUserData(userId);
        } else {
            title.textContent = '新增使用者';
            passwordGroup.style.display = 'block';
            document.getElementById('userPassword').required = true;
            form.reset();
            this.updatePermissionsByRole('user'); // 預設一般使用者
        }

        // 載入單位選項
        this.loadDepartmentOptions();
        modal.style.display = 'block';
    }

    loadDepartmentOptions() {
        const select = document.getElementById('userDepartment');
        select.innerHTML = '<option value="">請選擇單位</option>';
        
        this.departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    }

    async loadUserData(userId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/users`);
            if (!response) return;

            const data = await response.json();
            const user = data.data.find(u => u.id === userId);
            if (!user) return;

            document.getElementById('userUsername').value = user.username;
            document.getElementById('userFullName').value = user.full_name;
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userDepartment').value = user.department;
            document.getElementById('userRole').value = user.role;

            // 設置權限
            this.setPermissions(user.permissions);
        } catch (error) {
            console.error('載入使用者資料錯誤:', error);
            this.showMessage('載入使用者資料失敗', 'error');
        }
    }

    updatePermissionsByRole(role) {
        const permissions = this.getDefaultPermissionsByRole(role);
        this.setPermissions(permissions);
    }

    getDefaultPermissionsByRole(role) {
        const rolePermissions = {
            'viewer': ['read'],
            'user': ['read', 'create', 'update'],
            'manager': ['read', 'create', 'update', 'delete', 'view_stats', 'export_data'],
            'admin': ['read', 'create', 'update', 'delete', 'view_stats', 'export_data', 'manage_users']
        };
        return rolePermissions[role] || ['read'];
    }

    setPermissions(permissions) {
        const checkboxes = document.querySelectorAll('.permissions-grid input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.value === 'read') {
                checkbox.checked = true; // 讀取權限永遠為真
            } else {
                checkbox.checked = permissions.includes(checkbox.value);
            }
        });
    }

    getSelectedPermissions() {
        const checkboxes = document.querySelectorAll('.permissions-grid input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    async handleUserFormSubmit() {
        const username = document.getElementById('userUsername').value.trim();
        const password = document.getElementById('userPassword').value;
        const fullName = document.getElementById('userFullName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const department = document.getElementById('userDepartment').value;
        const role = document.getElementById('userRole').value;
        const permissions = this.getSelectedPermissions();

        if (!username || !fullName || !department) {
            this.showMessage('請填寫必填欄位', 'error');
            return;
        }

        if (!this.currentEditUserId && !password) {
            this.showMessage('新增使用者時密碼為必填', 'error');
            return;
        }

        try {
            const userData = {
                full_name: fullName,
                email: email || null,
                department,
                role,
                permissions
            };

            let response;
            if (this.currentEditUserId) {
                // 編輯模式
                response = await this.makeAuthenticatedRequest(`/api/users/${this.currentEditUserId}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
            } else {
                // 新增模式
                userData.username = username;
                userData.password = password;
                response = await this.makeAuthenticatedRequest('/api/users', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });
            }

            if (!response) return;

            const result = await response.json();
            if (response.ok) {
                this.showMessage(result.message, 'success');
                document.getElementById('userFormModal').style.display = 'none';
                this.loadUsers();
            } else {
                this.showMessage(result.error || '操作失敗', 'error');
            }
        } catch (error) {
            console.error('使用者操作錯誤:', error);
            this.showMessage('操作失敗', 'error');
        }
    }

    editUser(userId) {
        this.showUserForm(userId);
    }

    async resetUserPassword(userId) {
        const newPassword = prompt('請輸入新密碼:');
        if (!newPassword) return;

        if (newPassword.length < 6) {
            this.showMessage('密碼長度至少6個字元', 'error');
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest(`/api/users/${userId}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ password: newPassword })
            });

            if (!response) return;

            const result = await response.json();
            if (response.ok) {
                this.showMessage('密碼重設成功', 'success');
            } else {
                this.showMessage(result.error || '密碼重設失敗', 'error');
            }
        } catch (error) {
            console.error('密碼重設錯誤:', error);
            this.showMessage('密碼重設失敗', 'error');
        }
    }

    async toggleUserStatus(userId, newStatus) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: newStatus ? 1 : 0 })
            });

            if (!response) return;

            const result = await response.json();
            if (response.ok) {
                this.showMessage(`使用者已${newStatus ? '啟用' : '停用'}`, 'success');
                this.loadUsers();
            } else {
                this.showMessage(result.error || '操作失敗', 'error');
            }
        } catch (error) {
            console.error('切換使用者狀態錯誤:', error);
            this.showMessage('操作失敗', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('確定要刪除此使用者嗎？此操作無法復原。')) {
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response) return;

            const result = await response.json();
            if (response.ok) {
                this.showMessage('使用者已刪除', 'success');
                this.loadUsers();
            } else {
                this.showMessage(result.error || '刪除失敗', 'error');
            }
        } catch (error) {
            console.error('刪除使用者錯誤:', error);
            this.showMessage('刪除失敗', 'error');
        }
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'admin': '管理員',
            'manager': '主管',
            'user': '一般使用者',
            'viewer': '僅觀看'
        };
        return roleNames[role] || role;
    }

    async showChartDetails(label, value, statsType, elementIndex) {
        try {
            // 獲取當前統計的完整數據
            const filteredData = this.currentStatsData.filteredData;
            
            // 根據統計類型篩選相關的詳細記錄
            let detailRecords = [];
            
            switch(statsType) {
                case 'status':
                    detailRecords = filteredData.filter(log => log.status === label);
                    break;
                case 'category':
                    detailRecords = filteredData.filter(log => log.category === label);
                    break;
                case 'department':
                    detailRecords = filteredData.filter(log => log.department === label);
                    break;
                case 'resolver':
                    detailRecords = filteredData.filter(log => (log.resolver || '未指派') === label);
                    break;
                case 'monthly':
                    // 月份統計需要特殊處理
                    const monthMatch = label.match(/(\d+)月/);
                    if (monthMatch) {
                        const month = parseInt(monthMatch[1]) - 1; // JavaScript月份從0開始
                        detailRecords = filteredData.filter(log => {
                            const logDate = new Date(log.created_at);
                            return logDate.getMonth() === month;
                        });
                    }
                    break;
                default:
                    detailRecords = filteredData.filter(log => log[statsType] === label);
            }

            // 儲存完整詳細記錄供匯出使用
            this.currentDetailsData = {
                label: label,
                value: value,
                statsType: statsType,
                allRecords: detailRecords,
                topRecords: detailRecords.slice(0, 10)
            };

            // 顯示詳細信息彈窗
            this.renderDetailsModal(label, value, detailRecords.slice(0, 10), detailRecords.length);

        } catch (error) {
            console.error('顯示圖表詳細信息錯誤:', error);
            this.showMessage('無法載入詳細信息', 'error');
        }
    }

    renderDetailsModal(label, value, topRecords, totalCount) {
        // 創建或更新詳細信息彈窗
        let detailModal = document.getElementById('chartDetailModal');
        
        if (!detailModal) {
            detailModal = document.createElement('div');
            detailModal.id = 'chartDetailModal';
            detailModal.className = 'modal';
            document.body.appendChild(detailModal);
        }

        const hasMoreRecords = totalCount > 10;
        
        detailModal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <span class="close" onclick="document.getElementById('chartDetailModal').style.display='none'">&times;</span>
                <h3>📊 ${label} - 詳細資料</h3>
                <div class="detail-summary">
                    <p><strong>總數量：</strong>${value} 筆</p>
                    ${hasMoreRecords ? `<p><strong>顯示：</strong>前 10 筆（共 ${totalCount} 筆）</p>` : ''}
                </div>
                
                <div class="detail-table-container">
                    <table class="detail-table" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background-color: #f5f5f5;">
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">工單編號</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">問題描述</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">部門</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">狀態</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">建立日期</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topRecords.map(record => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${record.serial_number || record.id}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${record.current_status}">${record.current_status}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${record.department}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        <span class="status-badge status-${record.status}">${record.status}</span>
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${new Date(record.created_at).toLocaleDateString('zh-TW')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${hasMoreRecords ? `
                    <div class="detail-actions" style="margin-top: 20px; text-align: center;">
                        <p style="color: #666;">更多資料可透過匯出功能查看完整清單</p>
                        <button onclick="workLogManager.exportDetailsToExcel()" class="btn-primary" style="margin: 5px;">📊 匯出完整清單至 Excel</button>
                        <button onclick="workLogManager.exportDetailsToCsv()" class="btn-secondary" style="margin: 5px;">📋 匯出完整清單至 CSV</button>
                    </div>
                ` : ''}
                
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="document.getElementById('chartDetailModal').style.display='none'" class="btn-secondary">關閉</button>
                </div>
            </div>
        `;

        // 顯示彈窗
        detailModal.style.display = 'block';

        // 點擊外部關閉彈窗
        detailModal.onclick = function(event) {
            if (event.target === detailModal) {
                detailModal.style.display = 'none';
            }
        };
    }

    exportDetailsToExcel() {
        if (!this.currentDetailsData) {
            this.showMessage('沒有可匯出的詳細資料', 'warning');
            return;
        }

        const { label, allRecords, statsType } = this.currentDetailsData;
        
        // 準備 Excel 資料
        const worksheetData = [
            [`${label} - 詳細清單`, '', '', '', ''],
            [`統計類型: ${this.getStatsTypeDisplayName(statsType)}`, '', '', '', ''],
            [`總數量: ${allRecords.length} 筆`, '', '', '', ''],
            ['', '', '', '', ''],
            ['工單編號', '問題描述', '改善後狀況', '問題類別', '部門', '通報人', '改善者', '狀態', '建立日期', '更新日期']
        ];

        allRecords.forEach(record => {
            worksheetData.push([
                record.serial_number || record.id,
                record.current_status || '',
                record.improved_status || '',
                record.category || '',
                record.department || '',
                record.reporter || '',
                record.resolver || '',
                record.status || '',
                record.created_at ? new Date(record.created_at).toLocaleDateString('zh-TW') : '',
                record.updated_at ? new Date(record.updated_at).toLocaleDateString('zh-TW') : ''
            ]);
        });

        // 使用 XLSX 庫創建 Excel 檔案
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // 設置欄寬
        ws['!cols'] = [
            { wch: 15 }, // 工單編號
            { wch: 30 }, // 問題描述
            { wch: 30 }, // 改善後狀況
            { wch: 10 }, // 問題類別
            { wch: 12 }, // 部門
            { wch: 10 }, // 通報人
            { wch: 10 }, // 改善者
            { wch: 8 },  // 狀態
            { wch: 12 }, // 建立日期
            { wch: 12 }  // 更新日期
        ];

        XLSX.utils.book_append_sheet(wb, ws, '詳細清單');
        
        // 下載檔案
        const fileName = `${label}_詳細清單_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        this.showMessage(`已匯出 ${allRecords.length} 筆詳細資料`, 'success');
    }

    exportDetailsToCsv() {
        if (!this.currentDetailsData) {
            this.showMessage('沒有可匯出的詳細資料', 'warning');
            return;
        }

        const { label, allRecords } = this.currentDetailsData;
        
        // 準備 CSV 標頭
        const headers = [
            '工單編號', '問題描述', '改善後狀況', '問題類別', 
            '部門', '通報人', '改善者', '狀態', '建立日期', '更新日期'
        ];

        // 準備 CSV 內容
        const csvContent = [
            headers.join(','),
            ...allRecords.map(record => [
                `"${record.serial_number || record.id}"`,
                `"${(record.current_status || '').replace(/"/g, '""')}"`,
                `"${(record.improved_status || '').replace(/"/g, '""')}"`,
                `"${record.category || ''}"`,
                `"${record.department || ''}"`,
                `"${record.reporter || ''}"`,
                `"${record.resolver || ''}"`,
                `"${record.status || ''}"`,
                `"${record.created_at ? new Date(record.created_at).toLocaleDateString('zh-TW') : ''}"`,
                `"${record.updated_at ? new Date(record.updated_at).toLocaleDateString('zh-TW') : ''}"`
            ].join(','))
        ].join('\n');

        // 添加 BOM 以確保中文正確顯示
        const csvWithBom = '\ufeff' + csvContent;
        
        // 創建並下載檔案
        const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${label}_詳細清單_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage(`已匯出 ${allRecords.length} 筆詳細資料`, 'success');
    }

    getStatsTypeDisplayName(statsType) {
        const displayNames = {
            'status': '狀態分佈',
            'category': '問題類別',
            'department': '單位分佈', 
            'resolver': '改善者統計',
            'monthly': '月份統計'
        };
        return displayNames[statsType] || statsType;
    }

    // ========== 照片上傳功能 ==========
    initPhotoUpload() {
        // 照片上傳功能由編輯和檢視按鈕的onclick直接呼叫
        // 不需要額外的事件綁定
    }

    async showViewModal(log, logId) {
        // 創建檢視模態框
        let viewModal = document.getElementById('viewModal');
        if (viewModal) {
            viewModal.remove();
        }

        viewModal = document.createElement('div');
        viewModal.id = 'viewModal';
        viewModal.className = 'modal';
        viewModal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>檢視工單詳細資料</h3>
                    <span class="close" id="viewModalClose">&times;</span>
                </div>
                <div class="view-content">
                    <div class="log-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>工單編號：</label>
                                <span>${log.serial_number}</span>
                            </div>
                            <div class="detail-item">
                                <label>建立日期：</label>
                                <span>${this.formatDate(log.created_date)}</span>
                            </div>
                            <div class="detail-item">
                                <label>問題描述：</label>
                                <span>${log.current_status}</span>
                            </div>
                            <div class="detail-item">
                                <label>改善後狀況：</label>
                                <span>${log.improved_status || '未填寫'}</span>
                            </div>
                            <div class="detail-item">
                                <label>問題類別：</label>
                                <span>${log.problem_category}</span>
                            </div>
                            <div class="detail-item">
                                <label>部門：</label>
                                <span>${log.department}</span>
                            </div>
                            <div class="detail-item">
                                <label>分機：</label>
                                <span>${log.extension || '無'}</span>
                            </div>
                            <div class="detail-item">
                                <label>通報人：</label>
                                <span>${log.reporter}</span>
                            </div>
                            <div class="detail-item">
                                <label>改善者：</label>
                                <span>${log.resolver || '未指派'}</span>
                            </div>
                            <div class="detail-item">
                                <label>狀態：</label>
                                <span class="status-${this.getStatusClass(log.status)}">${log.status}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>備註：</label>
                                <span>${log.notes || '無備註'}</span>
                            </div>
                        </div>
                    </div>
                    <div id="viewPhotoSection" class="photo-view-section">
                        <h3>相關照片</h3>
                        <div id="viewPhotosContent">
                            <p style="text-align: center; color: #999;">載入中...</p>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="editFromView" class="btn primary">編輯</button>
                    <button id="viewModalCancel" class="btn">關閉</button>
                </div>
            </div>
        `;

        document.body.appendChild(viewModal);
        viewModal.style.display = 'block';

        // 綁定事件
        document.getElementById('viewModalClose').addEventListener('click', () => {
            viewModal.style.display = 'none';
            viewModal.remove();
        });

        document.getElementById('viewModalCancel').addEventListener('click', () => {
            viewModal.style.display = 'none';
            viewModal.remove();
        });

        document.getElementById('editFromView').addEventListener('click', () => {
            viewModal.style.display = 'none';
            viewModal.remove();
            this.showEditModalWithPhotos(logId, log);
        });

        // 點擊外部關閉
        viewModal.addEventListener('click', (e) => {
            if (e.target === viewModal) {
                viewModal.style.display = 'none';
                viewModal.remove();
            }
        });

        // 載入照片
        await this.loadPhotosForView(logId);
    }

    async showEditModalWithPhotos(logId, log = null) {
        try {
            // 如果沒有提供log資料，載入它
            if (!log) {
                const response = await this.makeAuthenticatedRequest(`/api/logs/${logId}`);
                if (!response.ok) throw new Error('載入工單資料失敗');
                log = await response.json();
            }

            // 顯示編輯表單
            this.showModal(log);

            // 只在編輯現有記錄時添加照片區域
            if (logId && logId !== 'new') {
                // 在表單中添加照片區域
                this.addPhotoSectionToModal(logId);

                // 載入現有照片
                await this.loadExistingPhotos(logId);
            }

        } catch (error) {
            console.error('載入編輯表單錯誤:', error);
            this.showMessage('載入編輯表單失敗', 'error');
        }
    }

    addPhotoSectionToModal(logId) {
        const form = document.getElementById('logForm');
        let photoSection = document.getElementById('photoSection');
        
        if (photoSection) {
            photoSection.remove();
        }

        photoSection = document.createElement('div');
        photoSection.id = 'photoSection';
        
        // 根據是否為新增模式顯示不同的提示
        const isNewRecord = logId === 'new';
        const uploadNote = isNewRecord ? 
            '<p class="upload-note"><i class="fas fa-info-circle"></i> 請先儲存記錄後才能上傳照片</p>' : 
            '';
        
        photoSection.innerHTML = `
            <div class="form-section">
                <h3>照片管理</h3>
                ${uploadNote}
                
                <!-- 現況照片 -->
                <div class="photo-category">
                    <h4>現況照片 (最多10張)</h4>
                    <div class="photo-upload-area" data-type="before">
                        <div class="drop-zone ${isNewRecord ? 'disabled' : ''}" id="beforeDropZone">
                            <div class="drop-zone-content">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>${isNewRecord ? '請先儲存記錄後上傳照片' : '拖放照片到這裡，或點擊選擇檔案'}</p>
                                <input type="file" id="beforePhotos" accept="image/*" multiple ${isNewRecord ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="photo-preview-grid" id="beforePhotoGrid"></div>
                    </div>
                </div>

                <!-- 改善後照片 -->
                <div class="photo-category">
                    <h4>改善後照片 (最多10張)</h4>
                    <div class="photo-upload-area" data-type="after">
                        <div class="drop-zone ${isNewRecord ? 'disabled' : ''}" id="afterDropZone">
                            <div class="drop-zone-content">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>${isNewRecord ? '請先儲存記錄後上傳照片' : '拖放照片到這裡，或點擊選擇檔案'}</p>
                                <input type="file" id="afterPhotos" accept="image/*" multiple ${isNewRecord ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="photo-preview-grid" id="afterPhotoGrid"></div>
                    </div>
                </div>
            </div>
        `;

        // 在表單最後插入照片區域
        form.appendChild(photoSection);

        // 只在編輯模式下綁定照片上傳事件
        if (!isNewRecord) {
            this.bindPhotoUploadEvents(logId);
        }
    }

    bindPhotoUploadEvents(logId) {
        // 文件選擇事件
        document.getElementById('beforePhotos').addEventListener('change', (e) => {
            this.handleFileSelect(e, 'before', logId);
        });

        document.getElementById('afterPhotos').addEventListener('change', (e) => {
            this.handleFileSelect(e, 'after', logId);
        });

        // 拖拽事件
        this.initDragAndDrop('beforeDropZone', 'before', logId);
        this.initDragAndDrop('afterDropZone', 'after', logId);

        // 點擊上傳區域選擇文件
        document.getElementById('beforeDropZone').addEventListener('click', () => {
            document.getElementById('beforePhotos').click();
        });

        document.getElementById('afterDropZone').addEventListener('click', () => {
            document.getElementById('afterPhotos').click();
        });
    }

    initDragAndDrop(dropZoneId, photoType, logId) {
        const dropZone = document.getElementById(dropZoneId);

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            this.handleFileSelect({ target: { files } }, photoType, logId);
        });
    }

    async handleFileSelect(event, photoType, logId) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // 檢查檔案數量限制
        const existingPhotos = document.querySelectorAll(`#${photoType}PhotoGrid .photo-item`);
        if (existingPhotos.length + files.length > 10) {
            this.showMessage(`每個類別最多只能上傳10張照片`, 'warning');
            return;
        }

        // 驗證檔案類型和大小
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                this.showMessage(`檔案 ${file.name} 不是有效的圖片格式`, 'warning');
                return false;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                this.showMessage(`檔案 ${file.name} 超過5MB大小限制`, 'warning');
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // 上傳檔案
        const formData = new FormData();
        validFiles.forEach(file => {
            formData.append('photos', file);
        });
        formData.append('photo_type', photoType);

        try {
            this.showMessage('正在上傳照片...', 'info');
            
            const response = await fetch(`/api/logs/${logId}/photos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('上傳失敗');
            }

            const result = await response.json();
            this.showMessage(`成功上傳 ${validFiles.length} 張照片`, 'success');

            // 重新載入照片預覽
            await this.loadExistingPhotos(logId);

        } catch (error) {
            console.error('照片上傳錯誤:', error);
            this.showMessage('照片上傳失敗', 'error');
        }
    }

    async loadExistingPhotos(logId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/logs/${logId}/photos`);
            if (!response.ok) return;

            const photos = await response.json();
            
            // 按照類型分組
            const beforePhotos = photos.filter(p => p.photo_type === 'before');
            const afterPhotos = photos.filter(p => p.photo_type === 'after');

            // 更新預覽區域
            this.updatePhotoGrid('beforePhotoGrid', beforePhotos);
            this.updatePhotoGrid('afterPhotoGrid', afterPhotos);

        } catch (error) {
            console.error('載入照片錯誤:', error);
        }
    }

    updatePhotoGrid(gridId, photos) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        grid.innerHTML = '';

        photos.forEach(photo => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <div class="photo-thumbnail" data-photo-id="${photo.id}">
                    <img src="${photo.thumbnail_path || photo.file_path}" alt="照片縮圖">
                    <div class="photo-overlay">
                        <button type="button" class="btn-photo-view" data-photo-path="${photo.file_path}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn-photo-delete" data-photo-id="${photo.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="photo-info">
                        <span class="photo-name">${photo.original_name || photo.file_name}</span>
                    </div>
                </div>
            `;

            grid.appendChild(photoItem);
        });

        // 綁定照片操作事件
        this.bindPhotoItemEvents(grid);
    }

    bindPhotoItemEvents(grid) {
        // 查看照片
        grid.querySelectorAll('.btn-photo-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoPath = e.target.closest('.btn-photo-view').dataset.photoPath;
                this.showPhotoModal(photoPath);
            });
        });

        // 刪除照片
        grid.querySelectorAll('.btn-photo-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const photoId = e.target.closest('.btn-photo-delete').dataset.photoId;
                
                if (confirm('確定要刪除這張照片嗎？')) {
                    await this.deletePhoto(photoId);
                }
            });
        });
    }

    showPhotoModal(photoPath) {
        // 創建照片查看模態框
        let photoModal = document.getElementById('photoModal');
        if (!photoModal) {
            photoModal = document.createElement('div');
            photoModal.id = 'photoModal';
            photoModal.className = 'modal photo-modal';
            photoModal.innerHTML = `
                <div class="modal-content photo-modal-content">
                    <span class="close" id="photoModalClose">&times;</span>
                    <img id="photoModalImg" src="" alt="照片預覽">
                </div>
            `;
            document.body.appendChild(photoModal);

            // 綁定關閉事件
            document.getElementById('photoModalClose').addEventListener('click', () => {
                photoModal.style.display = 'none';
            });

            photoModal.addEventListener('click', (e) => {
                if (e.target === photoModal) {
                    photoModal.style.display = 'none';
                }
            });
        }

        document.getElementById('photoModalImg').src = photoPath;
        photoModal.style.display = 'block';
    }

    async deletePhoto(photoId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/photos/${photoId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('刪除失敗');
            }

            this.showMessage('照片已刪除', 'success');
            
            // 移除照片元素
            const photoElement = document.querySelector(`[data-photo-id="${photoId}"]`);
            if (photoElement) {
                photoElement.closest('.photo-item').remove();
            }

        } catch (error) {
            console.error('刪除照片錯誤:', error);
            this.showMessage('刪除照片失敗', 'error');
        }
    }

    async loadPhotosForView(logId) {
        try {
            const response = await this.makeAuthenticatedRequest(`/api/logs/${logId}/photos`);
            if (!response.ok) {
                document.getElementById('viewPhotosContent').innerHTML = '<p style="text-align: center; color: #999;">無法載入照片</p>';
                return;
            }

            const photos = await response.json();
            
            if (photos.length === 0) {
                document.getElementById('viewPhotosContent').innerHTML = '<p style="text-align: center; color: #999;">尚未上傳照片</p>';
                return;
            }

            // 按照類型分組
            const beforePhotos = photos.filter(p => p.photo_type === 'before');
            const afterPhotos = photos.filter(p => p.photo_type === 'after');

            let html = '';

            if (beforePhotos.length > 0) {
                html += `
                    <div class="photo-category-view">
                        <h4>現況照片 (${beforePhotos.length}張)</h4>
                        <div class="photo-gallery">
                `;
                beforePhotos.forEach(photo => {
                    html += `
                        <div class="photo-item-view" onclick="workLogManager.showPhotoModal('${photo.file_path}')">
                            <img src="${photo.thumbnail_path || photo.file_path}" alt="現況照片">
                            <div class="photo-name-view">${photo.original_name || photo.file_name}</div>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }

            if (afterPhotos.length > 0) {
                html += `
                    <div class="photo-category-view">
                        <h4>改善後照片 (${afterPhotos.length}張)</h4>
                        <div class="photo-gallery">
                `;
                afterPhotos.forEach(photo => {
                    html += `
                        <div class="photo-item-view" onclick="workLogManager.showPhotoModal('${photo.file_path}')">
                            <img src="${photo.thumbnail_path || photo.file_path}" alt="改善後照片">
                            <div class="photo-name-view">${photo.original_name || photo.file_name}</div>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }

            document.getElementById('viewPhotosContent').innerHTML = html;

        } catch (error) {
            console.error('載入檢視照片錯誤:', error);
            document.getElementById('viewPhotosContent').innerHTML = '<p style="text-align: center; color: #e74c3c;">載入照片失敗</p>';
        }
    }

    // ========== 操作記錄功能 ==========
    initOperationLogs() {
        // 操作記錄模態框關閉事件
        const operationLogsModal = document.getElementById('operationLogsModal');
        const operationLogsModalClose = document.getElementById('operationLogsModalClose');

        operationLogsModalClose?.addEventListener('click', () => {
            operationLogsModal.style.display = 'none';
        });

        operationLogsModal?.addEventListener('click', (e) => {
            if (e.target === operationLogsModal) {
                operationLogsModal.style.display = 'none';
            }
        });
    }

    async showOperationLogs(workLogId, serialNumber) {
        // 檢查權限
        if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'manager') {
            this.showMessage('權限不足，只有管理員和組長可以查看操作記錄', 'error');
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest(`/api/logs/${workLogId}/operations`);
            if (!response.ok) {
                throw new Error('載入操作記錄失敗');
            }

            const operations = await response.json();
            
            const operationLogsModal = document.getElementById('operationLogsModal');
            const operationLogsList = document.getElementById('operationLogsList');
            
            // 更新模態框標題
            operationLogsModal.querySelector('h3').textContent = `操作記錄 - ${serialNumber}`;
            
            if (operations.length === 0) {
                operationLogsList.innerHTML = '<p style="text-align: center; color: #999;">暫無操作記錄</p>';
            } else {
                operationLogsList.innerHTML = operations.map(op => this.renderOperationLogItem(op)).join('');
            }
            
            operationLogsModal.style.display = 'block';

        } catch (error) {
            console.error('載入操作記錄錯誤:', error);
            this.showMessage('載入操作記錄失敗', 'error');
        }
    }

    renderOperationLogItem(operation) {
        const operationTypeMap = {
            'create': '新增',
            'update': '修改', 
            'delete': '刪除',
            'restore': '恢復',
            'photo_upload': '上傳照片',
            'photo_delete': '刪除照片'
        };

        const operationType = operationTypeMap[operation.operation_type] || operation.operation_type;
        const operationDate = new Date(operation.operation_date).toLocaleString('zh-TW');
        const operatorName = operation.full_name || operation.username || '未知用戶';

        return `
            <div class="operation-log-item">
                <div class="operation-header">
                    <span class="operation-type ${operation.operation_type}">${operationType}</span>
                    <span class="operation-date">${operationDate}</span>
                    <span class="operation-user">操作者: ${operatorName}</span>
                </div>
                <div class="operation-description">
                    ${operation.description || '無描述'}
                </div>
                ${operation.old_data && operation.new_data ? this.renderOperationDiff(operation.old_data, operation.new_data) : ''}
            </div>
        `;
    }

    renderOperationDiff(oldData, newData) {
        const changes = [];
        const fieldNames = {
            'current_status': '問題描述',
            'improved_status': '改善後狀況',
            'problem_category': '問題類別',
            'department': '部門',
            'extension': '分機',
            'reporter': '通報人',
            'resolver': '改善者',
            'status': '狀態',
            'notes': '備註'
        };

        for (const [field, fieldName] of Object.entries(fieldNames)) {
            if (oldData[field] !== newData[field]) {
                changes.push(`
                    <div class="field-change">
                        <strong>${fieldName}:</strong>
                        <span class="old-value">${oldData[field] || '(空)'}</span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="new-value">${newData[field] || '(空)'}</span>
                    </div>
                `);
            }
        }

        return changes.length > 0 ? `<div class="operation-changes">${changes.join('')}</div>` : '';
    }

    // ========== 已刪除記錄功能 ==========
    initDeletedRecords() {
        const deletedRecordsBtn = document.getElementById('deletedRecordsBtn');
        const deletedRecordsModal = document.getElementById('deletedRecordsModal');
        const deletedRecordsModalClose = document.getElementById('deletedRecordsModalClose');

        deletedRecordsBtn?.addEventListener('click', () => {
            this.showDeletedRecords();
        });

        deletedRecordsModalClose?.addEventListener('click', () => {
            deletedRecordsModal.style.display = 'none';
        });

        deletedRecordsModal?.addEventListener('click', (e) => {
            if (e.target === deletedRecordsModal) {
                deletedRecordsModal.style.display = 'none';
            }
        });

        // 分頁功能
        document.getElementById('deletedPrevBtn')?.addEventListener('click', () => {
            if (this.deletedCurrentPage > 1) {
                this.deletedCurrentPage--;
                this.loadDeletedRecords();
            }
        });

        document.getElementById('deletedNextBtn')?.addEventListener('click', () => {
            if (this.deletedCurrentPage < this.deletedTotalPages) {
                this.deletedCurrentPage++;
                this.loadDeletedRecords();
            }
        });

        this.deletedCurrentPage = 1;
        this.deletedTotalPages = 1;
    }

    async showDeletedRecords() {
        // 檢查權限
        if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'manager') {
            this.showMessage('權限不足，只有管理員和組長可以查看已刪除記錄', 'error');
            return;
        }

        const deletedRecordsModal = document.getElementById('deletedRecordsModal');
        deletedRecordsModal.style.display = 'block';
        
        this.deletedCurrentPage = 1;
        await this.loadDeletedRecords();
    }

    async loadDeletedRecords() {
        try {
            console.log('正在載入已刪除記錄...');
            const response = await this.makeAuthenticatedRequest(`/api/logs/deleted?page=${this.deletedCurrentPage}&limit=10`);
            console.log('API響應:', response);
            if (!response) {
                throw new Error('無法取得API響應 - 可能是認證問題');
            }
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API錯誤詳情:', response.status, response.statusText, errorText);
                throw new Error(`API請求失敗: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('已刪除記錄數據:', data);
            this.renderDeletedRecordsTable(data.data);
            this.updateDeletedPagination(data.page, data.pages, data.total);

        } catch (error) {
            console.error('載入已刪除記錄錯誤:', error);
            console.error('錯誤詳細信息:', error.message);
            console.error('錯誤堆疊:', error.stack);
            this.showMessage('載入已刪除記錄失敗: ' + error.message, 'error');
        }
    }

    renderDeletedRecordsTable(deletedRecords) {
        const tbody = document.querySelector('#deletedRecordsTable tbody');
        
        if (!deletedRecords || deletedRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #999;">沒有已刪除的記錄</td></tr>';
            return;
        }

        tbody.innerHTML = deletedRecords.map(record => `
            <tr class="deleted-record">
                <td>${record.serial_number}</td>
                <td title="${record.current_status}">${this.truncateText(record.current_status, 30)}</td>
                <td>${record.problem_category}</td>
                <td>${record.department}</td>
                <td>${record.reporter}</td>
                <td><span class="status-${this.getStatusClass(record.status)}">${record.status}</span></td>
                <td>${this.formatDate(record.deleted_date)}</td>
                <td>${record.deleted_by_name || '未知'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-view-operations" onclick="workLogManager.showOperationLogs(${record.id}, '${record.serial_number}')" title="查看操作記錄">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn-restore" onclick="workLogManager.restoreRecord(${record.id}, '${record.serial_number}')" title="恢復記錄">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateDeletedPagination(currentPage, totalPages, totalItems) {
        this.deletedCurrentPage = currentPage;
        this.deletedTotalPages = totalPages;
        
        document.getElementById('deletedPageInfo').textContent = 
            `第 ${currentPage} 頁 / 共 ${totalPages} 頁 (總計 ${totalItems} 筆)`;
        
        document.getElementById('deletedPrevBtn').disabled = currentPage <= 1;
        document.getElementById('deletedNextBtn').disabled = currentPage >= totalPages;
    }

    async restoreRecord(id, serialNumber) {
        if (!confirm(`確定要恢復記錄「${serialNumber}」嗎？`)) {
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest(`/api/logs/${id}/restore`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '恢復記錄失敗');
            }

            this.showMessage('記錄已恢復成功', 'success');
            await this.loadDeletedRecords();
            await this.loadWorkLogs(this.currentPage); // 重新載入主列表

        } catch (error) {
            console.error('恢復記錄錯誤:', error);
            this.showMessage(error.message, 'error');
        }
    }
}

const workLogManager = new WorkLogManager();