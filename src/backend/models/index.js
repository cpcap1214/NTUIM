const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// 設定 Sequelize 連接 SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database/ntuim.db'),
    logging: false, // 設為 console.log 可看到 SQL 查詢
    define: {
        timestamps: true,
        underscored: true, // 使用底線命名（created_at 而非 createdAt）
    }
});

// 在連接後執行 PRAGMA 設定
sequelize.addHook('afterConnect', async (connection) => {
    // 確保 SQLite 使用 UTF-8 編碼並啟用外鍵約束
    await sequelize.query('PRAGMA encoding = "UTF-8"');
    await sequelize.query('PRAGMA foreign_keys = ON');
    // WAL 模式：讓讀取不會被同時進行的寫入交易鎖住（預設的 rollback journal 模式寫入時會鎖住
    // 整個資料庫檔案，任何併發讀取都會直接失敗）；busy_timeout 是遇到鎖衝突時的重試等待上限（ms），
    // 兩者搭配可以避免像 fetchNtuCourses.js 這種短時間大量寫入的背景作業把一般 API 請求打壞
    await sequelize.query('PRAGMA journal_mode = WAL');
    await sequelize.query('PRAGMA busy_timeout = 5000');
    console.log('SQLite PRAGMA 設定完成: UTF-8 編碼, 外鍵約束啟用, WAL 模式, busy_timeout 5000ms');
});

// 定義 User 模型
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    studentId: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false,
        field: 'student_id'
    },
    username: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'full_name'
    },
    role: {
        type: DataTypes.ENUM('admin', 'member', 'user'),
        defaultValue: 'user'
    },
    // 總務權限：可管理課程評價回饋金的發放狀態。刻意獨立於 role 之外（role 有 CHECK 約束，
    // SQLite 改不動；而且一個人可以同時是管理員與總務，用布林旗標比較合適）
    canManagePayouts: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'can_manage_payouts'
    },
    hasPaidFee: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_paid_fee'
    }
}, {
    tableName: 'users',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// 定義 Exam 模型
const Exam = sequelize.define('Exam', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'course_code'
    },
    courseName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'course_name'
    },
    professor: {
        type: DataTypes.STRING(50)
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    semester: {
        type: DataTypes.ENUM('1', '2', 'summer'),
        allowNull: false
    },
    examType: {
        type: DataTypes.ENUM('midterm', 'final', 'quiz'),
        allowNull: false,
        field: 'exam_type'
    },
    examAttempt: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'exam_attempt',
        validate: {
            min: 1,
            max: 3
        }
    },
    // 題目檔案（必要）
    questionFilePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'question_file_path'
    },
    questionFileName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'question_file_name'
    },
    questionFileSize: {
        type: DataTypes.INTEGER,
        field: 'question_file_size'
    },
    // 答案檔案（可選）
    answerFilePath: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'answer_file_path'
    },
    answerFileName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'answer_file_name'
    },
    answerFileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'answer_file_size'
    },
    uploadedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'uploaded_by'
    },
    downloadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'download_count'
    }
}, {
    tableName: 'exams',
    createdAt: 'created_at',
    updatedAt: false
});

// 定義 CheatSheet 模型
const CheatSheet = sequelize.define('CheatSheet', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'course_code'
    },
    courseName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'course_name'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    tags: {
        type: DataTypes.TEXT,
        get() {
            const rawValue = this.getDataValue('tags');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('tags', JSON.stringify(value || []));
        }
    },
    filePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'file_path'
    },
    fileName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'file_name'
    },
    fileSize: {
        type: DataTypes.INTEGER,
        field: 'file_size'
    },
    uploadedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'uploaded_by'
    },
    downloadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'download_count'
    }
}, {
    tableName: 'cheat_sheets',
    createdAt: 'created_at',
    updatedAt: false
});

