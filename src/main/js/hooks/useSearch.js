import { useState, useMemo } from 'react';

const useSearch = (data, searchFields, filters = {}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(filters);

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.filter(item => {
      // 搜尋條件檢查
      const matchesSearch = searchTerm === '' || searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.some(v => 
            typeof v === 'string' && v.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return false;
      });

      // 篩選條件檢查
      const matchesFilters = Object.entries(activeFilters).every(([key, filterValue]) => {
        if (filterValue === 'all' || filterValue === '') return true;
        
        const itemValue = item[key];
        if (Array.isArray(itemValue)) {
          return itemValue.includes(filterValue);
        }
        return itemValue === filterValue;
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, activeFilters]);

  const updateFilter = (key, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters(filters);
  };

  return {
    searchTerm,
    setSearchTerm,
    activeFilters,
    updateFilter,
    clearFilters,
    filteredData,
    hasActiveFilters: searchTerm !== '' || Object.values(activeFilters).some(v => v !== 'all' && v !== '')
  };
};

export default useSearch;