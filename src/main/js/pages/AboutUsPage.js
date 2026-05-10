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
} from '@mui/material';
import {
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { staffMembers, aboutSummary } from '../../resources/data/mockData';
import { APP_CONFIG } from '../../resources/config/constants';

const AboutUsPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_, newValue) => setActiveTab(newValue);

  const presidents = staffMembers.filter((m) => m.position.includes('會長'));
  const directors = staffMembers.filter((m) => m.position.includes('部長') && !m.position.includes('會長'));

  return (
    <Box>
      {/* Hero banner — 系學會品牌橫幅 */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          borderRadius: { xs: 2, md: 3 },
          overflow: 'hidden',
          mb: { xs: 3, md: 4 },
          bgcolor: '#ffffff',
          border: '1px solid',
          borderColor: 'divider',
          // 讓 banner 與下方內容銜接更柔和
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <Box
          component="img"
          src="/images/branding/imsa-banner.png"
          alt="台大資管系學會"
          onError={(e) => {
            // 圖片不存在時以漸層底 + 文字 fallback，不會破版
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement.classList.add('banner-fallback');
          }}
          sx={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxHeight: { xs: 200, sm: 280, md: 360 },
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Banner 缺失時的 fallback */}
        <Box
          className="banner-fallback-content"
          sx={{
            display: 'none',
            '.banner-fallback &': {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: { xs: 160, md: 220 },
              background:
                'linear-gradient(135deg, #1976d2 0%, #0891b2 100%)',
              color: '#fff',
              p: 4,
              textAlign: 'center',
            },
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {APP_CONFIG.name}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {APP_CONFIG.englishName}
          </Typography>
        </Box>
      </Box>

      {/* 描述文字 */}
      {aboutSummary.description && (
        <Box sx={{ textAlign: 'center', mb: 5, px: { xs: 1, md: 2 } }}>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 720, mx: 'auto', lineHeight: 1.8 }}
          >
            {aboutSummary.description}
          </Typography>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="幹部團隊" />
          <Tab label="聯絡我們" />
        </Tabs>
      </Box>

      {/* Tab 0 */}
      {activeTab === 0 && (
        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', letterSpacing: '0.12em', mb: 1.5 }}
          >
            核心幹部
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
                    <Avatar
                      src={member.avatar}
                      sx={{ width: 96, height: 96, mx: 'auto', mb: 1.5, fontSize: 28, bgcolor: 'primary.main' }}
                    >
                      {!member.avatar && member.name.charAt(0)}
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
            各部部長
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
                      {!member.avatar && member.name.charAt(0)}
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
                    電子郵件
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
                    系辦地點
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    管理學院一號館 7 樓 資訊管理學系辦公室
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