// 定義 CourseReview 模型
const CourseReview = sequelize.define('CourseReview', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'course_code'
    },
    courseName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'course_name'
    },
    professor: {
        type: DataTypes.STRING(50)
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    semester: {
        type: DataTypes.ENUM('1', '2', 'summer'),
        allowNull: false
    },
    quality: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
        validate: {
            min: 0.5,
            max: 5
        }
    },
    difficulty: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
        validate: {
            min: 0.5,
            max: 5
        }
    },
    sweetness: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
        validate: {
            min: 0.5,
            max: 5
        }
    },
    usefulness: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
        validate: {
            min: 0.5,
            max: 5
        }
    },
    courseContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'course_content',
        validate: {
            len: [5, 1000]
        }
    },
    teachingMethod: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'teaching_method',
        validate: {
            len: [0, 1000]
        }
    },
    assignmentExamFormat: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'assignment_exam_format',
        validate: {
            len: [0, 1000]
        }
    },
    gradingBreakdown: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'grading_breakdown',
        validate: {
            len: [0, 1000]
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [50, 1000]
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
    },
    isAnonymous: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_anonymous'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
    },
    rejectReason: {
        type: DataTypes.TEXT,
        field: 'reject_reason'
    },
    reviewedBy: {
        type: DataTypes.INTEGER,
        field: 'reviewed_by'
    },
    // 回饋金發放狀態（只有已核准的評價才有發放意義），由總務部管理
    isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_paid'
    },
    paidAt: {
        type: DataTypes.DATE,
        field: 'paid_at'
    },
    paidBy: {
        type: DataTypes.INTEGER,
        field: 'paid_by'
    }
}, {
    tableName: 'course_reviews',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// 定義 Course 模型
const Course = sequelize.define('Course', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false,
        field: 'course_code'
    },
    courseName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'course_name'
    },
    credits: {
        type: DataTypes.INTEGER
    },
    type: {
        type: DataTypes.ENUM('required', 'elective')
    },
    department: {
        type: DataTypes.STRING(50)
    }
}, {
    tableName: 'courses',
    createdAt: 'created_at',
    updatedAt: false
});

// 定義 CourseCatalog 模型：台大課程目錄（從 NOL 抓來的課程名稱/代碼/教授/學期），
// 純唯讀查詢用，供「寫課程評價」表單的課程名稱自動完成下拉選單使用，不跟其他表建立關聯
const CourseCatalog = sequelize.define('CourseCatalog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'course_code'
    },
    courseName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'course_name'
    },
    professor: {
        type: DataTypes.STRING(50)
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    semester: {
        type: DataTypes.ENUM('1', '2', 'summer'),
        allowNull: false
    },
    departmentCode: {
        type: DataTypes.STRING(10),
        field: 'department_code'
    },
    departmentName: {
        type: DataTypes.STRING(50),
        field: 'department_name'
    }
}, {
    tableName: 'course_catalog',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // 對應資料庫層的 UNIQUE(course_code, professor, year, semester)，
        // 讓 CourseCatalog.upsert() 在 SQLite 上能正確找到衝突目標（ON CONFLICT）
        { unique: true, fields: ['course_code', 'professor', 'year', 'semester'] }
    ]
});

// ---------------------------------------------------------------------------
// 身分組與模組存取控制
// 權限「種類」定義在 config/permissions.js，這裡只存「哪個身分組持有哪些權限字串」
// ---------------------------------------------------------------------------
const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    description: { type: DataTypes.TEXT },
    color: { type: DataTypes.STRING(20) },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // 內建身分組，不允許刪除或改 key
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_system' },
    // 成員資格由系統自動推導，不可手動指派（目前只有「會員」＝已繳費）
    isAuto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_auto' }
}, { tableName: 'roles', createdAt: 'created_at', updatedAt: 'updated_at' });

const RolePermission = sequelize.define('RolePermission', {
    roleId: { type: DataTypes.INTEGER, primaryKey: true, field: 'role_id' },
    permission: { type: DataTypes.STRING(50), primaryKey: true }
}, { tableName: 'role_permissions', timestamps: false });

