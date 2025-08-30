import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Chip,
  Paper,
} from '@mui/material';
import {
  RateReview as ReviewIcon,
  Quiz as QuizIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { announcements } from '../../resources/data/mockData';
import { APP_CONFIG } from '../../resources/config/constants';
import { API_BASE_URL } from '../services/api';

const iconMap = {
  rate_review: ReviewIcon,
  quiz: QuizIcon,
  description: DescriptionIcon,
};

const getAnnouncementTypeColor = (type) => {
  const colors = {
    exam: 'primary',
    recruitment: 'secondary',
    event: 'info',
    academic: 'success',
  };
  return colors[type] || 'default';
};

const HomePage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    courseReviews: 0,
    exams: 0,
    cheatSheets: 0
  });
  const [loading, setLoading] = useState(true);

  const recentAnnouncements = announcements.slice(0, 3);

  // 從 API 獲取統計數據
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // 並行獲取三種資源的數量
      const [examResponse, cheatSheetResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/exams`),
        fetch(`${API_BASE_URL}/cheat-sheets`)
      ]);

      const examResult = await examResponse.json();
      const cheatSheetResult = await cheatSheetResponse.json();

      setStats({
        courseReviews: 0, // 暫時固定為 0，因為還沒有課程評價 API
        exams: examResult.pagination?.total || examResult.data?.length || 0,
        cheatSheets: cheatSheetResult.pagination?.total || cheatSheetResult.data?.length || 0
      });
    } catch (error) {
      console.error('獲取統計數據錯誤:', error);
      // 發生錯誤時使用預設值
      setStats({
        courseReviews: 0,
        exams: 0,
        cheatSheets: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 動態生成快速入口資料
  const quickLinks = [
    {
      id: 'course-reviews',
      title: '課程評價',
      description: '查看學長姐的課程評價與建議',
      icon: 'rate_review',
      path: '/course-reviews',
      stats: loading ? '載入中...' : `${stats.courseReviews} 份評價`
    },
    {
      id: 'exam-archive',
      title: '考古題庫',
      description: '歷年考古題下載與參考',
      icon: 'quiz',
      path: '/exam-archive',
      stats: loading ? '載入中...' : `${stats.exams} 份考古題`
    },
    {
      id: 'cheat-sheets',
      title: '學習大抄',
      description: '課程重點整理與學習筆記',
      icon: 'description',
      path: '/cheat-sheets',
      stats: loading ? '載入中...' : `${stats.cheatSheets} 份大抄`
    }
  ];

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', py: { xs: 4, md: 6 }, mb: 4 }}>
        <Typography 
          variant="h2" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '3rem' },
            color: 'primary.main',
            mb: 2
          }}
        >
          {APP_CONFIG.name}
        </Typography>
        <Typography 
          variant="h5" 
          color="text.secondary"
          sx={{ 
            fontSize: { xs: '1.2rem', md: '1.5rem' },
            mb: 3,
            maxWidth: '600px',
            mx: 'auto'
          }}
        >
          {APP_CONFIG.fullName}
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ 
            fontSize: '1.1rem',
            maxWidth: '800px',
            mx: 'auto',
            lineHeight: 1.7
          }}
        >
          {APP_CONFIG.description}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Quick Links Section */}
        <Grid item xs={12}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            快速入口
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {quickLinks.map((link) => {
              const IconComponent = iconMap[link.icon];
              return (
                <Grid item xs={12} sm={6} md={4} key={link.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea 
                      onClick={() => navigate(link.path)}
                      sx={{ height: '100%', p: 2 }}
                    >
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <IconComponent 
                          sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} 
                        />
                      </Box>
                      <CardContent sx={{ textAlign: 'center', pt: 0 }}>
                        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                          {link.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {link.description}
                        </Typography>
                        <Chip 
                          label={link.stats} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Latest Announcements */}
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            最新公告
          </Typography>
          <Box sx={{ mb: 4 }}>
            {recentAnnouncements.map((announcement, index) => (
              <Paper 
                key={announcement.id} 
                sx={{ 
                  p: 3, 
                  mb: 2,
                  border: announcement.urgent ? 2 : 1,
                  borderColor: announcement.urgent ? 'error.main' : 'grey.200',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                        {announcement.title}
                      </Typography>
                      {announcement.urgent && (
                        <Chip 
                          label="重要" 
                          color="error" 
                          size="small" 
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      <Chip 
                        label={announcement.type === 'exam' ? '考試' : 
                              announcement.type === 'recruitment' ? '招募' :
                              announcement.type === 'event' ? '活動' : '學術'}
                        size="small"
                        color={getAnnouncementTypeColor(announcement.type)}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                      {announcement.content}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      發布日期：{announcement.date}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => navigate('/announcements')}
              >
                查看更多公告
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HomePage;