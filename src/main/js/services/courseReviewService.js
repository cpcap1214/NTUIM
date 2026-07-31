import api from './api';

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

    // 取得課程統計
    async getCourseStatistics(courseCode) {
        try {
            const response = await api.get(`/course-reviews/statistics/${courseCode}`);
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
        const labels = { pending: '待審核', approved: '已核准', rejected: '已拒絕' };
        return labels[status] || status;
    },

    // 審核狀態顏色（對應 MUI Chip 的 color prop）
    getStatusColor(status) {
        const colors = { pending: 'warning', approved: 'success', rejected: 'error' };
        return colors[status] || 'default';
    },

    // 西元年+學期 轉成民國學年期顯示格式（例如 2026, '2' → '115-2'；2026, 'summer' → '115-暑'）
    getAcademicTermLabel(year, semester) {
        const rocYear = parseInt(year, 10) - 1911;
        const suffix = semester === 'summer' ? '暑' : semester;
        return `${rocYear}-${suffix}`;
    },

    // 學期選項
    getSemesterOptions() {
        return [
            { value: '1', label: '上學期' },
            { value: '2', label: '下學期' },
            { value: 'summer', label: '暑期' }
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
    // 取得課程品質文字
    getQualityText(quality) {
        const texts = ['', '非常差', '差', '普通', '好', '非常好'];
        const index = Math.min(5, Math.max(1, Math.round(quality)));
        return texts[index] ?? '未知';
    },

    // 取得難易度文字
    getDifficultyText(difficulty) {
        const texts = ['', '非常簡單', '簡單', '普通', '困難', '非常困難'];
        const index = Math.min(5, Math.max(1, Math.round(difficulty)));
        return texts[index] ?? '未知';
    },

    // 取得給分高低文字（甜度）
    getSweetnessText(sweetness) {
        const texts = ['', '非常硬', '硬', '普通', '甜', '非常甜'];
        const index = Math.min(5, Math.max(1, Math.round(sweetness)));
        return texts[index] ?? '未知';
    },

    // 取得實用性文字
    getUsefulnessText(usefulness) {
        const texts = ['', '沒什麼用', '不太有用', '普通', '有用', '非常有用'];
        const index = Math.min(5, Math.max(1, Math.round(usefulness)));
        return texts[index] ?? '未知';
    }
};

export default courseReviewService;