import { useTranslation, Trans } from 'react-i18next';
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  AlertTitle,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Description as DescriptionIcon,
  MenuBook as MenuBookIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  CloudUpload as UploadIcon,
  AccessTime as TimeIcon,
  EmojiEvents as TrophyIcon,
  Inventory2 as BoxIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_FORM_EMBED_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSekqRvdjYQSCRSEnChyq6uczb8K0NFcGMPY02oAutRn6eZu1A/viewform?embedded=true';

const GOOGLE_FORM_OPEN_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSekqRvdjYQSCRSEnChyq6uczb8K0NFcGMPY02oAutRn6eZu1A/viewform';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1iTkjNC3meJ4e0EhR9zWprI39XiA6xrlQmMqWIODcWSE/edit?gid=996157442#gid=996157442';

// 一目了然的數字統計。
// 這三個模組層常數只留結構（icon / accent / key），文案由 render 時用 t() 取——
// 理由同 constants.js 的 NAVIGATION_ITEMS：模組載入時 i18n 可能還沒好，
// 而且切換語言後模組層的陣列不會重算，畫面會卡在舊語言。
const QUICK_STATS = [
  { icon: TimeIcon, key: 'range', accent: '#1976d2' },
  { icon: BoxIcon, key: 'batch', accent: '#0891b2' },
  { icon: TrophyIcon, key: 'reward', accent: '#059669' },
  { icon: AssignmentIcon, key: 'cap', accent: '#d97706' },
];

// 可上傳類別
const CATEGORIES = [
  { icon: QuizIcon, accent: '#0891b2', key: 'exam' },
  { icon: DescriptionIcon, accent: '#059669', key: 'cheatSheet' },
];

// 流程
const STEPS = ['checkList', 'fillForm', 'awaitReview'];

