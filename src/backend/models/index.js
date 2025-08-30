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
    overallRating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
        field: 'overall_rating',
        validate: {
            min: 1,
            max: 5
        }
    },
    difficulty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    workload: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    usefulness: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT
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

// 定義關聯
User.hasMany(Exam, { foreignKey: 'uploaded_by', as: 'uploadedExams' });
Exam.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

User.hasMany(CheatSheet, { foreignKey: 'uploaded_by', as: 'uploadedCheatSheets' });
CheatSheet.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

User.hasMany(CourseReview, { foreignKey: 'user_id', as: 'reviews' });
CourseReview.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });

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
    testConnection
};