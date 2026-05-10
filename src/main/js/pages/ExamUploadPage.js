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

// 一目了然的數字統計
const QUICK_STATS = [
  {
    icon: TimeIcon,
    value: '5 年內',
    label: '可上傳範圍',
    hint: '以 114-1 為例：認可 110~114',
    accent: '#1976d2',
  },
  {
    icon: BoxIcon,
    value: '4 份 / 次',
    label: '審核單位',
    hint: '累積 4 份才會發放回饋',
    accent: '#0891b2',
  },
  {
    icon: TrophyIcon,
    value: 'NT$ 250',
    label: '每次回饋',
    hint: '通過審核即可獲得',
    accent: '#059669',
  },
  {
    icon: AssignmentIcon,
    value: '32 份 / $2000',
    label: '個人上限',
    hint: '累積達上限後不再發放',
    accent: '#d97706',
  },
];

// 可上傳類別
const CATEGORIES = [
  {
    icon: QuizIcon,
    accent: '#0891b2',
    title: '考古題',
    desc: '限課程（必修 / 選修 / 通識）之期中 / 期末考',
    bullets: [
      '原始考題電子檔或題目掃描為主',
      '整理後以 PDF 上傳',
      '清晰且可辨識文字',
      '微積分例外：僅收小考考古題',
    ],
  },
  {
    icon: DescriptionIcon,
    accent: '#059669',
    title: '大抄',
    desc: '修課重點整理，幫助同學複習',
    bullets: [
      '不限手寫或打字',
      '整理後以 PDF 上傳',
      '清晰整齊且可辨識文字',
      '由學術部審核是否錄用',
    ],
  },
];

