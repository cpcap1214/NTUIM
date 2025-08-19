import api from './api';

const examService = {
    // 取得考古題列表
    async getExams(params = {}) {
        try {
            const response = await api.get('/exams', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得單一考古題
    async getExam(id) {
        try {
            const response = await api.get(`/exams/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 上傳考古題
    async uploadExam(formData) {
        try {
            const response = await api.post('/exams', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 下載考古題
    async downloadExam(id) {
        try {
            const response = await api.get(`/exams/${id}/download`, {
                responseType: 'blob'
            });
            
            // 從 header 取得檔名
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'download.pdf';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = decodeURIComponent(filenameMatch[1]);
                }
            }

            // 建立下載連結
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 刪除考古題
    async deleteExam(id) {
        try {
            const response = await api.delete(`/exams/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 建立 FormData 的輔助函數
    createFormData(examData, file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseCode', examData.courseCode);
        formData.append('courseName', examData.courseName);
        formData.append('year', examData.year);
        formData.append('semester', examData.semester);
        formData.append('examType', examData.examType);
        if (examData.professor) {
            formData.append('professor', examData.professor);
        }
        return formData;
    }
};

export default examService;