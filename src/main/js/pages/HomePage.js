import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  Stack,
  Button,
} from '@mui/material';
import {
  RateReview as ReviewIcon,
  Quiz as QuizIcon,
  Description as DescriptionIcon,
  ArrowForward as ArrowForwardIcon,
  Login as LoginIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { APP_CONFIG } from '../../resources/config/constants';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const iconMap = {
  rate_review: ReviewIcon,
  quiz: QuizIcon,
  description: DescriptionIcon,
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasPaidFee } = useAuth();
  const [stats, setStats] = useState({ courseReviews: 0, exams: 0, cheatSheets: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [examResponse, cheatSheetResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/exams?limit=1000`),
        fetch(`${API_BASE_URL}/cheat-sheets`),
      ]);

      const examResult = await examResponse.json();
      const cheatSheetResult = await cheatSheetResponse.json();

      setStats({
        courseReviews: 0,
        exams: examResult.pagination?.total || examResult.data?.length || 0,
        cheatSheets: cheatSheetResult.pagination?.total || cheatSheetResult.data?.length || 0,
      });
    } catch (error) {
      console.error('獲取統計數據錯誤:', error);
      setStats({ courseReviews: 0, exams: 0, cheatSheets: 0 });
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    {
      id: 'course-reviews',
      title: '課程評價',
      description: '查看學長姐的課程評價與選課建議',
      icon: 'rate_review',
      path: '/course-reviews',
      stats: stats.courseReviews,
      unit: '份評價',
      accent: '#1976d2',
    },
    {
      id: 'exam-archive',
      title: '考古題庫',
      description: '歷年考古題下載與參考',
      icon: 'quiz',
      path: '/exam-archive',
      stats: stats.exams,
      unit: '份考古題',
      accent: '#0891b2',
    },
    {
      id: 'cheat-sheets',
      title: '學習大抄',
      description: '課程重點整理與筆記分享',
      icon: 'description',
      path: '/cheat-sheets',
      stats: stats.cheatSheets,
      unit: '份大抄',
      accent: '#059669',
    },
  ];

  const renderContextBanner = () => {
    if (!isAuthenticated) {
      return (
        <Card
          sx={{
            mb: { xs: 3, md: 4 },
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            border: 'none',
            color: '#ffffff',
            '&:hover': { boxShadow: '0 12px 24px rgba(25, 118, 210, 0.25)' },
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: { xs: 2.5, md: 3 } }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LoginIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                  登入解鎖完整功能
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  下載考古題、瀏覽大抄、查看課程評價
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{
                  bgcolor: '#ffffff',
                  color: 'primary.main',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                }}
              >
                登入
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/register')}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: '#ffffff',
                  '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                註冊
              </Button>
            </Stack>
          </Stack>
        </Card>
      );
    }

    if (!hasPaidFee) {
      return (
        <Card
          sx={{
            mb: { xs: 3, md: 4 },
            border: '1px solid',
            borderColor: 'warning.light',
            bgcolor: '#fffbeb',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: { xs: 2.5, md: 3 } }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(217, 119, 6, 0.12)',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LockIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#92400e', lineHeight: 1.3 }}>
                  哈囉 {user?.fullName || user?.username}，尚未繳交系學會費
                </Typography>
                <Typography variant="body2" sx={{ color: '#a16207' }}>
                  繳費後即可下載考古題與使用完整功能
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              onClick={() => (window.location.href = 'mailto:imsa@ntu.im')}
              sx={{
                bgcolor: '#d97706',
                '&:hover': { bgcolor: '#b45309' },
              }}
            >
              聯繫繳費
            </Button>
          </Stack>
        </Card>
      );
    }

    return null;
  };

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          textAlign: 'center',
          py: { xs: 5, md: 8 },
          mb: { xs: 2, md: 3 },
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '2rem', md: '3rem' },
            fontWeight: 700,
            color: 'text.primary',
            mb: 1.5,
            letterSpacing: '-0.025em',
          }}
        >
          {APP_CONFIG.name}
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            fontWeight: 400,
            fontSize: { xs: '1rem', md: '1.125rem' },
            maxWidth: 640,
            mx: 'auto',
          }}
        >
          {APP_CONFIG.fullName}
        </Typography>
        {APP_CONFIG.description && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 720, mx: 'auto', mt: 2, lineHeight: 1.7 }}
          >
            {APP_CONFIG.description}
          </Typography>
        )}
      </Box>

      {/* Contextual Banner */}
      {renderContextBanner()}

      {/* Quick Links */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 2.5 }}>
          快速入口
        </Typography>

        <Grid container spacing={{ xs: 2, md: 2.5 }}>
          {quickLinks.map((link) => {
            const IconComponent = iconMap[link.icon];
            return (
              <Grid item xs={12} sm={6} md={4} key={link.id}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea
                    onClick={() => navigate(link.path)}
                    sx={{
                      height: '100%',
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${link.accent}14`,
                        color: link.accent,
                      }}
                    >
                      <IconComponent sx={{ fontSize: 24 }} />
                    </Box>

                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                      <Typography variant="h5" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {link.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {link.description}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ width: '100%', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {loading ? '載入中…' : `${link.stats} ${link.unit}`}
                      </Typography>
                      <ArrowForwardIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};

export default HomePage;