// 流程
const STEPS = [
  {
    label: '檢視已上傳清單',
    desc: '為避免重複上傳，先到 Google Sheet 確認檔案是否已存在',
  },
  {
    label: '填寫表單上傳檔案',
    desc: '使用 @ntu.edu.tw 信箱，依命名規則上傳 PDF',
  },
  {
    label: '等待學術部審核',
    desc: '累積達 4 份且通過審核，學術部會統一通知並發放獎勵',
  },
];

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
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);

  // 未登入：請先登入
  if (!isAuthenticated) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <UploadIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          請先登入
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          登入後即可上傳考古題與大抄
        </Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>
          前往登入
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
              label="114-1 起適用"
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
            上傳考古題
          </Typography>
          <Typography variant="body1" color="text.secondary">
            哈囉 {user?.fullName || user?.username}，貢獻考古題或大抄，幫助學弟妹也賺取回饋
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MenuBookIcon />}
            onClick={() => setRulesOpen(true)}
          >
            查看完整規範
          </Button>
        </Stack>
      </Stack>

      {/* Quick stats */}
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        {QUICK_STATS.map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Categories */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 2.5 }}>
          可上傳項目
        </Typography>
        <Grid container spacing={2.5}>
          {CATEGORIES.map((c) => (
            <Grid item xs={12} md={6} key={c.title}>
              <CategoryCard {...c} />
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
        <AlertTitle sx={{ fontWeight: 700, mb: 1 }}>上傳前請注意</AlertTitle>
        <Stack spacing={0.75}>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <strong>五年內</strong>：含當前學期往前推（114-1 認可 110~114）。超過範圍不計入回饋。
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <strong>解答規範</strong>：若有解答請一併附上，但<strong>請勿自行撰寫答案</strong>（若確定滿分例外）。
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <strong>檔案命名</strong>：
            <Box
              component="code"
              sx={{
                ml: 0.5,
                px: 0.75,
                py: 0.25,
                bgcolor: 'rgba(15, 23, 42, 0.06)',
                borderRadius: 0.5,
                fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                fontSize: '0.85em',
              }}
            >
              年份_學期_科目名_考試類別
            </Box>
            （例：112-1_程式設計_期末.pdf）
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            <strong>未依命名格式者，不做計算</strong>。若考題與答案分開，請分成兩個檔案上傳。
          </Typography>
        </Stack>
      </Alert>

      {/* Process steps */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 2.5 }}>
          上傳流程
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
              {STEPS.map((s) => (
                <Step key={s.label}>
                  <StepLabel>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                      {s.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                      {s.desc}
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
                檢視已上傳清單（Google Sheet）
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
            上傳表單
          </Typography>
          <Button
            size="small"
            startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            href={GOOGLE_FORM_OPEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main' }}
          >
            在新分頁開啟
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
                title="資管考古上傳表單"
                loading="lazy"
                style={{
                  width: '100%',
                  height: 720,
                  border: 0,
                  display: 'block',
                }}
              >
                載入中…
              </iframe>
            </Box>
          </Box>
        </Card>

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
        >
          填寫過程可在表單內滾動；若內容過長或顯示異常，請點右上角「在新分頁開啟」。
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
                資管系考古上傳規範
              </Typography>
              <Typography variant="caption" color="text.secondary">
                114-1 起適用
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
                一、可上傳<Box component="span" sx={{ color: '#dc2626' }}>五年內</Box>之
              </Typography>
              <Stack spacing={1} sx={{ pl: 0.5 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  ・<strong>考古題 / 大抄</strong>：限課程（必修 / 選修 / 通識）之
                  <Box component="span" sx={{ color: '#dc2626', fontWeight: 700 }}>
                    期中 / 期末考
                  </Box>
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  ・<strong>微積分</strong>：僅限上傳
                  <Box component="span" sx={{ color: '#dc2626', fontWeight: 700 }}>
                    小考
                  </Box>
                  考古題
                </Typography>
              </Stack>
            </Box>

            {/* 二、五年範圍 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                二、五年內 = <Box component="span" sx={{ color: '#dc2626' }}>含當前學期</Box>往前推五年
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
                    例子一 ✌
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                    現在 114-1（認可 110~114 之考古），融融上傳 111~114 年的統計學考古共 4 份
                    → 通過審核，拿到回饋獎勵 <strong>NT$ 250</strong>
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
                    例子二 ✗
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                    現在 114-1，某同學上傳 1993~1996 年的資結考古共 4 份 → 因
                    <strong>超過規定時間</strong>，拿不到回饋獎勵
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* 三、注意事項與獎勵 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                三、注意事項與獎勵
              </Typography>
              <Stack spacing={1} sx={{ pl: 0.5 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  ・<strong>解答規範</strong>：若有解答請一併附上；
                  <Box component="span" sx={{ color: '#dc2626' }}>
                    請勿自行撰寫答案
                  </Box>
                  （若確定滿分例外）
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  ・<strong>回饋獎勵</strong>：每次上傳
                  <strong>4 份考古題 / 大抄</strong>（不含系訂必修），待審核通過即可獲得
                  <strong> NT$ 250 </strong>獎勵
                </Typography>
              </Stack>
            </Box>

            {/* 四、上限 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                四、上傳份數 / 回饋上限 ⚠
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7, pl: 0.5, mb: 1 }}>
                為了讓每位同學都有公平繳交考古題的機會，每位同學在累積繳交滿{' '}
                <Box component="span" sx={{ color: '#dc2626', fontWeight: 700 }}>
                  32 份
                </Box>{' '}
                並獲得{' '}
                <Box component="span" sx={{ color: '#dc2626', fontWeight: 700 }}>
                  NT$ 2000
                </Box>{' '}
                獎金後，將不再繼續發放獎金。
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
                  例子
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  吱吱上傳 110~114 年共 99 份考古 + 課程評價 → 雖通過審核，但因回饋獎勵
                  <strong>上限僅能拿到 NT$ 2000</strong>
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* 五、上傳格式 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                五、上傳格式
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0891b2', mb: 0.5 }}>
                    考古題
                  </Typography>
                  <Stack spacing={0.5} sx={{ pl: 0.5 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      ・<strong>形式</strong>：原始考題電子檔及題目掃描為主，整理後以 PDF 上傳
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      ・<strong>要求</strong>：清晰且可辨識文字
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#059669', mb: 0.5 }}>
                    大抄
                  </Typography>
                  <Stack spacing={0.5} sx={{ pl: 0.5 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      ・<strong>形式</strong>：不限手寫或打字，整理後以 PDF 上傳
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      ・<strong>要求</strong>：清晰整齊且可辨識文字，有助同學複習考試（學術部會再審核）
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* 六、上傳流程 */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                六、上傳流程
              </Typography>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                    1. 檢視已上傳之考古
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pl: 1.5 }}>
                    為避免重複上傳，請先點擊上方流程區的「檢視已上傳清單」按鈕，至 Google Sheet 確認
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                    2. 填寫表單
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pl: 1.5 }}>
                    使用台大信箱（@ntu.edu.tw）填寫；檔案命名：
                    <Box
                      component="code"
                      sx={{
                        ml: 0.5,
                        px: 0.75,
                        py: 0.25,
                        bgcolor: 'rgba(15, 23, 42, 0.06)',
                        borderRadius: 0.5,
                        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                        fontSize: '0.85em',
                      }}
                    >
                      年份_學期_科目名_考試類別
                    </Box>
                    （例：112-1_程式設計_期末.pdf）。
                    <Box component="span" sx={{ color: '#dc2626' }}>
                      未依命名格式者不做計算
                    </Box>
                    ；若考題與答案分開，請分成兩個檔案上傳
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                    3. 等待審核
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pl: 1.5 }}>
                    待審核通過 & 累積達 4 份後，學術部將於統一時間通知並發放回饋獎勵
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
