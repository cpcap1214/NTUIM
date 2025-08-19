import { useState, useEffect, useCallback } from 'react';

// 通用 API Hook
export const useApi = (apiFunction, dependencies = []) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...args) => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiFunction(...args);
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, dependencies);

    return { data, loading, error, execute };
};

// 自動執行的 API Hook
export const useAutoApi = (apiFunction, dependencies = [], autoExecute = true) => {
    const { data, loading, error, execute } = useApi(apiFunction, dependencies);

    useEffect(() => {
        if (autoExecute) {
            execute();
        }
    }, [execute, autoExecute]);

    return { data, loading, error, refetch: execute };
};

// 分頁 API Hook
export const usePaginatedApi = (apiFunction, initialParams = {}) => {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        pages: 0,
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [params, setParams] = useState(initialParams);

    const fetchData = useCallback(async (newParams = {}) => {
        try {
            setLoading(true);
            setError(null);
            
            const mergedParams = { ...params, ...newParams };
            const result = await apiFunction(mergedParams);
            
            if (newParams.page === 1 || !newParams.page) {
                // 第一頁或重新搜尋時替換資料
                setData(result.data || []);
            } else {
                // 載入更多時附加資料
                setData(prev => [...prev, ...(result.data || [])]);
            }
            
            setPagination(result.pagination || {});
            setParams(mergedParams);
            
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunction, params]);

    // 載入第一頁
    const loadFirst = useCallback((newParams = {}) => {
        return fetchData({ ...newParams, page: 1 });
    }, [fetchData]);

    // 載入更多
    const loadMore = useCallback(() => {
        if (pagination.page < pagination.pages) {
            return fetchData({ page: pagination.page + 1 });
        }
    }, [fetchData, pagination]);

    // 重新載入
    const reload = useCallback(() => {
        return fetchData({ page: 1 });
    }, [fetchData]);

    // 更新搜尋參數
    const updateParams = useCallback((newParams) => {
        return loadFirst(newParams);
    }, [loadFirst]);

    return {
        data,
        pagination,
        loading,
        error,
        loadFirst,
        loadMore,
        reload,
        updateParams,
        hasMore: pagination.page < pagination.pages
    };
};

// 表單提交 Hook
export const useFormSubmit = (apiFunction) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const submit = useCallback(async (data) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);
            
            const result = await apiFunction(data);
            setSuccess(true);
            
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunction]);

    const reset = useCallback(() => {
        setError(null);
        setSuccess(false);
    }, []);

    return { submit, loading, error, success, reset };
};

// 檔案上傳 Hook
export const useFileUpload = (apiFunction) => {
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const upload = useCallback(async (formData) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);
            setProgress(0);

            // 這裡可以加入上傳進度追蹤
            const result = await apiFunction(formData);
            setProgress(100);
            setSuccess(true);
            
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunction]);

    const reset = useCallback(() => {
        setProgress(0);
        setError(null);
        setSuccess(false);
    }, []);

    return { upload, progress, loading, error, success, reset };
};