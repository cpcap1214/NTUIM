import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Avatar,
  Paper,
  Divider,
  Button,
  Chip,
  Tab,
  Tabs,
  IconButton,
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

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
            關於我們
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 3 }}>
            {APP_CONFIG.fullName}
          </Typography>
          {aboutSummary.description && (
            <Typography variant="body1" sx={{ fontSize: '1.1rem', maxWidth: '800px', mx: 'auto', lineHeight: 1.7 }}>
              {aboutSummary.description}
            </Typography>
          )}
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="幹部團隊" />
            <Tab label="聯絡我們" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box>
          {/* Tab 0: 幹部團隊 */}
          {activeTab === 0 && (
            <Box>
              {/* 會長與副會長 */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textAlign: 'center', color: 'primary.main' }}>
                核心幹部
              </Typography>
              <Grid container spacing={4} justifyContent="center" sx={{ mb: 6 }}>
                {staffMembers.filter(member => member.position.includes('會長')).map((member) => (
                  <Grid item xs={6} sm={4} md={3} key={member.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        transition: 'all 0.2s ease-in-out',
                        border: '2px solid',
                        borderColor: 'primary.light',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Avatar
                          src={member.avatar}
                          sx={{ 
                            width: 120, 
                            height: 120, 
                            mx: 'auto', 
                            mb: 2,
                            fontSize: 32,
                            bgcolor: 'primary.main'
                          }}
                        >
                          {!member.avatar && member.name.charAt(0)}
                        </Avatar>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                          {member.name}
                        </Typography>
                        <Chip 
                          label={member.position} 
                          color="primary" 
                          sx={{ fontSize: '0.9rem', px: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* 部長群 */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textAlign: 'center', color: 'primary.main' }}>
                各部部長
              </Typography>
              
              {/* 第一行：前4位部長 */}
              <Grid container spacing={3} justifyContent="center" sx={{ mb: 3 }}>
                {staffMembers.filter(member => member.position.includes('部長') && !member.position.includes('會長')).slice(0, 4).map((member) => (
                  <Grid item xs={6} sm={4} md={3} key={member.id}>
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
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Avatar
                          src={member.avatar}
                          sx={{ 
                            width: 100, 
                            height: 100, 
                            mx: 'auto', 
                            mb: 2,
                            fontSize: 28,
                            bgcolor: 'secondary.main'
                          }}
                        >
                          {!member.avatar && member.name.charAt(0)}
                        </Avatar>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          {member.name}
                        </Typography>
                        <Chip 
                          label={member.position} 
                          color="secondary" 
                          size="small"
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {/* 第二行：後2位部長 */}
              <Grid container spacing={3} justifyContent="center">
                {staffMembers.filter(member => member.position.includes('部長') && !member.position.includes('會長')).slice(4, 6).map((member) => (
                  <Grid item xs={6} sm={4} md={3} key={member.id}>
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
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Avatar
                          src={member.avatar}
                          sx={{ 
                            width: 100, 
                            height: 100, 
                            mx: 'auto', 
                            mb: 2,
                            fontSize: 28,
                            bgcolor: 'secondary.main'
                          }}
                        >
                          {!member.avatar && member.name.charAt(0)}
                        </Avatar>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          {member.name}
                        </Typography>
                        <Chip 
                          label={member.position} 
                          color="secondary" 
                          size="small"
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Tab 1: 聯絡我們 */}
          {activeTab === 1 && (
            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, textAlign: 'center', mb: 4 }}>
                聯絡資訊
              </Typography>
              <Paper sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <EmailIcon sx={{ mr: 3, color: 'primary.main', fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      電子郵件
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      imsa@ntu.im
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <LocationIcon sx={{ mr: 3, color: 'primary.main', fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      系辦地點
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      管理學院一號館7樓 資訊管理學系辦公室
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 4 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
                  社群媒體
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <IconButton 
                    color="primary" 
                    href="https://www.facebook.com/NTUIMSA"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: 40 }}
                  >
                    <FacebookIcon sx={{ fontSize: 32 }} />
                  </IconButton>
                  <IconButton 
                    color="primary" 
                    href="https://www.instagram.com/ntu.imsa"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: 40 }}
                  >
                    <InstagramIcon sx={{ fontSize: 32 }} />
                  </IconButton>
                  <IconButton 
                    color="primary" 
                    href="https://github.com/ntu-im-sa"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: 40 }}
                  >
                    <GitHubIcon sx={{ fontSize: 32 }} />
                  </IconButton>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default AboutUsPage;