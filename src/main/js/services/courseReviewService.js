import api from './api';
import i18n from '../i18n';

// 獨立函式而非物件方法：好幾個元件會把 getQualityText 等函式當成裸函式參照傳遞
// （例如 textFn: courseReviewService.getQualityText），若內部依賴 this 會在那種
// 呼叫方式下丟失綁定，所以這裡刻意不用 this。
const metricText = (metric, value) => {
    const index = Math.min(5, Math.max(1, Math.round(value)));
    return i18n.t(`courseReview.metricTexts.${metric}.${index}`, { defaultValue: i18n.t('common.unknown') });
};

const courseReviewService = {
    // 取得課程評價列表
    async getReviews(params = {}) {
        try {
            const response = await api.get('/course-reviews', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得篩選選項（目前實際存在哪些學年期、哪些教授），給「所有評價」分頁的篩選下拉選單用
    async getFilterOptions() {
        try {
            const response = await api.get('/course-reviews/filters');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 新增評價
    async createReview(reviewData) {
        try {
            const response = await api.post('/course-reviews', reviewData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 更新評價
    async updateReview(id, reviewData) {
        try {
            const response = await api.put(`/course-reviews/${id}`, reviewData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 刪除評價
    async deleteReview(id) {
        try {
            const response = await api.delete(`/course-reviews/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得我的評價
    async getMyReviews() {
        try {
            const response = await api.get('/course-reviews/my-reviews');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得評價列表供管理員審核/管理（不帶 status 回傳全部）
    async getAdminReviews(status) {
        try {
            const response = await api.get('/course-reviews/admin/reviews', {
                params: status ? { status } : {}
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 審核評價：核准或拒絕（管理員）
    async reviewStatus(id, { status, rejectReason }) {
        try {
            const response = await api.patch(`/course-reviews/${id}/status`, { status, rejectReason });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 審核狀態標籤
    getStatusLabel(status) {
        return i18n.t(`courseReview.status.${status}`, { defaultValue: status });
    },

    // 審核狀態顏色（對應 MUI Chip 的 color prop）
    getStatusColor(status) {
        const colors = { pending: 'warning', approved: 'success', rejected: 'error' };
        return colors[status] || 'default';
    },

    // 西元年+學期 轉成民國學年期顯示格式（例如 2026, '2' → '115-2'；2026, 'summer' → '115-暑'）
    getAcademicTermLabel(year, semester) {
        const rocYear = parseInt(year, 10) - 1911;
        const suffix = i18n.t(`courseReview.academicTermSuffix.${semester}`, { defaultValue: semester });
        return `${rocYear}-${suffix}`;
    },

    // 學期選項
    getSemesterOptions() {
        return [
            { value: '1', label: i18n.t('courseReview.semester.1') },
            { value: '2', label: i18n.t('courseReview.semester.2') },
            { value: 'summer', label: i18n.t('courseReview.semester.summer') }
        ];
    },

    // 格式化評分顯示
    formatRating(rating) {
        return parseFloat(rating).toFixed(1);
    },

    // 取得評分顏色
    getRatingColor(rating) {
        if (rating >= 4.5) return '#4caf50'; // 綠色
        if (rating >= 4.0) return '#8bc34a'; // 淺綠
        if (rating >= 3.5) return '#ffc107'; // 黃色
        if (rating >= 3.0) return '#ff9800'; // 橘色
        return '#f44336'; // 紅色
    },

    // 四個指標的分數是 1~5 的連續值（含 0.5），文字說明取最接近的整數對應
    getQualityText(quality) {
        return metricText('quality', quality);
    },
    getDifficultyText(difficulty) {
        return metricText('difficulty', difficulty);
    },
    getSweetnessText(sweetness) {
        return metricText('sweetness', sweetness);
    },
    getUsefulnessText(usefulness) {
        return metricText('usefulness', usefulness);
    }
};

export default courseReviewService;
