import React, { useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Stack,
  Divider,
  Link,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import calendarData from '../../resources/data/ntuCalendar.json';

const CALENDAR_URL =
  'https://mail.ntu.edu.tw/owa/calendar/231111d435d54d41908fa9c59d0812a3@ntu.edu.tw/4576890d12e040bab4ab864c413aa2be12994112486015644960/calendar.html';

const WEEKDAY_TC = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_TC = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// 撕日曆風格的「今日」方塊 — 紅色封頭 + binding rings + 大號日期
const TodayTile = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();
  const weekday = today.getDay();
  const year = today.getFullYear();
  const isRedDay = weekday === 0 || weekday === 6;

  return (
    <Box
      sx={{
        width: 168,
        position: 'relative',
        perspective: '800px',
        '&:hover .ntu-cal-tile': {
          transform: 'translateY(-3px) rotateX(-3deg)',
          boxShadow:
            '0 14px 28px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.06)',
        },
      }}
    >
      <Box
        className="ntu-cal-tile"
        sx={{
          borderRadius: 1.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#ffffff',
          boxShadow:
            '0 6px 16px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
          transformStyle: 'preserve-3d',
          transformOrigin: 'top center',
          transition:
            'transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 320ms ease',
          position: 'relative',
        }}
      >
        {/* Binding rings */}
        <Box
          sx={{
            position: 'absolute',
            top: -6,
            left: '28%',
            width: 6,
            height: 14,
            borderRadius: 3,
            bgcolor: '#94a3b8',
            boxShadow: '0 1px 1px rgba(0,0,0,0.15)',
            zIndex: 1,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: -6,
            right: '28%',
            width: 6,
            height: 14,
            borderRadius: 3,
            bgcolor: '#94a3b8',
            boxShadow: '0 1px 1px rgba(0,0,0,0.15)',
            zIndex: 1,
          }}
        />

        {/* Top red strip — month label */}
        <Box
          sx={{
            bgcolor: '#dc2626',
            color: '#fff',
            py: 0.75,
            textAlign: 'center',
            backgroundImage:
              'linear-gradient(180deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.18em',
              fontSize: '0.78rem',
            }}
          >
            {MONTH_TC[month]}月　{String(month + 1).padStart(2, '0')}
          </Typography>
        </Box>

        {/* Body — day number */}
        <Box
          sx={{
            py: 2,
            px: 1,
            textAlign: 'center',
            background:
              'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
          }}
        >
          <Typography
            sx={{
              fontSize: '4.25rem',
              fontWeight: 800,
              lineHeight: 1,
              color: isRedDay ? '#dc2626' : 'text.primary',
              letterSpacing: '-0.04em',
              fontFamily: '"Inter", "Noto Sans TC", sans-serif',
            }}
          >
            {day}
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: isRedDay ? '#dc2626' : 'text.secondary',
            }}
          >
            星期{WEEKDAY_TC[weekday]}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.25,
              color: 'text.disabled',
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
            }}
          >
            {year}　{year - 1911} 學年度
          </Typography>
        </Box>

        {/* Tear-off perforated edge */}
        <Box
          sx={{
            height: 6,
            background:
              'repeating-linear-gradient(90deg, transparent 0 4px, rgba(15,23,42,0.06) 4px 5px)',
            borderTop: '1px dashed',
            borderColor: 'rgba(15,23,42,0.08)',
          }}
        />
      </Box>
    </Box>
  );
};

const EventRow = ({ event }) => {
  const d = new Date(event.date);
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const weekday = WEEKDAY_TC[d.getDay()];
  const isHoliday = event.kind === 'holiday';
  const isHighlight = event.kind === 'highlight';
  const dateColor = isHoliday
    ? '#dc2626'
    : isHighlight
    ? 'primary.main'
    : 'text.primary';

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      sx={{
        px: 2,
        py: 1.25,
        transition: 'background-color 120ms ease',
        '&:hover': { bgcolor: 'grey.50' },
      }}
    >
      <Box sx={{ minWidth: 48, textAlign: 'center', flexShrink: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: dateColor,
            lineHeight: 1.15,
            fontSize: '0.95rem',
          }}
        >
          {md}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: '0.68rem' }}
        >
          週{weekday}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          lineHeight: 1.5,
          color: 'text.primary',
        }}
      >
        {event.title}
      </Typography>
    </Stack>
  );
};

const NTUCalendar = ({ limit = 5 }) => {
  const upcoming = useMemo(() => {
    const today = startOfToday();
    return (calendarData.events || [])
      .filter((e) => new Date(e.date) >= today)
      .slice(0, limit);
  }, [limit]);

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <CalendarIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
            台大行事曆
          </Typography>
        </Stack>
        <Link
          href={CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'primary.main',
            fontWeight: 500,
          }}
        >
          完整行事曆
          <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Link>
      </Stack>

      <Card>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', md: 'block' } }}
            />
          }
        >
          {/* 撕日曆 today tile */}
          <Box
            sx={{
              px: 3,
              py: { xs: 3, md: 3.5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider',
              bgcolor: 'grey.50',
              minWidth: { md: 220 },
            }}
          >
            <TodayTile />
            <Typography variant="caption" color="text.secondary">
              今日
            </Typography>
          </Box>

          {/* 近期事項列表 */}
          <Box sx={{ flex: 1, py: 1 }}>
            {upcoming.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  近期沒有重要事項
                </Typography>
              </Box>
            ) : (
              <>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{
                    px: 2,
                    pt: 1,
                    pb: 0.5,
                    display: 'block',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                  }}
                >
                  近期事項
                </Typography>
                <Stack divider={<Divider flexItem />}>
                  {upcoming.map((event, idx) => (
                    <EventRow key={`${event.date}-${idx}`} event={event} />
                  ))}
                </Stack>
              </>
            )}
          </Box>
        </Stack>
      </Card>

      {calendarData.updatedAt && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', textAlign: 'right', mt: 1 }}
        >
          更新時間：
          {new Date(calendarData.updatedAt).toLocaleString('zh-TW', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      )}
    </Box>
  );
};

export default NTUCalendar;
