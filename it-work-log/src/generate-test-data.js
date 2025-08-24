const { getDatabase, generateSerialNumber } = require('./database');

const testData = [
    {
        current_status: '電腦無法開機，按電源鍵沒有反應',
        improved_status: '更換電源供應器後恢復正常',
        problem_category: '硬體',
        department: '總務處',
        extension: '1001',
        reporter: '王小明',
        resolver: '李工程師',
        status: '已處理',
        notes: '舊電源供應器已損壞，已更換新品'
    },
    {
        current_status: 'Excel檔案打開時顯示損毀',
        improved_status: '使用修復功能成功修復檔案',
        problem_category: '軟體',
        department: '會計室',
        extension: '1002',
        reporter: '張秘書',
        resolver: '陳技術員',
        status: '已處理',
        notes: '建議定期備份重要檔案'
    },
    {
        current_status: '印表機卡紙無法列印',
        improved_status: '清除卡紙並調整紙張導引器',
        problem_category: '周邊',
        department: '人事室',
        extension: '1003',
        reporter: '林專員',
        resolver: '王技術員',
        status: '已處理',
        notes: '已教導使用者正確放置紙張'
    },
    {
        current_status: '網路連線不穩定，經常斷線',
        improved_status: '更換網路線並檢修交換器',
        problem_category: '網路',
        department: '研發部',
        extension: '2001',
        reporter: '劉工程師',
        resolver: '李網管',
        status: '已處理',
        notes: '網路線老化導致訊號不穩'
    },
    {
        current_status: '監視系統攝影機畫面模糊',
        improved_status: '清潔鏡頭並調整焦距',
        problem_category: '其他',
        department: '警衛室',
        extension: '1004',
        reporter: '鄭警衛',
        resolver: '陳工程師',
        status: '已處理',
        notes: '建議每月定期清潔攝影機'
    },
    {
        current_status: '電腦風扇異音嚴重',
        improved_status: '更換CPU風扇',
        problem_category: '硬體',
        department: '業務部',
        extension: '2002',
        reporter: '黃業務',
        resolver: '李工程師',
        status: '已處理',
        notes: '舊風扇軸承磨損'
    },
    {
        current_status: 'Windows更新失敗',
        improved_status: '手動下載更新檔案並安裝',
        problem_category: '軟體',
        department: '財務部',
        extension: '1005',
        reporter: '吳會計',
        resolver: '陳技術員',
        status: '已處理',
        notes: '網路問題導致自動更新失敗'
    },
    {
        current_status: '滑鼠右鍵失效',
        improved_status: '更換新滑鼠',
        problem_category: '周邊',
        department: '企劃部',
        extension: '2003',
        reporter: '謝企劃',
        resolver: '王技術員',
        status: '已處理',
        notes: '舊滑鼠使用三年已達使用期限'
    },
    {
        current_status: '無法連接共享資料夾',
        improved_status: '重新設定網路權限',
        problem_category: '網路',
        department: '法務部',
        extension: '1006',
        reporter: '胡律師',
        resolver: '李網管',
        status: '已處理',
        notes: '權限設定錯誤'
    },
    {
        current_status: '門禁卡感應失效',
        improved_status: '重新註冊卡片資料',
        problem_category: '其他',
        department: '總經理室',
        extension: '1000',
        reporter: '總經理',
        resolver: '陳工程師',
        status: '已處理',
        notes: '卡片磁條損壞需重新製作'
    },
    {
        current_status: '螢幕畫面閃爍不定',
        improved_status: '更換顯示器連接線',
        problem_category: '硬體',
        department: '行銷部',
        extension: '2004',
        reporter: '楊行銷',
        resolver: '李工程師',
        status: '已處理',
        notes: 'VGA線接觸不良'
    },
    {
        current_status: '防毒軟體無法更新病毒碼',
        improved_status: '重新安裝防毒軟體',
        problem_category: '軟體',
        department: '總務處',
        extension: '1001',
        reporter: '王小華',
        resolver: '陳技術員',
        status: '已處理',
        notes: '軟體檔案損毀'
    },
    {
        current_status: '鍵盤部分按鍵失效',
        improved_status: '更換新鍵盤',
        problem_category: '周邊',
        department: '客服部',
        extension: '3001',
        reporter: '客服小姐',
        resolver: '王技術員',
        status: '已處理',
        notes: '鍵盤進水導致故障'
    },
    {
        current_status: 'WiFi訊號微弱',
        improved_status: '增設無線基地台',
        problem_category: '網路',
        department: '會議室',
        extension: '1050',
        reporter: '會議室管理員',
        resolver: '李網管',
        status: '已處理',
        notes: '距離原基地台太遠'
    },
    {
        current_status: '電話總機故障',
        improved_status: '聯繫廠商維修',
        problem_category: '其他',
        department: '總機',
        extension: '0',
        reporter: '總機小姐',
        resolver: '外包廠商',
        status: '已處理',
        notes: '設備老舊需定期保養'
    },
    {
        current_status: '電腦開機緩慢',
        improved_status: '清理開機程式並掃毒',
        problem_category: '軟體',
        department: '設計部',
        extension: '2005',
        reporter: '設計師',
        resolver: '陳技術員',
        status: '已處理',
        notes: '開機程式過多影響速度'
    },
    {
        current_status: '記憶體不足無法執行程式',
        improved_status: '增加4GB記憶體',
        problem_category: '硬體',
        department: '工程部',
        extension: '2006',
        reporter: '工程師A',
        resolver: '李工程師',
        status: '已處理',
        notes: '原有4GB不足應付需求'
    },
    {
        current_status: '投影機燈泡故障',
        improved_status: '更換新燈泡',
        problem_category: '周邊',
        department: '會議室A',
        extension: '1051',
        reporter: '會議室管理員',
        resolver: '王技術員',
        status: '已處理',
        notes: '燈泡使用壽命到期'
    },
    {
        current_status: '伺服器磁碟空間不足',
        improved_status: '清理暫存檔案並擴充硬碟',
        problem_category: '硬體',
        department: '機房',
        extension: '1099',
        reporter: '系統管理員',
        resolver: '李工程師',
        status: '已處理',
        notes: '日誌檔案佔用大量空間'
    },
    {
        current_status: '資料庫連線逾時',
        improved_status: '優化查詢語句並重啟服務',
        problem_category: '軟體',
        department: 'IT部門',
        extension: '1098',
        reporter: '程式設計師',
        resolver: '資深工程師',
        status: '已處理',
        notes: '查詢效率需要改善'
    },
    {
        current_status: '掃描器無法辨識文件',
        improved_status: '清潔掃描玻璃面板',
        problem_category: '周邊',
        department: '檔案室',
        extension: '1007',
        reporter: '檔案管理員',
        resolver: '王技術員',
        status: '已處理',
        notes: '玻璃面板有灰塵影響掃描'
    },
    {
        current_status: 'VPN連線失敗',
        improved_status: '重新設定VPN伺服器',
        problem_category: '網路',
        department: '業務部',
        extension: '2002',
        reporter: '外勤業務',
        resolver: '李網管',
        status: '已處理',
        notes: '伺服器設定參數錯誤'
    },
    {
        current_status: '考勤機無法打卡',
        improved_status: '重新校正系統時間',
        problem_category: '其他',
        department: '人事室',
        extension: '1003',
        reporter: '人事專員',
        resolver: '陳工程師',
        status: '已處理',
        notes: '系統時間偏差導致故障'
    },
    {
        current_status: '硬碟發出異音',
        improved_status: '緊急備份資料並更換硬碟',
        problem_category: '硬體',
        department: '會計室',
        extension: '1002',
        reporter: '主辦會計',
        resolver: '李工程師',
        status: '已處理',
        notes: '硬碟即將故障，已及時處理'
    },
    {
        current_status: '郵件伺服器無法收發信件',
        improved_status: '重啟郵件服務並檢查設定',
        problem_category: '軟體',
        department: 'IT部門',
        extension: '1098',
        reporter: '網管人員',
        resolver: '資深工程師',
        status: '已處理',
        notes: '服務程序異常結束'
    },
    {
        current_status: 'UPS不斷電系統警告',
        improved_status: '更換UPS電池',
        problem_category: '硬體',
        department: '機房',
        extension: '1099',
        reporter: '機房管理員',
        resolver: '李工程師',
        status: '已處理',
        notes: '電池老化需定期更換'
    },
    {
        current_status: '網路印表機無法列印',
        improved_status: '重新安裝印表機驅動程式',
        problem_category: '周邊',
        department: '行政部',
        extension: '1008',
        reporter: '行政助理',
        resolver: '王技術員',
        status: '已處理',
        notes: '驅動程式版本過舊'
    },
    {
        current_status: '無線滑鼠反應遲鈍',
        improved_status: '更換滑鼠電池',
        problem_category: '周邊',
        department: '研發部',
        extension: '2001',
        reporter: '研發工程師',
        resolver: '王技術員',
        status: '已處理',
        notes: '電池電力不足'
    },
    {
        current_status: '區域網路速度緩慢',
        improved_status: '重啟網路交換器',
        problem_category: '網路',
        department: '整棟大樓',
        extension: '全部',
        reporter: '多人反映',
        resolver: '李網管',
        status: '已處理',
        notes: '交換器過熱導致效能降低'
    },
    {
        current_status: '電子白板觸控不準確',
        improved_status: '重新校正觸控面板',
        problem_category: '其他',
        department: '訓練教室',
        extension: '1052',
        reporter: '教育訓練專員',
        resolver: '陳工程師',
        status: '已處理',
        notes: '需定期校正以維持準確度'
    },
    {
        current_status: '筆電電池無法充電',
        improved_status: '更換筆電電池',
        problem_category: '硬體',
        department: '業務部',
        extension: '2003',
        reporter: '業務經理',
        resolver: '李工程師',
        status: '已處理',
        notes: '電池循環次數過多已老化'
    },
    {
        current_status: '軟體授權即將到期',
        improved_status: '聯繫廠商續約',
        problem_category: '軟體',
        department: 'IT部門',
        extension: '1098',
        reporter: 'IT主管',
        resolver: '採購人員',
        status: '處理中',
        notes: '需要重新評估授權數量'
    },
    {
        current_status: '會議室音響設備無聲音',
        improved_status: '檢查音源線連接',
        problem_category: '其他',
        department: '會議室B',
        extension: '1053',
        reporter: '秘書',
        resolver: '王技術員',
        status: '已處理',
        notes: '音源線鬆脫導致無聲'
    },
    {
        current_status: '防火牆阻擋特定網站',
        improved_status: '調整防火牆規則',
        problem_category: '網路',
        department: '企劃部',
        extension: '2004',
        reporter: '企劃主任',
        resolver: '李網管',
        status: '已處理',
        notes: '業務需要存取特定網站'
    },
    {
        current_status: '條碼掃描器無法讀取',
        improved_status: '清潔掃描鏡頭',
        problem_category: '周邊',
        department: '倉庫',
        extension: '3002',
        reporter: '倉管人員',
        resolver: '王技術員',
        status: '已處理',
        notes: '鏡頭有污漬影響掃描'
    },
    {
        current_status: '監控系統硬碟故障',
        improved_status: '更換監控專用硬碟',
        problem_category: '硬體',
        department: '警衛室',
        extension: '1004',
        reporter: '保全主管',
        resolver: '李工程師',
        status: '已處理',
        notes: '監控硬碟寫入頻繁容易損壞'
    },
    {
        current_status: '視訊會議軟體連線問題',
        improved_status: '更新軟體版本',
        problem_category: '軟體',
        department: '董事會',
        extension: '1001',
        reporter: '董事長秘書',
        resolver: '陳技術員',
        status: '已處理',
        notes: '舊版本相容性問題'
    },
    {
        current_status: '網路攝影機畫質模糊',
        improved_status: '調整攝影機解析度設定',
        problem_category: '其他',
        department: '會議室C',
        extension: '1054',
        reporter: '會議主持人',
        resolver: '陳工程師',
        status: '已處理',
        notes: '解析度設定過低'
    },
    {
        current_status: '主機板電池沒電',
        improved_status: '更換CMOS電池',
        problem_category: '硬體',
        department: '財務部',
        extension: '1005',
        reporter: '財務主管',
        resolver: '李工程師',
        status: '已處理',
        notes: '電池壽命約3-5年'
    },
    {
        current_status: '檔案伺服器權限設定錯誤',
        improved_status: '重新設定資料夾權限',
        problem_category: '軟體',
        department: 'IT部門',
        extension: '1098',
        reporter: '系統管理員',
        resolver: '資深工程師',
        status: '已處理',
        notes: '權限繼承設定有誤'
    },
    {
        current_status: '投影機遙控器失效',
        improved_status: '更換遙控器電池',
        problem_category: '周邊',
        department: '演講廳',
        extension: '1055',
        reporter: '場地管理員',
        resolver: '王技術員',
        status: '已處理',
        notes: '電池電力不足'
    },
    {
        current_status: '無線網路訊號死角',
        improved_status: '增設WiFi中繼器',
        problem_category: '網路',
        department: '休息室',
        extension: '1009',
        reporter: '員工代表',
        resolver: '李網管',
        status: '處理中',
        notes: '需評估最佳安裝位置'
    },
    {
        current_status: '門禁系統時間不正確',
        improved_status: '同步系統時間',
        problem_category: '其他',
        department: '整棟大樓',
        extension: '全部',
        reporter: '保全人員',
        resolver: '陳工程師',
        status: '已處理',
        notes: '時間伺服器連線異常'
    },
    {
        current_status: '印表機墨水匣故障',
        improved_status: '更換印表機墨水匣',
        problem_category: '周邊',
        department: '設計部',
        extension: '2005',
        reporter: '平面設計師',
        resolver: '王技術員',
        status: '已處理',
        notes: '彩色列印需求較高'
    },
    {
        current_status: '電腦中毒無法正常運作',
        improved_status: '完整掃毒並重建系統',
        problem_category: '軟體',
        department: '客服部',
        extension: '3001',
        reporter: '客服主管',
        resolver: '陳技術員',
        status: '已處理',
        notes: '已強化防毒措施'
    },
    {
        current_status: '網路交換器指示燈異常',
        improved_status: '檢查網路線連接狀況',
        problem_category: '網路',
        department: '機房',
        extension: '1099',
        reporter: '網管助理',
        resolver: '李網管',
        status: '已處理',
        notes: '部分埠口接觸不良'
    },
    {
        current_status: '電話分機無撥號音',
        improved_status: '檢查電話線路連接',
        problem_category: '其他',
        department: '法務部',
        extension: '1006',
        reporter: '法務專員',
        resolver: '陳工程師',
        status: '已處理',
        notes: '電話線路老化需更換'
    },
    {
        current_status: '顯示器色彩偏移',
        improved_status: '校正顯示器色彩',
        problem_category: '硬體',
        department: '設計部',
        extension: '2005',
        reporter: '美術設計師',
        resolver: '李工程師',
        status: '已處理',
        notes: '顯示器老化色彩飄移'
    },
    {
        current_status: '備份軟體執行失敗',
        improved_status: '重新設定備份排程',
        problem_category: '軟體',
        department: 'IT部門',
        extension: '1098',
        reporter: '備份管理員',
        resolver: '資深工程師',
        status: '已處理',
        notes: '排程設定衝突'
    },
    {
        current_status: '筆電觸控板失效',
        improved_status: '重新安裝觸控板驅動',
        problem_category: '硬體',
        department: '行銷部',
        extension: '2004',
        reporter: '行銷專員',
        resolver: '李工程師',
        status: '已處理',
        notes: '驅動程式損壞'
    },
    {
        current_status: '網站無法正常顯示',
        improved_status: '清除瀏覽器快取',
        problem_category: '軟體',
        department: '業務部',
        extension: '2002',
        reporter: '業務助理',
        resolver: '陳技術員',
        status: '已處理',
        notes: '快取檔案損壞影響顯示'
    }
];

