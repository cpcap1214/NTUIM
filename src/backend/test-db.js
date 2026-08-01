const { testConnection, User, Exam, CheatSheet, CourseReview } = require('./models');
const bcrypt = require('bcryptjs');

async function testDatabase() {
    console.log('=== 開始測試資料庫連接 ===\n');

    try {
        // 測試連接
        await testConnection();
        console.log('✅ 資料庫連接成功\n');

        // 測試建立使用者
        console.log('--- 測試建立使用者 ---');
        const passwordHash = await bcrypt.hash('test123', 10);
        
        const testUser = await User.findOrCreate({
            where: { username: 'test_db_user' },
            defaults: {
                studentId: 'B09705999',
                username: 'test_db_user',
                email: 'testdb@ntu.edu.tw',
                passwordHash: passwordHash,
                fullName: '測試使用者',
                role: 'member',
                hasPaidFee: true
            }
        });

        console.log('✅ 使用者建立/查詢成功');
        console.log(`   使用者ID: ${testUser[0].id}`);
        console.log(`   使用者名稱: ${testUser[0].username}`);
        console.log(`   是否繳費: ${testUser[0].hasPaidFee}\n`);

        // 測試查詢使用者
        console.log('--- 測試查詢使用者 ---');
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'hasPaidFee']
        });
        console.log(`✅ 找到 ${users.length} 個使用者`);
        users.forEach(user => {
            console.log(`   - ${user.username} (${user.role}) - 繳費: ${user.hasPaidFee ? '是' : '否'}`);
        });
        console.log('');

        // 測試建立考古題記錄
        console.log('--- 測試建立考古題記錄 ---');
        const exam = await Exam.findOrCreate({
            where: { 
                courseCode: 'IM1001',
                year: 2024,
                semester: '1',
                examType: 'midterm'
            },
            defaults: {
                courseCode: 'IM1001',
                courseName: '資訊管理導論',
                professor: '王教授',
                year: 2024,
                semester: '1',
                examType: 'midterm',
                filePath: '/uploads/exams/2024/1/IM1001/test.pdf',
                fileName: 'test.pdf',
                fileSize: 1024000,
                uploadedBy: testUser[0].id
            }
        });
        console.log('✅ 考古題記錄建立/查詢成功');
        console.log(`   課程: ${exam[0].courseCode} - ${exam[0].courseName}`);
        console.log(`   類型: ${exam[0].examType}\n`);

        // 測試建立課程評價
        console.log('--- 測試建立課程評價 ---');
        const review = await CourseReview.findOrCreate({
            where: {
                courseCode: 'IM1001',
                userId: testUser[0].id,
                year: 2024,
                semester: '1'
            },
            defaults: {
                courseCode: 'IM1001',
                courseName: '資訊管理導論',
                professor: '王教授',
                year: 2024,
                semester: '1',
                quality: 4.5,
                difficulty: 2.5,
                sweetness: 3,
                usefulness: 5,
                courseContent: '涵蓋資訊管理基礎理論與實務案例',
                comment: '很棒的入門課程',
                userId: testUser[0].id,
                isAnonymous: false
            }
        });
        console.log('✅ 課程評價建立/查詢成功');
        console.log(`   課程: ${review[0].courseCode}`);
        console.log(`   課程品質: ${review[0].quality}/5, 難易度: ${review[0].difficulty}/5, 給分高低: ${review[0].sweetness}/5, 實用性: ${review[0].usefulness}/5\n`);

        // 測試統計
        console.log('--- 資料庫統計 ---');
        const stats = {
            users: await User.count(),
            exams: await Exam.count(),
            cheatSheets: await CheatSheet.count(),
            reviews: await CourseReview.count()
        };

        console.log('📊 資料庫統計:');
        console.log(`   使用者數: ${stats.users}`);
        console.log(`   考古題數: ${stats.exams}`);
        console.log(`   大抄數: ${stats.cheatSheets}`);
        console.log(`   評價數: ${stats.reviews}`);

        console.log('\n=== 資料庫測試完成 ===');
        console.log('✅ 所有測試通過！資料庫運作正常。');

    } catch (error) {
        console.error('\n❌ 測試失敗:', error);
        console.error('錯誤詳情:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

// 執行測試
testDatabase();