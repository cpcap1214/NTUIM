import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Stack,
  Link,
  IconButton,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  OpenInNew as OpenInNewIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import calendarData from '../../resources/data/ntuCalendar.json';

const CALENDAR_URL =
  'https://mail.ntu.edu.tw/owa/calendar/231111d435d54d41908fa9c59d0812a3@ntu.edu.tw/4576890d12e040bab4ab864c413aa2be12994112486015644960/calendar.html';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const CRITICAL_RED = '#dc2626';

const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// 同一天可能多個事件，取「最高優先級」決定月曆上的點顏色
const KIND_PRIORITY = { critical: 3, highlight: 2, holiday: 1, normal: 0 };
const pickTopKind = (events) =>
  events.reduce(
    (top, e) =>
      (KIND_PRIORITY[e.kind] || 0) > (KIND_PRIORITY[top] || 0) ? e.kind : top,
    'normal'
  );

const dotColorFor = (kind) => {
  if (kind === 'critical') return CRITICAL_RED;
  if (kind === 'highlight') return '#1976d2';
  if (kind === 'holiday') return '#94a3b8';
  return '#cbd5e1';
};

const NTUCalendar = ({ upcomingLimit = 7 }) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewDate, setViewDate] = useState(today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // ISO date → events[]
  const eventsByDate = useMemo(() => {
    const m = {};
    for (const e of calendarData.events || []) {
      (m[e.date] = m[e.date] || []).push(e);
    }
    return m;
  }, []);

  // 月份格子
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const startDate = new Date(year, month, 1 - startWeekday);
    const list = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = toISO(d);
      const dayEvents = eventsByDate[iso] || [];
      list.push({
        iso,
        day: d.getDate(),
        weekday: d.getDay(),
        isOtherMonth: d.getMonth() !== month,
        isToday: d.getTime() === today.getTime(),
        topKind: dayEvents.length > 0 ? pickTopKind(dayEvents) : null,
      });
    }
    return list;
  }, [year, month, today, eventsByDate]);

  // 近期事項（依 kind 排序，重要的優先；同 kind 依日期）
  const upcoming = useMemo(() => {
    const todayISO = toISO(today);
    return (calendarData.events || [])
      .filter((e) => e.date >= todayISO)
      .slice(0, upcomingLimit);
  }, [today, upcomingLimit]);

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <Box>
      {/* 區塊標題 */}
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* 左：簡單月曆 — flex 比例 1（黃金比例 1 : 1.618） */}
          <Box
            sx={{
              flex: { md: '1 1 0' },
              minWidth: 0,
              p: { xs: 2, sm: 2.5 },
              borderRight: { md: '1px solid rgba(15, 23, 42, 0.04)' },
              borderBottom: { xs: '1px solid rgba(15, 23, 42, 0.04)', md: 'none' },
            }}
          >
            {/* 月份切換 */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <IconButton size="small" onClick={goPrev} aria-label="上個月">
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {year} 年 {month + 1} 月
              </Typography>
              <IconButton size="small" onClick={goNext} aria-label="下個月">
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>

            {/* 星期表頭 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                mb: 0.5,
              }}
            >
              {WEEKDAYS.map((w, i) => (
                <Typography
                  key={w}
                  variant="caption"
                  sx={{
                    textAlign: 'center',
                    fontWeight: 600,
                    color: i === 0 || i === 6 ? CRITICAL_RED : 'text.secondary',
                    py: 0.5,
                  }}
                >
                  {w}
                </Typography>
              ))}
            </Box>

            {/* 日期格子 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.25,
              }}
            >
              {cells.map((cell) => {
                const isWeekend = cell.weekday === 0 || cell.weekday === 6;
                const isCriticalDay = cell.topKind === 'critical';

                const baseColor = cell.isOtherMonth
                  ? 'text.disabled'
                  : isCriticalDay
                  ? CRITICAL_RED
                  : isWeekend
                  ? CRITICAL_RED
                  : 'text.primary';

                return (
                  <Box
                    key={cell.iso}
                    sx={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      bgcolor: cell.isToday
                        ? 'primary.main'
                        : isCriticalDay && !cell.isOtherMonth
                        ? 'rgba(220, 38, 38, 0.08)'
                        : 'transparent',
                      color: cell.isToday ? 'primary.contrastText' : baseColor,
                      fontWeight: cell.isToday || isCriticalDay ? 700 : 500,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 'inherit',
                        color: 'inherit',
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      }}
                    >
                      {cell.day}
                    </Typography>
                    {cell.topKind && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          width: cell.topKind === 'critical' ? 5 : 4,
                          height: cell.topKind === 'critical' ? 5 : 4,
                          borderRadius: '50%',
                          bgcolor: cell.isToday
                            ? 'primary.contrastText'
                            : dotColorFor(cell.topKind),
                          opacity: cell.isOtherMonth ? 0.4 : 1,
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* 圖例 */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(15,23,42,0.04)' }}
              alignItems="center"
              justifyContent="center"
              flexWrap="wrap"
              useFlexGap
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: CRITICAL_RED }} />
                <Typography variant="caption" color="text.secondary">
                  重要
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1976d2' }} />
                <Typography variant="caption" color="text.secondary">
                  學期事件
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                <Typography variant="caption" color="text.secondary">
                  放假
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* 右：近期重要行程 — flex 1.618 */}
          <Box
            sx={{
              flex: { md: '1.618 1 0' },
              minWidth: 0,
              p: { xs: 2, sm: 2.5 },
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 1,
                fontWeight: 600,
                letterSpacing: '0.1em',
              }}
            >
              近期行程
            </Typography>
            {upcoming.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 4, textAlign: 'center' }}
              >
                近期沒有重要事項
              </Typography>
            ) : (
              <Stack sx={{ mt: 0.5 }}>
                {upcoming.map((event, idx) => {
                  const d = new Date(event.date);
                  const md = `${d.getMonth() + 1}/${d.getDate()}`;
                  const weekday = WEEKDAYS[d.getDay()];
                  const isCritical = event.kind === 'critical';
                  const isHoliday = event.kind === 'holiday';
                  const isHighlight = event.kind === 'highlight';

                  const dateColor = isCritical || isHoliday
                    ? CRITICAL_RED
                    : isHighlight
                    ? 'primary.main'
                    : 'text.secondary';

                  const titleColor = isCritical
                    ? CRITICAL_RED
                    : 'text.primary';

                  return (
                    <Stack
                      key={`${event.date}-${idx}`}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                      sx={{
                        py: 1,
                        borderRadius: 1,
                        transition: 'background-color 120ms ease',
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                    >
                      <Box sx={{ minWidth: 52, flexShrink: 0, pt: 0.25 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: dateColor,
                            fontSize: '0.875rem',
                            lineHeight: 1.2,
                          }}
                        >
                          {md}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '0.7rem' }}
                        >
                          週{weekday}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          flex: 1,
                          lineHeight: 1.55,
                          fontWeight: isCritical ? 600 : 500,
                          color: titleColor,
                        }}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default NTUCalendar;
