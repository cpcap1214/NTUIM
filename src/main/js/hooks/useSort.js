import { useState, useMemo } from 'react';

const useSort = (data, defaultSortKey = '', defaultSortOrder = 'asc') => {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data) || !sortKey) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sortKey];
      let bValue = b[sortKey];

      // 處理日期字串
      if (typeof aValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(aValue)) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // 處理數字
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // 處理日期
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortOrder === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime();
      }

      // 處理字串
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue, 'zh-TW')
          : bValue.localeCompare(aValue, 'zh-TW');
      }

      return 0;
    });
  }, [data, sortKey, sortOrder]);

  const updateSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const resetSort = () => {
    setSortKey(defaultSortKey);
    setSortOrder(defaultSortOrder);
  };

  return {
    sortKey,
    sortOrder,
    sortedData,
    updateSort,
    resetSort,
    setSortKey,
    setSortOrder
  };
};

export default useSort;