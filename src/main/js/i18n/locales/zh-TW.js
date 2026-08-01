// 全站唯一的語言字串檔（目前只有 zh-TW，pilot 範圍：課程評價功能）。
// 之後要新增其他語言時，複製這個檔案的結構到 locales/<語系代碼>.js，
// 把值換成對應語言，並在 ../index.js 的 resources 裡註冊即可，不用動任何元件程式碼。
const zhTW = {
    common: {
        cancel: '取消',
        confirm: '確認',
        save: '儲存',
        delete: '刪除',
        edit: '編輯',
        close: '關閉',
        search: '搜尋',
        submit: '送出',
        loading: '載入中…',
        unknown: '未知',
        approve: '核准',
        reject: '拒絕',
        all: '全部',
        sort: '排序',
    },

    courseReview: {
        pageTitle: '課程評價',
        loadingReviews: '載入課程評價中…',

        viewMode: {
            feed: '所有評價',
            mine: '我的評價',
        },

        semester: {
            '1': '上學期',
            '2': '下學期',
            summer: '暑期',
        },

        // 學年期簡寫格式（例如 115-2、115-暑）專用的學期後綴，跟 semester 的完整名稱分開維護
        academicTermSuffix: {
            '1': '1',
            '2': '2',
            summer: '暑',
        },

        status: {
            pending: '待審核',
            approved: '已核准',
            rejected: '已拒絕',
        },

        metrics: {
            quality: '課程品質',
            difficulty: '難易度',
            sweetness: '給分高低',
            usefulness: '實用性',
        },

        // 評分欄位文字旁邊的小問號提示，解釋每個指標實際代表什麼
        metricHints: {
            quality: '這門課整體的教學品質好壞',
            difficulty: '這門課的上課與考試難易程度',
            sweetness: '這門課的給分甜度，越高代表給分越高、越好拿高分',
            usefulness: '這門課所學內容在實務或學習上的實用程度',
        },

        // 評價詳情彈窗裡，除了課程名稱外的分項標籤
        detailField: {
            professor: '教授',
            courseCode: '課號',
            academicTerm: '學期',
        },

        // 四個指標 1~5 分（含 0.5）文字說明，取最接近的整數對應；index 0 保留空字串不使用
        metricTexts: {
            quality: ['', '非常差', '差', '普通', '好', '非常好'],
            difficulty: ['', '非常簡單', '簡單', '普通', '困難', '非常困難'],
            sweetness: ['', '非常硬', '硬', '普通', '甜', '非常甜'],
            usefulness: ['', '沒什麼用', '不太有用', '普通', '有用', '非常有用'],
        },

        sort: {
            latestPost: '最新發表',
            ratingHighest: '評分最高',
            ratingLowest: '評分最低',
        },

        searchPlaceholder: {
            feed: '搜尋課程或教授…',
        },

        emptyState: {
            noReviewsYet: '目前還沒有任何課程評價',
            noMatchingReviews: '沒有找到符合條件的評價',
            beFirst: '成為第一個分享課程心得的人吧',
            adjustSearchOrFilter: '請嘗試調整搜尋或篩選條件',
            noReviewsMine: '你還沒有寫過課程評價',
            shareYourExperience: '分享你的修課心得，幫助其他同學選課',
            writeFirstReview: '寫下第一篇評價',
            loginToWrite: '登入後即可分享你的課程心得',
        },

        totalReviewCount: '共 {{count}} 則評價',
        writeReview: '寫評價',
        editReview: '編輯課程評價',
        newReviewTitle: '新增課程評價',
        professorFilterLabel: '教授',
        confirmDeleteReview: '確定要刪除這則評價嗎？',
        reviewedBy: '審核人：{{name}}',
        rejectReasonLabel: '拒絕原因：{{reason}}',
        clickForDetail: '點擊卡片查看完整內容',
        viewDetailTitle: '評價詳情',
        reviseAndResubmit: '編輯並重新送出',

        form: {
            courseName: '課程名稱',
            courseCode: '課程代碼',
            professor: '授課教授',
            academicTerm: '學年期',
            courseContent: '課程內容',
            teachingMethod: '教學方式',
            assignmentExamFormat: '作業與考試形式',
            gradingBreakdown: '評分佔比',
            comment: '心得評論',
            notRatedYet: '尚未評分',
            anonymous: '以匿名身份發布',
            lockedFieldsHint: '課程、教授、學期資訊建立後無法修改，如有錯誤請刪除後重新新增。',
            courseContentHelper: '{{count}} / 1000 字（至少 5 字，內容會自動暫存草稿）',
            optionalFieldHelper: '{{count}} / 1000 字（選填）',
            commentHelper: '{{count}} / 1000 字（至少 50 字，評價通過審核後才會公開顯示；內容會自動暫存草稿）',
            basicInfoRequired: '課程代碼、課程名稱、授課教授為必填',
            ratingsIncomplete: '請完成所有評分項目',
            draftRestored: '已還原上次未完成的草稿',
            clearDraft: '清除草稿',
            saveChanges: '儲存變更',
            submitReview: '送出評價',
            resubmit: '重新送出',
        },

        admin: {
            title: '課程評價管理',
            description: '撰寫課程評價有金錢回饋，所有評價須經審核通過後才會公開顯示；也可在此刪除任何評價',
            searchPlaceholder: '搜尋課程名稱、代碼或教授...',
            noMatchingReviews: '沒有符合條件的評價',
            noMatchingSearchReviews: '沒有找到符合搜尋條件的評價',
            countLabel: '共 {{count}} 則',
            submittedAt: '投稿時間：{{time}}',
            rejectDialogTitle: '拒絕此評價',
            rejectReasonInput: '拒絕原因',
            rejectReasonHelper: '會顯示給投稿者，讓對方知道需要修改的地方',
            confirmReject: '確認拒絕',
            deleteDialogTitle: '刪除這則評價？',
            deleteDialogBody: '此操作無法復原，評價內容將永久刪除。',
            confirmDelete: '確認刪除',
            approveSuccess: '評價已核准並公開顯示',
            approveFailed: '核准失敗',
            rejectSuccess: '評價已拒絕',
            rejectFailed: '拒絕失敗',
            deleteSuccess: '評價已刪除',
            deleteFailed: '刪除失敗',
        },
    },

    // 後端以 errorCode 回傳，前端統一在這裡查對應的中文訊息
    errors: {
        COURSE_CODE_REQUIRED: '課程代碼為必填',
        COURSE_NAME_REQUIRED: '課程名稱為必填',
        PROFESSOR_REQUIRED: '授課教授為必填',
        YEAR_INVALID: '請輸入有效年份',
        SEMESTER_REQUIRED: '請選擇學期',
        QUALITY_RANGE: '課程品質須為0.5-5',
        DIFFICULTY_RANGE: '難易度須為0.5-5',
        SWEETNESS_RANGE: '給分高低須為0.5-5',
        USEFULNESS_RANGE: '實用性須為0.5-5',
        COURSE_CONTENT_REQUIRED: '課程內容為必填，請填寫至少 5 字',
        TEACHING_METHOD_TOO_LONG: '教學方式請勿超過 1000 字',
        ASSIGNMENT_EXAM_FORMAT_TOO_LONG: '作業與考試形式請勿超過 1000 字',
        GRADING_BREAKDOWN_TOO_LONG: '評分佔比請勿超過 1000 字',
        COMMENT_LENGTH: '心得為必填，請填寫 50-1000 字',
        COMMENT_LENGTH_OPTIONAL: '心得請填寫 50-1000 字',
        DUPLICATE_REVIEW: '您已評價過此課程（同學期、同教授）',
        REVIEW_NOT_FOUND: '評價不存在',
        NO_PERMISSION_EDIT: '無權修改此評價',
        NO_PERMISSION_DELETE: '無權刪除此評價',
        CREATE_FAILED: '新增評價失敗',
        UPDATE_FAILED: '更新評價失敗',
        DELETE_FAILED: '刪除評價失敗',
        FETCH_FAILED: '取得評價失敗',
        FETCH_STATS_FAILED: '取得統計資料失敗',
        FETCH_LIST_FAILED: '取得評價列表失敗',
        STATUS_INVALID: '狀態須為 approved 或 rejected',
        REJECT_REASON_REQUIRED: '拒絕時請填寫拒絕原因',
        REVIEW_STATUS_UPDATE_FAILED: '審核評價失敗',
        GENERIC_SUBMIT_FAILED: '送出失敗，請稍後再試',
    },
};

export default zhTW;