async function generateTestData() {
    const database = getDatabase();
    
    console.log('開始生成50筆測試資料...');
    
    return new Promise((resolve, reject) => {
        const stmt = database.prepare(`INSERT INTO work_logs 
            (serial_number, current_status, improved_status, problem_category, 
             department, extension, reporter, resolver, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        let completed = 0;
        let errors = 0;

        testData.forEach((data, index) => {
            const serial_number = generateSerialNumber() + `-${String(index + 1).padStart(3, '0')}`;
            
            // 隨機延遲產生不同的時間戳記
            setTimeout(() => {
                stmt.run([
                    serial_number,
                    data.current_status,
                    data.improved_status,
                    data.problem_category,
                    data.department,
                    data.extension,
                    data.reporter,
                    data.resolver,
                    data.status,
                    data.notes
                ], function(err) {
                    if (err) {
                        errors++;
                        console.error(`插入第${index + 1}筆資料失敗:`, err.message);
                    } else {
                        completed++;
                        console.log(`已插入第${index + 1}筆資料: ${serial_number}`);
                    }

                    if (completed + errors === testData.length) {
                        stmt.finalize();
                        console.log(`\n測試資料生成完成！`);
                        console.log(`成功: ${completed} 筆`);
                        console.log(`失敗: ${errors} 筆`);
                        database.close();
                        resolve({ completed, errors });
                    }
                });
            }, index * 100); // 每筆資料間隔100毫秒
        });
    });
}

if (require.main === module) {
    generateTestData()
        .then(result => {
            console.log('測試資料生成結果:', result);
            process.exit(0);
        })
        .catch(err => {
            console.error('生成測試資料失敗:', err);
            process.exit(1);
        });
}

module.exports = { generateTestData };