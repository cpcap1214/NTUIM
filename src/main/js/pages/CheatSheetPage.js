import React, { useState } from 'react';
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
import { cheatSheets } from '../../resources/data/mockData';

const CheatSheetPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  // 取得所有課程和標籤
  const allCourses = [...new Set(cheatSheets.map(sheet => sheet.courseName))];
  const allTags = [...new Set(cheatSheets.flatMap(sheet => sheet.tags))];

  const filteredSheets = cheatSheets
    .filter(sheet => {
      const matchesSearch = sheet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sheet.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sheet.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCourse = courseFilter === 'all' || sheet.courseName === courseFilter;
      const matchesTag = tagFilter === 'all' || sheet.tags.includes(tagFilter);
      return matchesSearch && matchesCourse && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.uploadDate) - new Date(a.uploadDate);
        case 'downloads':
          return b.downloads - a.downloads;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const handleDownload = (fileUrl, title) => {
    console.log(`Downloading: ${title} from ${fileUrl}`);
  };

  const handlePreview = (fileUrl) => {
    console.log(`Previewing: ${fileUrl}`);
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
                  {cheatSheets.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  份大抄
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {cheatSheets.reduce((sum, sheet) => sum + sheet.downloads, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  總下載次數
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {allCourses.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  門課程
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

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

                  <Divider sx={{ my: 2 }} />

                  {/* Author and Stats */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                        {sheet.author.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        by {sheet.author}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DateIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          {sheet.uploadDate}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DownloadIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          {sheet.downloads}
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
                      onClick={() => handlePreview(sheet.fileUrl)}
                      sx={{ flex: 1 }}
                    >
                      預覽
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<GetAppIcon />}
                      onClick={() => handleDownload(sheet.fileUrl, sheet.title)}
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
        {filteredSheets.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <TagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              沒有找到符合條件的大抄
            </Typography>
            <Typography variant="body2" color="text.disabled">
              請嘗試調整搜尋條件或選擇不同的標籤
            </Typography>
          </Box>
        )}

        {/* Upload CTA */}
        <Paper sx={{ p: 4, mt: 4, backgroundColor: 'info.light', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'info.dark' }}>
            分享學習筆記
          </Typography>
          <Typography variant="body1" color="info.dark" sx={{ mb: 3 }}>
            將你的課程重點整理分享給同學，一起建立學習資源庫
          </Typography>
          <Button variant="contained" size="large" color="info">
            上傳大抄
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default CheatSheetPage;