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
} from '@mui/material';
import {
  RateReview as ReviewIcon,
  Quiz as QuizIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { APP_CONFIG } from '../../resources/config/constants';
import { API_BASE_URL } from '../services/api';

const iconMap = {
  rate_review: ReviewIcon,
  quiz: QuizIcon,
  description: DescriptionIcon,
};


const HomePage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    courseReviews: 0,
    exams: 0,
    cheatSheets: 0
  });
  const [loading, setLoading] = useState(true);


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

        </Grid>
      </Grid>
    </Container>
  );
};

export default HomePage;