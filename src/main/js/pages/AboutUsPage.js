import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Paper,
  Divider,
  Chip,
  Tab,
  Tabs,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { staffByYear, aboutSummary } from '../../resources/data/mockData';
import { getCurrentAcademicYear } from '../utils/dateUtils';

// 可切換的學年直接由資料推導，降冪排列（最新的在最左邊）。
// 不另外維護一份學年清單：多一份就會有漏改的一天。
const availableYears = Object.keys(staffByYear)
  .map(Number)
  .sort((a, b) => b - a);

const AboutUsPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  // 預設本學年，但本學年若還沒公佈名單就退到最新有資料的那一屆。
  //
  // 台大學年度 8 月起算，所以每年 8 月一到，本學年就會變成一個還沒有名單的年份。
  // 直接寫死 getCurrentAcademicYear() 的話，那段期間打開這頁會是全空的。
  // 改成這樣之後，新一屆的名單一補進 mockData，按鈕就會出現並自動成為預設。
  const [year, setYear] = useState(() => {
    const current = getCurrentAcademicYear();
    return availableYears.includes(current) ? current : availableYears[0];
  });

  const handleTabChange = (_, newValue) => setActiveTab(newValue);
  // ToggleButtonGroup 在點擊已選取的按鈕時會送出 null，忽略它——
  // 否則會變成沒有任何學年被選取。
  const handleYearChange = (_, newYear) => {
    if (newYear !== null) setYear(newYear);
  };

  const members = staffByYear[year] || [];

  // 這兩個中文字串是「比對資料值」而不是顯示給使用者的文案：
  // mockData 裡的 position 就是中文（'會長'、'學術部長'…），所以判斷式要跟著用中文。
  // 抽到語言檔會讓篩選在英文介面下失效——比對的是資料，不是介面語言。
  // 幹部職稱本身要多語系的話，得先改成資料端帶 key（例如 positionKey），是另一件事。
  const presidents = members.filter((m) => m.position.includes('會長'));
  const directors = members.filter((m) => m.position.includes('部長') && !m.position.includes('會長'));

  return (
    <Box>
      {/* Hero — 左 logo / 右標題與描述、底部用 banner 波紋當裝飾條 */}
      <Box
        sx={{
          position: 'relative',
          mb: { xs: 4, md: 5 },
          borderRadius: { xs: 2, md: 3 },
          overflow: 'hidden',
          bgcolor: '#ffffff',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 4 }}
          alignItems={{ xs: 'center', md: 'flex-start' }}
          sx={{
            p: { xs: 3, md: 4 },
            pb: { xs: 4, md: 5 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* 方形 logo */}
          <Box
            sx={{
              width: { xs: 96, md: 128 },
              height: { xs: 96, md: 128 },
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src="/images/branding/imsa-logo.png"
              alt="IMSA"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </Box>

          {/* 文字區 */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              textAlign: { xs: 'center', md: 'left' },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                letterSpacing: '0.18em',
                fontWeight: 700,
                fontSize: '0.72rem',
              }}
            >
              ABOUT IMSA
            </Typography>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                mt: 0.5,
                mb: 0.75,
                lineHeight: 1.2,
              }}
            >
              {t('nav.about')}
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{ fontWeight: 500, mb: 1.5 }}
            >
              {t('app.fullName')}
            </Typography>
            {aboutSummary.description && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ lineHeight: 1.8, maxWidth: 640 }}
              >
                {aboutSummary.description}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label={t('about.staffTab')} />
          <Tab label={t('about.contactTab')} />
        </Tabs>
      </Box>

      {/* Tab 0 */}
      {activeTab === 0 && (
        <Box>
          {/* 學年切換 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <ToggleButtonGroup
              value={year}
              exclusive
              onChange={handleYearChange}
              size="small"
              color="primary"
              aria-label={t('about.academicYearLabel')}
            >
              {availableYears.map((option) => (
                <ToggleButton key={option} value={option} sx={{ px: 2 }}>
                  {t('about.yearOption', { year: option })}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {members.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ textAlign: 'center', py: 6 }}
            >
              {t('about.noStaffForYear', { year })}
            </Typography>
          ) : (
            <>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', letterSpacing: '0.12em', mb: 1.5 }}
              >
                {t('about.coreStaff')}
              </Typography>
              <Grid container spacing={3} justifyContent="center" sx={{ mb: 5 }}>
                {presidents.map((member) => (
                  <Grid item xs={6} sm={4} md={3} key={member.id}>
                    <Card
                      sx={{
                        height: '100%',
                        border: '1px solid',
                        borderColor: 'primary.light',
                      }}
                    >
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        {/* children 一律給姓氏字：MUI Avatar 只有在圖片載入成功時才用 src，
                            失敗會退回 children。寫成 {!member.avatar && ...} 的話，
                            路徑打錯（例如學年資料夾放錯）會顯示成通用人像 icon，
                            很容易被誤認為「照片還沒放上去」。 */}
                        <Avatar
                          src={member.avatar}
                          sx={{ width: 96, height: 96, mx: 'auto', mb: 1.5, fontSize: 28, bgcolor: 'primary.main' }}
                        >
                          {member.name.charAt(0)}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
                          {member.name}
                        </Typography>
                        <Chip label={member.position} color="primary" size="small" />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', letterSpacing: '0.12em', mb: 1.5 }}
              >
                {t('about.directors')}
              </Typography>
              <Grid container spacing={2.5} justifyContent="center">
                {directors.map((member) => (
                  <Grid item xs={6} sm={4} md={3} key={member.id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                        <Avatar
                          src={member.avatar}
                          sx={{ width: 80, height: 80, mx: 'auto', mb: 1.25, fontSize: 24, bgcolor: 'secondary.main' }}
                        >
                          {member.name.charAt(0)}
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {member.name}
                        </Typography>
                        <Chip label={member.position} variant="outlined" size="small" />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      )}

      {/* Tab 1 */}
      {activeTab === 1 && (
        <Box sx={{ maxWidth: 560, mx: 'auto' }}>
          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderColor: 'divider' }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <EmailIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {t('auth.email')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    imsa@ntu.im
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LocationIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {t('about.officeLabel')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('about.officeAddress')}
                  </Typography>
                </Box>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={1} justifyContent="center">
                <IconButton
                  href="https://www.facebook.com/NTUIMSA"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.secondary',
                    transition: 'color 160ms ease, background-color 160ms ease',
                    '&:hover': {
                      color: '#1877F2',
                      backgroundColor: 'rgba(24, 119, 242, 0.08)',
                    },
                  }}
                >
                  <FacebookIcon />
                </IconButton>
                <IconButton
                  href="https://www.instagram.com/ntu.imsa"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.secondary',
                    transition: 'color 160ms ease, background-color 160ms ease',
                    '&:hover': {
                      color: '#E1306C',
                      background:
                        'linear-gradient(45deg, rgba(245, 133, 41, 0.12) 0%, rgba(221, 42, 123, 0.12) 50%, rgba(81, 91, 212, 0.12) 100%)',
                    },
                  }}
                >
                  <InstagramIcon />
                </IconButton>
                <IconButton
                  href="https://github.com/ntu-im-sa"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.secondary',
                    transition: 'color 160ms ease, background-color 160ms ease',
                    '&:hover': {
                      color: '#181717',
                      backgroundColor: 'rgba(24, 23, 23, 0.08)',
                    },
                  }}
                >
                  <GitHubIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default AboutUsPage;
