import React from 'react';
import { Box, Typography, Paper, Stack, Chip, Divider } from '@mui/material';
import { APP_CONFIG } from '../../resources/config/constants';

const CATEGORY_META = {
  新功能: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  優化: { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.1)' },
  修復: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)' },
  變更: { color: '#475569', bg: 'rgba(71, 85, 105, 0.08)' },
};

const CHANGELOG = [
  {
    version: '1.6.7',
    date: '2026-05-10',
    title: '上傳考古、行事曆、品牌調校',
    highlights: [
      '新增考古題上傳頁，含規則說明與表單嵌入',
      '首頁加入台大行事曆，可點日期同步滾動近期行程',
      '系學會 logo 串入 Header，關於我們 hero 重設計',
    ],
    changes: {
      新功能: [
        { text: '考古題上傳頁（/upload-exam）：規則卡、流程 stepper、Google Form 嵌入' },
        { text: '台大行事曆：月份切換、可滾動近期行程、點日期同步滾到對應事項' },
        { text: '考古題庫排序：最新上傳 / 下載次數 / 課程名稱' },
      ],
      優化: [
        { text: '關於我們頁：左 logo + 右標題的 hero 排版' },
        { text: 'Header 加入系學會方形 logo' },
        { text: 'Google Workspace 按鈕：四色 G logo + 字樣' },
        { text: 'Tab hover 滑順化（移除 reflow）' },
        { text: '行事曆顏色：假日紅字、重要截止紅圈不撞色' },
        { text: '用戶下拉選單瘦身、表單嵌入版面修正' },
      ],
      修復: [{ text: '手機右上頭像點不開' }],
    },
  },
  {
    version: '1.6.0',
    date: '2026-05-10',
    title: '前端介面重構',
    highlights: [
      '全站視覺語言重新調校，更簡潔明瞭',
      '導覽列改為 sticky 毛玻璃',
      '首頁新增情境式 Banner、版本紀錄頁',
    ],
    changes: {
      新功能: [
        { text: '版本紀錄頁' },
        { text: '首頁情境式 Banner（依登入與繳費狀態切換）' },
      ],
      優化: [
        { text: '主題系統：配色、陰影、字體節奏統一' },
        { text: '考古題、大抄頁的搜尋篩選與卡片排版' },
        { text: '登入、註冊、付費牆視覺與整站對齊' },
      ],
    },
  },
  {
    version: '1.5.0',
    date: '2026-03-14',
    title: '自動審核 + 上傳體驗',
    changes: {
      新功能: [{ text: '繳費資格自動審核' }],
      優化: [{ text: '考古題上傳流程' }],
      修復: [{ text: '管理員後台與權限判斷' }],
    },
  },
  {
    version: '1.4.0',
    date: '2025-09-24',
    title: '行動端與審核機制',
    changes: {
      新功能: [{ text: '繳費審核機制說明' }],
      修復: [{ text: '手機版登入' }],
    },
  },
  {
    version: '1.3.0',
    date: '2025-09-16',
    title: '安全性與導覽強化',
    changes: {
      新功能: [
        { text: '漢堡選單加入登入按鈕' },
        { text: '敏感目錄存取保護' },
      ],
      變更: [{ text: '繳費方式更新' }],
    },
  },
  {
    version: '1.2.0',
    date: '2025-09-02',
    title: '中文檔名修正',
    changes: {
      新功能: [{ text: '考古題與大抄編輯功能' }],
      修復: [{ text: '中文檔名上傳、下載、編碼問題' }],
    },
  },
  {
    version: '1.1.0',
    date: '2025-08-31',
    title: '管理後台與 PDF 預覽',
    changes: {
      新功能: [
        { text: '考古題雙檔案系統（題目 + 答案）' },
        { text: 'PDF 預覽、使用者頭像' },
      ],
      變更: [{ text: '系學會費調整為 NT$2,000 / 四年' }],
    },
  },
  {
    version: '1.0.0',
    date: '2025-08-30',
    title: '正式上線',
    highlights: [
      '資料庫整合 + 上傳功能',
      '付費牆與後台管理',
      '考古題庫支援民國紀年',
    ],
    changes: {
      新功能: [
        { text: '付費牆與會員制' },
        { text: '考古題庫、大抄管理' },
        { text: '部署配置' },
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2025-08-19',
    title: '會員系統',
    changes: {
      新功能: [{ text: '登入註冊與資料儲存' }],
    },
  },
  {
    version: '0.1.0',
    date: '2025-08-03',
    title: '初版',
    changes: {
      新功能: [{ text: '網站初版上線' }],
    },
  },
];

const ChangelogPage = () => {
  const totalReleases = CHANGELOG.length;
  const firstDate = CHANGELOG[CHANGELOG.length - 1].date;
  const latestDate = CHANGELOG[0].date;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          版本紀錄
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalReleases} 個版本 · {firstDate} 起持續更新至 {latestDate}
        </Typography>
      </Box>

      {/* Timeline */}
      <Box sx={{ position: 'relative' }}>
        {/* Vertical line */}
        <Box
          sx={{
            position: 'absolute',
            left: { xs: 7, sm: 11 },
            top: 8,
            bottom: 8,
            width: 2,
            bgcolor: 'divider',
            display: { xs: 'none', sm: 'block' },
          }}
        />

        <Stack spacing={3}>
          {CHANGELOG.map((release, idx) => {
            const isLatest = idx === 0;
            return (
              <Box
                key={release.version}
                sx={{ position: 'relative', pl: { xs: 0, sm: 5 } }}
              >
                {/* Timeline dot */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 18,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '3px solid',
                    borderColor: isLatest ? 'primary.main' : 'background.default',
                    bgcolor: isLatest ? 'primary.main' : 'grey.300',
                    boxShadow: isLatest ? '0 0 0 4px rgba(25, 118, 210, 0.15)' : 'none',
                    display: { xs: 'none', sm: 'block' },
                  }}
                />

                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderColor: isLatest ? 'primary.light' : 'divider',
                    borderWidth: isLatest ? '1.5px' : '1px',
                    bgcolor: 'background.paper',
                  }}
                >
                  {/* Version header */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ sm: 'center' }}
                    spacing={1.5}
                    sx={{ mb: 1.5 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="h4"
                        component="h2"
                        sx={{ fontWeight: 700, color: isLatest ? 'primary.main' : 'text.primary' }}
                      >
                        v{release.version}
                      </Typography>
                      {isLatest && (
                        <Chip
                          label="最新"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {release.date}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 500, color: 'text.secondary' }}
                    >
                      {release.title}
                    </Typography>
                  </Stack>

                  {/* Highlights */}
                  {release.highlights && release.highlights.length > 0 && (
                    <Box
                      sx={{
                        mb: 2,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                      }}
                    >
                      <Stack spacing={0.5}>
                        {release.highlights.map((h, i) => (
                          <Typography key={i} variant="body2" sx={{ lineHeight: 1.6 }}>
                            <Box component="span" sx={{ color: 'primary.main', mr: 1 }}>
                              ▸
                            </Box>
                            {h}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Categorized changes */}
                  <Stack
                    spacing={1.5}
                    divider={<Divider flexItem sx={{ my: 0.5 }} />}
                  >
                    {Object.entries(release.changes).map(([category, items]) => {
                      const meta = CATEGORY_META[category] || CATEGORY_META.變更;
                      return (
                        <Box key={category}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                            <Chip
                              label={category}
                              size="small"
                              sx={{
                                bgcolor: meta.bg,
                                color: meta.color,
                                fontWeight: 600,
                                height: 20,
                                fontSize: '0.7rem',
                                border: 'none',
                              }}
                            />
                            <Typography variant="caption" color="text.disabled">
                              {items.length} 項
                            </Typography>
                          </Stack>
                          <Stack spacing={0.5} sx={{ pl: 0.5 }}>
                            {items.map((item, i) => (
                              <Stack
                                key={i}
                                direction="row"
                                spacing={1}
                                alignItems="baseline"
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    color: 'text.disabled',
                                    fontSize: '0.75rem',
                                    lineHeight: 1.5,
                                    flexShrink: 0,
                                  }}
                                >
                                  ·
                                </Box>
                                <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                                  {item.text}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Footer note */}
      <Box sx={{ mt: 5, py: 3, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.disabled">
          目前版本：v{APP_CONFIG.version}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChangelogPage;
