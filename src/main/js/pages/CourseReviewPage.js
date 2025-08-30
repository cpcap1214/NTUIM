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
  Rating,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { courses } from '../../resources/data/mockData';

const CourseReviewPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  const filteredCourses = courses
    .filter(course => {
      const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.professor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'reviews':
          return b.reviewCount - a.reviewCount;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'success';
    if (rating >= 4.0) return 'info';
    if (rating >= 3.5) return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            課程評價
          </Typography>
        </Box>

        {/* Search and Filter Bar */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="搜尋課程名稱或教授..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: { xs: 2, md: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>課程類別</InputLabel>
                <Select
                  value={categoryFilter}
                  label="課程類別"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="必修">必修</MenuItem>
                  <MenuItem value="選修">選修</MenuItem>
                  <MenuItem value="通識">通識</MenuItem>
                  <MenuItem value="校訂必修">校訂必修</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>排序方式</InputLabel>
                <Select
                  value={sortBy}
                  label="排序方式"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="rating">評分高低</MenuItem>
                  <MenuItem value="reviews">評價數量</MenuItem>
                  <MenuItem value="name">課程名稱</MenuItem>
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
                  {courses.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  門課程
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {courses.reduce((sum, course) => sum + course.reviewCount, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  則評價
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {(courses.reduce((sum, course) => sum + course.rating, 0) / courses.length).toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  平均評分
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Course List */}
        <Grid container spacing={3}>
          {filteredCourses.map((course) => (
            <Grid item xs={12} md={6} key={course.id}>
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
                  {/* Course Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                        {course.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {course.professor}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={course.category} 
                      color={
                        course.category === '必修' || course.category === '校訂必修' ? 'primary' : 
                        course.category === '通識' ? 'info' : 'secondary'
                      }
                      size="small"
                    />
                  </Box>

                  {/* Rating Section */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating 
                        value={course.rating} 
                        precision={0.1} 
                        readOnly 
                        size="small"
                      />
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          color: `${getRatingColor(course.rating)}.main`
                        }}
                      >
                        {course.rating}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      ({course.reviewCount} 則評價)
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Course Info */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        學期: {course.semester}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        學分: {course.credits}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        {course.department}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="contained" 
                      size="small" 
                      fullWidth
                      sx={{ mr: 1 }}
                    >
                      查看評價
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      fullWidth
                    >
                      新增評價
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* No Results */}
        {filteredCourses.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FilterIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              沒有找到符合條件的課程
            </Typography>
            <Typography variant="body2" color="text.disabled">
              請嘗試調整搜尋條件或篩選器
            </Typography>
          </Box>
        )}

      </Box>
    </Container>
  );
};

export default CourseReviewPage;