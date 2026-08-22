import { useTranslation } from 'react-i18next';
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
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import NTUCalendar from '../components/NTUCalendar';

const iconMap = {
  rate_review: ReviewIcon,
  quiz: QuizIcon,
  description: DescriptionIcon,
};

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, hasPaidFee } = useAuth();
  const [stats, setStats] = useState({ courseReviews: 0, exams: 0, cheatSheets: 0 });
  const [loading, setLoading] = useState(true);

  // 登入狀態改變時重取：模組可能對訪客關閉（回 403）、登入後才看得到數字，
  // 否則會停在 0 直到手動重新整理
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // 只要 pagination.total，所以 limit 取 1。
  // 注意 course-reviews 的 limit 上限是 50（見 routes/courseReviews.js 的驗證），
  // 原本 exams 用的 limit=1000 套過去會直接 400。
  //
  // 用 api（不是裸 fetch）才會帶上 token：模組未對訪客開放時，
  // 沒有 token 一律 403，登入的使用者也會拿到 0。
  const fetchTotal = async (path) => {
    try {
      const { data } = await api.get(path, { params: { limit: 1 } });
      return data.pagination?.total ?? data.data?.length ?? 0;
    } catch (error) {
      // 模組尚未開放（403）或後端出錯 → 這個數字顯示 0，
      // 但不能影響另外兩個，所以在這裡就吞掉
      return 0;
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    // 三個各自獨立取。原本用一個 try 包住 Promise.all，
    // 任何一項失敗就把三個數字全部歸零
    const [courseReviews, exams, cheatSheets] = await Promise.all([
      fetchTotal('/course-reviews'),
      fetchTotal('/exams'),
      fetchTotal('/cheat-sheets'),
    ]);
    setStats({ courseReviews, exams, cheatSheets });
    setLoading(false);
  };

  const quickLinks = [
    {
      id: 'course-reviews',
      title: t('nav.courseReviews'),
      description: t('home.quickLinks.courseReviews'),
      icon: 'rate_review',
      path: '/course-reviews',
      stats: stats.courseReviews,
      unit: t('home.units.reviews'),
      accent: '#1976d2',
    },
    {
      id: 'exam-archive',
      title: t('home.quickLinks.examArchiveTitle'),
      description: t('home.quickLinks.examArchive'),
      icon: 'quiz',
      path: '/exam-archive',
      stats: stats.exams,
      unit: t('home.units.exams'),
      accent: '#0891b2',
    },
    {
      id: 'cheat-sheets',
      title: t('home.quickLinks.cheatSheetsTitle'),
      description: t('home.quickLinks.cheatSheets'),
      icon: 'description',
      path: '/cheat-sheets',
      stats: stats.cheatSheets,
      unit: t('home.units.cheatSheets'),
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
                  {t('home.banner.loginTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  {t('home.banner.loginBody')}
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
                {t('nav.login')}
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
                {t('auth.register')}
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
                  {t('home.banner.unpaidTitle', { name: user?.fullName || user?.username })}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a16207' }}>
                  {t('home.banner.unpaidBody')}
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
              {t('home.banner.contactToPay')}
            </Button>
          </Stack>
        </Card>
      );
    }

    return null;
  };

  return (
    <Box>
      {/* 註：這裡原本有一塊置中的 Hero，印 APP_CONFIG.name / fullName / description。
          名稱改走 i18n（app.name）後那三個欄位就不存在了，於是它變成三個空的
          Typography——文字沒了、py: 8 的留白還在，看起來就是頁首下方一段莫名的空白。
          橫幅已經扮演 Hero 的角色，整塊移除。 */}

      {/* Contextual Banner */}
      {renderContextBanner()}

      {/* IMSA 橫幅 */}
      <Box
        component="img"
        src="/images/branding/imsa-banner.png"
        alt={t('app.name')}
        onError={(e) => {
          // 缺檔時整塊藏起來，不要留下破圖的框（同 AboutUsPage 的 logo 作法）
          e.currentTarget.style.display = 'none';
        }}
        sx={{
          display: 'block',
          width: '100%',
          height: 'auto',
          // 先用原圖比例（2460×936）把版位撐開，圖載入時才不會把下面的內容往下推
          aspectRatio: '2460 / 936',
          borderRadius: 2,
          mb: { xs: 3, md: 4 },
        }}
      />

      {/* Quick Links */}
      <Box sx={{ mb: { xs: 4, md: 5 } }}>
        <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 2.5 }}>
          {t('home.quickAccess')}
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
                        {loading ? t('common.loading') : `${link.stats} ${link.unit}`}
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

      {/* NTU Calendar */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <NTUCalendar />
      </Box>
    </Box>
  );
};

export default HomePage;
