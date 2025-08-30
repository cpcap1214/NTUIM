import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  GetApp as GetAppIcon,
  DateRange as DateIcon,
  Tag as TagIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import PaymentWall from '../components/PaymentWall';

const CheatSheetPage = () => {
  const { user, hasPaidFee } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [cheatSheets, setCheatSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 從 API 獲取大抄資料
  useEffect(() => {
    fetchCheatSheets();
  }, []);

  const fetchCheatSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/cheat-sheets');
      
      if (!response.ok) {
        throw new Error('獲取大抄失敗');
      }
      
      const result = await response.json();
      setCheatSheets(result.data || []);
    } catch (err) {
      console.error('獲取大抄錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 取得所有課程和標籤
  const allCourses = [...new Set(cheatSheets.map(sheet => sheet.courseName))];
  const allTags = [...new Set(cheatSheets.flatMap(sheet => sheet.tags || []))];

  const filteredSheets = cheatSheets
    .filter(sheet => {
      const matchesSearch = sheet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sheet.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (sheet.description && sheet.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCourse = courseFilter === 'all' || sheet.courseName === courseFilter;
      const matchesTag = tagFilter === 'all' || (sheet.tags && sheet.tags.includes(tagFilter));
      return matchesSearch && matchesCourse && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'downloads':
          return (b.downloadCount || 0) - (a.downloadCount || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const handleDownload = async (cheatSheetId, filename) => {
    if (!user) {
      alert('請先登入才能下載大抄');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5001/api/cheat-sheets/${cheatSheetId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('下載失敗');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載錯誤:', error);
      alert('下載失敗，請稍後再試');
    }
  };

  const handlePreview = (cheatSheetId) => {
    if (!user) {
      alert('請先登入才能預覽大抄');
      return;
    }
    // 在新視窗中開啟預覽
    window.open(`http://localhost:5001/uploads/cheat_sheets/${cheatSheetId}/preview`, '_blank');
  };

  const getTagColor = (tag) => {
    const colors = {
      '資料庫': 'primary',
      'React': 'info',
      'JavaScript': 'warning',
      '前端': 'success',
      '機器學習': 'secondary',
      'AI': 'error',
      '演算法': 'primary',
      '理論': 'info',
    };
    return colors[tag] || 'default';
  };

  // 大抄不需要付費限制，只需要登入
  if (!user) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            請先登入
          </Typography>
          <Typography variant="body1" color="text.disabled">
            請登入後即可瀏覽學習大抄
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            學習大抄
          </Typography>
        </Box>

        {/* Search and Filter Bar */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="搜尋標題、課程或內容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>課程</InputLabel>
                <Select
                  value={courseFilter}
                  label="課程"
                  onChange={(e) => setCourseFilter(e.target.value)}
                >
                  <MenuItem value="all">全部課程</MenuItem>
                  {allCourses.map(course => (
                    <MenuItem key={course} value={course}>{course}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>標籤</InputLabel>
                <Select
                  value={tagFilter}
                  label="標籤"
                  onChange={(e) => setTagFilter(e.target.value)}
                >
                  <MenuItem value="all">全部標籤</MenuItem>
                  {allTags.map(tag => (
                    <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>排序</InputLabel>
                <Select
                  value={sortBy}
                  label="排序"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="latest">最新上傳</MenuItem>
                  <MenuItem value="downloads">下載次數</MenuItem>
                  <MenuItem value="title">標題排序</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Statistics */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {loading ? '...' : cheatSheets.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  份大抄
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {loading ? '...' : cheatSheets.reduce((sum, sheet) => sum + (sheet.downloadCount || 0), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  總下載次數
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {loading ? '...' : allCourses.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  門課程
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* 錯誤提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* 載入中 */}
        {loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              載入大抄中...
            </Typography>
          </Box>
        )}

        {/* Popular Tags */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            熱門標籤
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {allTags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                color={getTagColor(tag)}
                variant={tagFilter === tag ? 'filled' : 'outlined'}
                onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Cheat Sheets Grid */}
        <Grid container spacing={3}>
          {filteredSheets.map((sheet) => (
            <Grid item xs={12} md={6} key={sheet.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <DescriptionIcon sx={{ fontSize: 40, color: 'success.main', mr: 2, mt: 0.5 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                        {sheet.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {sheet.courseName}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                    {sheet.description}
                  </Typography>

                  {/* Tags */}
                  {sheet.tags && sheet.tags.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {sheet.tags.map(tag => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            color={getTagColor(tag)}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Author and Stats */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                        {sheet.uploader ? sheet.uploader.fullName.charAt(0) : '?'}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        by {sheet.uploader ? sheet.uploader.fullName : '未知'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DateIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          {sheet.created_at ? new Date(sheet.created_at).toLocaleDateString('zh-TW') : '未知'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DownloadIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          {sheet.downloadCount || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<ViewIcon />}
                      onClick={() => handlePreview(sheet.id)}
                      sx={{ flex: 1 }}
                    >
                      預覽
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<GetAppIcon />}
                      onClick={() => handleDownload(sheet.id, sheet.fileName || `${sheet.title}.pdf`)}
                      sx={{ flex: 1 }}
                    >
                      下載
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* No Results */}
        {!loading && filteredSheets.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <TagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {cheatSheets.length === 0 ? '目前沒有大抄' : '沒有找到符合條件的大抄'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {cheatSheets.length === 0 ? '請聯繫管理員上傳大抄' : '請嘗試調整搜尋條件或選擇不同的標籤'}
            </Typography>
          </Box>
        )}

      </Box>
    </Container>
  );
};

export default CheatSheetPage;