const UserRole = sequelize.define('UserRole', {
    userId: { type: DataTypes.INTEGER, primaryKey: true, field: 'user_id' },
    roleId: { type: DataTypes.INTEGER, primaryKey: true, field: 'role_id' },
    grantedBy: { type: DataTypes.INTEGER, field: 'granted_by' }
}, { tableName: 'user_roles', createdAt: 'granted_at', updatedAt: false });

const Module = sequelize.define('Module', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    description: { type: DataTypes.TEXT },
    visibility: { type: DataTypes.ENUM('public', 'restricted'), allowNull: false, defaultValue: 'public' },
    // 受限時，無權限者是否仍在選單看得到入口（標示「即將推出」）
    showWhenRestricted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'show_when_restricted' }
}, { tableName: 'modules', createdAt: 'created_at', updatedAt: 'updated_at' });

const ModuleAccess = sequelize.define('ModuleAccess', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    moduleId: { type: DataTypes.INTEGER, allowNull: false, field: 'module_id' },
    roleId: { type: DataTypes.INTEGER, field: 'role_id' },
    userId: { type: DataTypes.INTEGER, field: 'user_id' }
}, { tableName: 'module_access', createdAt: 'created_at', updatedAt: false });

// 站上公告
const Announcement = sequelize.define('Announcement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    level: { type: DataTypes.ENUM('info', 'important'), allowNull: false, defaultValue: 'info' },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // 一律存 UTC。NULL 代表該側不限制。
    publishAt: { type: DataTypes.DATE, field: 'publish_at' },
    expireAt: { type: DataTypes.DATE, field: 'expire_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
}, { tableName: 'announcements', createdAt: 'created_at', updatedAt: 'updated_at' });

// 「不要再提醒」：沒有記錄就代表沒關過，所以不需要為新公告預先建列
const AnnouncementDismissal = sequelize.define('AnnouncementDismissal', {
    announcementId: { type: DataTypes.INTEGER, primaryKey: true, field: 'announcement_id' },
    userId: { type: DataTypes.INTEGER, primaryKey: true, field: 'user_id' },
    dismissedAt: { type: DataTypes.DATE, field: 'dismissed_at', defaultValue: DataTypes.NOW }
}, { tableName: 'announcement_dismissals', timestamps: false });

// 定義關聯
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });
Role.hasMany(RolePermission, { foreignKey: 'role_id', as: 'permissions' });
RolePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Module.hasMany(ModuleAccess, { foreignKey: 'module_id', as: 'accessRules' });
ModuleAccess.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

Announcement.belongsTo(User, { foreignKey: 'created_by', as: 'author' });
Announcement.hasMany(AnnouncementDismissal, { foreignKey: 'announcement_id', as: 'dismissals' });
AnnouncementDismissal.belongsTo(Announcement, { foreignKey: 'announcement_id', as: 'announcement' });
ModuleAccess.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
ModuleAccess.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Exam, { foreignKey: 'uploaded_by', as: 'uploadedExams' });
Exam.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

User.hasMany(CheatSheet, { foreignKey: 'uploaded_by', as: 'uploadedCheatSheets' });
CheatSheet.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

User.hasMany(CourseReview, { foreignKey: 'user_id', as: 'reviews' });
CourseReview.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });
CourseReview.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewedByUser' });
CourseReview.belongsTo(User, { foreignKey: 'paid_by', as: 'paidByUser' });

// 測試連接
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('資料庫連接成功');
    } catch (error) {
        console.error('無法連接到資料庫:', error);
    }
}

module.exports = {
    sequelize,
    User,
    Exam,
    CheatSheet,
    CourseReview,
    Course,
    CourseCatalog,
    Role,
    RolePermission,
    UserRole,
    Module,
    ModuleAccess,
    Announcement,
    AnnouncementDismissal,
    testConnection
};