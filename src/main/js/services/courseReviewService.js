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

    // 評分選項
    getRatingOptions() {
        return [
            { value: 1, label: '1 - 非常差' },
            { value: 2, label: '2 - 差' },
            { value: 3, label: '3 - 普通' },
            { value: 4, label: '4 - 好' },
            { value: 5, label: '5 - 非常好' }
        ];
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

    // 取得難度文字
    getDifficultyText(difficulty) {
        const texts = ['', '很簡單', '簡單', '普通', '困難', '很困難'];
        return texts[difficulty] || '未知';
    },

    // 取得作業量文字
    getWorkloadText(workload) {
        const texts = ['', '很輕鬆', '輕鬆', '普通', '繁重', '很繁重'];
        return texts[workload] || '未知';
    },

    // 取得實用性文字
    getUsefulnessText(usefulness) {
        const texts = ['', '沒用', '不太有用', '普通', '有用', '非常有用'];
        return texts[usefulness] || '未知';
    }
};

export default courseReviewService;