const StatCard = ({ icon: Icon, value, label, hint, accent }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack spacing={1.25}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${accent}14`,
            color: accent,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, lineHeight: 1.2, color: accent }}
          >
            {value}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.5 }}>
            {hint}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const CategoryCard = ({ icon: Icon, accent, title, desc, bullets }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.75, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${accent}14`,
            color: accent,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 22 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
        {desc}
      </Typography>

      <Stack spacing={0.75} sx={{ mt: 'auto' }}>
        {bullets.map((b, i) => (
          <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: accent,
                flexShrink: 0,
                // 用 em 跟著字體 scale；對齊第一行文字視覺中心
                mt: '0.55em',
              }}
            />
            <Typography
              variant="body2"
              sx={{ lineHeight: 1.55, flex: 1, minWidth: 0 }}
            >
              {b}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </CardContent>
  </Card>
);

const ExamUploadPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);

  // 規範條文裡的行內標記。語言檔寫 <red>…</red> / <b>…</b>，
  // 由 <Trans> 對到實際樣式，譯者只要照抄標籤即可，不必碰 sx。
  const inlineMarks = {
    red: <Box component="span" sx={{ color: '#dc2626' }} />,
    redBold: <Box component="span" sx={{ color: '#dc2626', fontWeight: 700 }} />,
    b: <strong />,
  };


  // 未登入：請先登入
  if (!isAuthenticated) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <UploadIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('examUpload.loginRequired')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('examUpload.loginRequiredBody')}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>
          {t('examUpload.goToLogin')}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'flex-end' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Chip
              size="small"
              label={t('examUpload.effectiveFrom')}
              sx={{
                height: 22,
                fontSize: '0.72rem',
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: 'primary.main',
                fontWeight: 600,
              }}
            />
          </Stack>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('nav.uploadExam')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('examUpload.greeting', { name: user?.fullName || user?.username })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MenuBookIcon />}
            onClick={() => setRulesOpen(true)}
          >
            {t('examUpload.viewFullRules')}
          </Button>
        </Stack>
      </Stack>

      {/* Quick stats */}
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        {QUICK_STATS.map((s) => (
          <Grid item xs={6} md={3} key={s.key}>
            <StatCard
              icon={s.icon}
              accent={s.accent}
              value={t(`examUpload.stats.${s.key}.value`)}
              label={t(`examUpload.stats.${s.key}.label`)}
              hint={t(`examUpload.stats.${s.key}.hint`)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Categories */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 2.5 }}>
          {t('examUpload.eligibleItems')}
        </Typography>
        <Grid container spacing={2.5}>
          {CATEGORIES.map((c) => (
            <Grid item xs={12} md={6} key={c.key}>
              <CategoryCard
                icon={c.icon}
                accent={c.accent}
                title={t(`examUpload.categories.${c.key}.title`)}
                desc={t(`examUpload.categories.${c.key}.desc`)}
                bullets={t(`examUpload.categories.${c.key}.bullets`, { returnObjects: true })}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Important notes */}
      <Alert
        severity="info"
        icon={<AssignmentIcon />}
        sx={{
          mb: 5,
          borderRadius: 2,
          alignItems: 'flex-start',
          '& .MuiAlert-icon': { mt: 0.25 },
        }}
      >
        <AlertTitle sx={{ fontWeight: 700, mb: 1 }}>{t('examUpload.notice.title')}</AlertTitle>
        <Stack spacing={0.75}>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <Trans i18nKey="examUpload.notice.range" components={inlineMarks} />
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <Trans i18nKey="examUpload.notice.answers" components={inlineMarks} />
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <Trans
              i18nKey="examUpload.notice.naming"
              components={{
                ...inlineMarks,
                code: (
                  <Box
                    component="code"
                    sx={{
                      mx: 0.5,
                      px: 0.75,
                      py: 0.25,
                      bgcolor: 'rgba(15, 23, 42, 0.06)',
                      borderRadius: 0.5,
                      fontFamily: 'ui-monospace, Consolas, monospace',
                      fontSize: '0.85em',
                    }}
                  />
                ),
              }}
              values={{ pattern: t('examUpload.namingPattern') }}
            />
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <Trans i18nKey="examUpload.notice.namingWarning" components={inlineMarks} />
          </Typography>
        </Stack>
      </Alert>

      {/* Process steps */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 2.5 }}>
          {t('examUpload.processTitle')}
        </Typography>
        <Card>
          <CardContent sx={{ py: 3, px: { xs: 2, md: 4 } }}>
            <Stepper
              alternativeLabel
              activeStep={-1}
              sx={{
                '& .MuiStepConnector-line': {
                  borderTopWidth: 2,
                  borderColor: 'rgba(15, 23, 42, 0.08)',
                },
                '& .MuiStepIcon-root': {
                  color: 'rgba(15, 23, 42, 0.12)',
                },
              }}
            >
              {STEPS.map((stepKey) => (
                <Step key={stepKey}>
                  <StepLabel>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                      {t(`examUpload.steps.${stepKey}.label`)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                      {t(`examUpload.steps.${stepKey}.desc`)}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            <Divider sx={{ my: 2.5 }} />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              justifyContent="center"
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                href={SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('examUpload.viewSheetButton')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Embedded form */}
      <Box sx={{ mb: 4 }}>
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
            {t('examUpload.formTitle')}
          </Typography>
          <Button
            size="small"
            startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            href={GOOGLE_FORM_OPEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main' }}
          >
            {t('examUpload.openInNewTab')}
          </Button>
        </Stack>

        {/* 將表單放在帶柔和背景的容器中、寬度限制至 Google Form 自然尺寸並置中 */}
        <Card
          sx={{
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            '&:hover': { boxShadow: 'none', borderColor: 'divider' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: { xs: 1.5, md: 2 },
              px: { xs: 1, md: 2 },
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 760,
                bgcolor: 'background.paper',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
              }}
            >
              <iframe
                src={GOOGLE_FORM_EMBED_URL}
                title={t('examUpload.iframeTitle')}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 720,
                  border: 0,
                  display: 'block',
                }}
              >
                {t('common.loading')}
              </iframe>
            </Box>
          </Box>
        </Card>

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
        >
          {t('examUpload.formHint')}
        </Typography>
      </Box>

      {/* 完整規範 Dialog */}
      <Dialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {t('examUpload.rules.title')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('examUpload.effectiveFrom')}
              </Typography>
            </Box>
            <IconButton onClick={() => setRulesOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2.5, sm: 4 }, py: 3 }}>
          <Stack spacing={3.5}>
            {/* 一、可上傳項目 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                <Trans i18nKey="examUpload.rules.s1.title" components={inlineMarks} />
              </Typography>
              <Stack spacing={1} sx={{ pl: 0.5 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  <Trans i18nKey="examUpload.rules.s1.exams" components={inlineMarks} />
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  <Trans i18nKey="examUpload.rules.s1.calculus" components={inlineMarks} />
                </Typography>
              </Stack>
            </Box>

            {/* 二、五年範圍 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                <Trans i18nKey="examUpload.rules.s2.title" components={inlineMarks} />
              </Typography>
              <Stack spacing={1.5} sx={{ pl: 0.5 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderLeft: '3px solid #059669',
                    bgcolor: 'rgba(5, 150, 105, 0.06)',
                    borderRadius: '0 6px 6px 0',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669', mb: 0.25 }}>
                    {t('examUpload.rules.s2.example1Label')}
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                    <Trans i18nKey="examUpload.rules.s2.example1" components={inlineMarks} />
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderLeft: '3px solid #dc2626',
                    bgcolor: 'rgba(220, 38, 38, 0.06)',
                    borderRadius: '0 6px 6px 0',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626', mb: 0.25 }}>
                    {t('examUpload.rules.s2.example2Label')}
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                    <Trans i18nKey="examUpload.rules.s2.example2" components={inlineMarks} />
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* 三、注意事項與獎勵 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('examUpload.rules.s3.title')}
              </Typography>
              <Stack spacing={1} sx={{ pl: 0.5 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  <Trans i18nKey="examUpload.rules.s3.answers" components={inlineMarks} />
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  <Trans i18nKey="examUpload.rules.s3.reward" components={inlineMarks} />
                </Typography>
              </Stack>
            </Box>

            {/* 四、上限 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('examUpload.rules.s4.title')}
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7, pl: 0.5, mb: 1 }}>
                <Trans i18nKey="examUpload.rules.s4.body" components={inlineMarks} />
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  ml: 0.5,
                  borderLeft: '3px solid #d97706',
                  bgcolor: 'rgba(217, 119, 6, 0.06)',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400e', mb: 0.25 }}>
                  {t('examUpload.rules.s4.exampleLabel')}
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  <Trans i18nKey="examUpload.rules.s4.example" components={inlineMarks} />
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* 五、上傳格式 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('examUpload.rules.s5.title')}
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0891b2', mb: 0.5 }}>
                    {t('examUpload.categories.exam.title')}
                  </Typography>
                  <Stack spacing={0.5} sx={{ pl: 0.5 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      <Trans i18nKey="examUpload.rules.s5.examFormat" components={inlineMarks} />
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      <Trans i18nKey="examUpload.rules.s5.examQuality" components={inlineMarks} />
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#059669', mb: 0.5 }}>
                    {t('examUpload.categories.cheatSheet.title')}
                  </Typography>
                  <Stack spacing={0.5} sx={{ pl: 0.5 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      <Trans i18nKey="examUpload.rules.s5.cheatSheetFormat" components={inlineMarks} />
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      <Trans i18nKey="examUpload.rules.s5.cheatSheetQuality" components={inlineMarks} />
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* 六、上傳流程 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('examUpload.rules.s6.title')}
              </Typography>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                    {t('examUpload.rules.s6.step1Title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pl: 1.5 }}>
                    {t('examUpload.rules.s6.step1Body')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                    {t('examUpload.rules.s6.step2Title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pl: 1.5 }}>
                    <Trans
                      i18nKey="examUpload.rules.s6.step2Body"
                      components={{
                        ...inlineMarks,
                        code: (
                          <Box
                            component="code"
                            sx={{
                              mx: 0.5,
                              px: 0.75,
                              py: 0.25,
                              bgcolor: 'rgba(15, 23, 42, 0.06)',
                              borderRadius: 0.5,
                              fontFamily: 'ui-monospace, Consolas, monospace',
                              fontSize: '0.85em',
                            }}
                          />
                        ),
                      }}
                      values={{ pattern: t('examUpload.namingPattern') }}
                    />
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                    {t('examUpload.rules.s6.step3Title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pl: 1.5 }}>
                    {t('examUpload.rules.s6.step3Body')}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ExamUploadPage;
