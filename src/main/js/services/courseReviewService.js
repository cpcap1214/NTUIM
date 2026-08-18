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

    // 取得目前可填寫評價的學年期（期末考已結束的學期）
    async getReviewableTerms() {
        try {
            const response = await api.get('/course-catalog/reviewable-terms');
            return response.data.data || [];
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 搜尋台大課程目錄，給「寫評價」表單的課程名稱自動完成下拉選單用。
    // 給了 year + semester 就只搜該學年期；不給則搜所有可填學期（表單的「全部」選項）。
    // limit 預設值刻意開得大：一門課有多位教授時每位各佔一列
    //（FL1008 英文有 24 位），名額太小會讓整個選單都是同一門課。
    // 實測 114-2 的「英文」共 117 筆、「國文」93 筆，150 可全數涵蓋。
    async searchCourseCatalog(keyword, { year, semester, limit = 150 } = {}) {
        try {
            const params = { q: keyword, limit };
            // 兩個都有才送：後端是「兩者皆給才視為指定學期」，只送一個會被當成全部
            if (year && semester) {
                params.year = year;
                params.semester = semester;
            }
            const response = await api.get('/course-catalog/search', { params });
            return response.data.data || [];
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 單一課程的回饋金名額。
    // /course-catalog/search 的每一列都已經帶名額了，這支只給「手動輸入課程」的情況用——
    // 沒從下拉選單挑課的人比對不到課程目錄，不查一次就完全看不到名額資訊。
    async getCourseQuota({ courseCode, professor, year, semester }) {
        try {
            const response = await api.get('/course-catalog/quota', {
                params: { courseCode, professor, year, semester },
            });
            return response.data.data;
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

    // 取得回饋金發放清單（總務或管理員）；paid 傳 'true'/'false' 可只看已/未發放
    // payoutStatus: 'pending' | 'paid' | 'declined'，不給就是全部
    async getPayouts(payoutStatus) {
        try {
            const response = await api.get('/course-reviews/payouts', {
                params: payoutStatus === undefined ? {} : { payoutStatus }
            });
            return response.data.data || [];
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 標記回饋金是否已發放（總務或管理員）
    // payoutStatus: 'pending'（未處理）| 'paid'（已發放）| 'declined'（不發放）
    async setPayoutStatus(id, payoutStatus) {
        try {
            const response = await api.patch(`/course-reviews/${id}/payout`, { payoutStatus });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 下載發放清單 CSV：走 blob 才能帶上認證 token（單純用 <a href> 會少了 Authorization 標頭）
    async downloadPayoutCsv() {
        try {
            const response = await api.get('/course-reviews/payouts/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `course-review-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
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
