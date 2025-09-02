import api from './api';

const cheatSheetService = {
    // 取得大抄列表
    async getCheatSheets(params = {}) {
        try {
            const response = await api.get('/cheat-sheets', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 取得單一大抄
    async getCheatSheet(id) {
        try {
            const response = await api.get(`/cheat-sheets/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 上傳大抄
    async uploadCheatSheet(formData) {
        try {
            const response = await api.post('/cheat-sheets', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 下載大抄
    async downloadCheatSheet(id) {
        try {
            const response = await api.get(`/cheat-sheets/${id}/download`, {
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

    // 更新大抄資訊
    async updateCheatSheet(id, data) {
        try {
            const response = await api.put(`/cheat-sheets/${id}`, data);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 更新大抄檔案
    async updateCheatSheetFile(id, formData) {
        try {
            const response = await api.put(`/cheat-sheets/${id}/file`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 刪除大抄
    async deleteCheatSheet(id) {
        try {
            const response = await api.delete(`/cheat-sheets/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // 建立 FormData 的輔助函數
    createFormData(cheatSheetData, file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseCode', cheatSheetData.courseCode);
        formData.append('courseName', cheatSheetData.courseName);
        formData.append('title', cheatSheetData.title);
        if (cheatSheetData.description) {
            formData.append('description', cheatSheetData.description);
        }
        return formData;
    }
};

export default cheatSheetService;