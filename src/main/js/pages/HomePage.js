import React from 'react';
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
  Divider,
  Paper,
} from '@mui/material';
import {
  RateReview as ReviewIcon,
  Quiz as QuizIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingIcon,
  People as PeopleIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { announcements, quickLinks, aboutSummary } from '../../resources/data/mockData';
import { APP_CONFIG } from '../../resources/config/constants';

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

  const recentAnnouncements = announcements.slice(0, 3);

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
        <Grid item xs={12} md={8}>
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

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* About Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
              關於我們
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              {aboutSummary.description}
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                主要任務：
              </Typography>
              {aboutSummary.mission.map((item, index) => (
                <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • {item}
                </Typography>
              ))}
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                  <PeopleIcon sx={{ fontSize: 20, mr: 0.5, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {aboutSummary.currentMembers}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  現任幹部
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                  <SchoolIcon sx={{ fontSize: 20, mr: 0.5, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {new Date().getFullYear() - aboutSummary.establishedYear}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  服務年數
                </Typography>
              </Box>
            </Box>
            
            <Button 
              variant="contained" 
              fullWidth 
              onClick={() => navigate('/about')}
              sx={{ mt: 2 }}
            >
              了解更多
            </Button>
          </Paper>

          {/* Statistics */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
              平台數據
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ReviewIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">課程評價</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>156</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <QuizIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">考古題檔案</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>324</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">學習大抄</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>89</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">本月下載數</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>1,247</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HomePage;