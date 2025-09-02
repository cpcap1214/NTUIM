const { Exam, sequelize } = require('./models');

async function testChineseEncoding() {
    try {
        // 測試連接
        await sequelize.authenticate();
        console.log('✅ 資料庫連接成功');

        // 測試中文資料插入
        const testData = {
            courseCode: 'TEST101',
            courseName: '測試課程',
            professor: '王教授',
            year: 2024,
            semester: '1',
            examType: 'final',
            examAttempt: 1,
            questionFilePath: '/test/path',
            questionFileName: '資料庫管理期末考_112學年度第二學期.pdf',
            questionFileSize: 1024,
            uploadedBy: 1
        };

        console.log('📝 測試插入中文資料:', testData.questionFileName);

        // 插入資料
        const exam = await Exam.create(testData);
        console.log('✅ 資料插入成功, ID:', exam.id);

        // 讀取資料
        const retrieved = await Exam.findByPk(exam.id);
        console.log('📖 讀取的檔名:', retrieved.questionFileName);
        console.log('📖 原始檔名:', testData.questionFileName);
        console.log('🔍 編碼是否正確:', retrieved.questionFileName === testData.questionFileName ? '✅ 正確' : '❌ 錯誤');

        // 清理測試資料
        await exam.destroy();
        console.log('🗑️  測試資料已清理');

        process.exit(0);
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        process.exit(1);
    }
}

testChineseEncoding();