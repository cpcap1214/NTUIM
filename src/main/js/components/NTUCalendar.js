import { useTranslation } from 'react-i18next';
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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

// 星期縮寫改由 i18n 提供（calendar.weekdays 是長度 7 的陣列）
const HOLIDAY_RED = '#dc2626'; // 國定假日 / 寒暑假 / 週末：傳統紅

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
  if (kind === 'holiday') return HOLIDAY_RED;
  if (kind === 'highlight') return '#1976d2';
  return '#94a3b8';
};

const NTUCalendar = () => {
  const { t } = useTranslation();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewDate, setViewDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(null); // 點月曆後存 ISO 字串

  // 滾動容器與每筆事項的 DOM 參考，用來實作「點日期 → 滾到對應事項」
  const scrollRef = useRef(null);
  const itemRefs = useRef({});

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // ISO date → events[]（給月曆格子標點）
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

  // 所有未來事項（執行時再 filter 一次今日之後，不限數量；過期不顯示）
  const upcoming = useMemo(() => {
    const todayISO = toISO(today);
    // 用 events（完整未來清單）而非 upcoming（前 30 件 cap）
    const source = calendarData.events || [];
    return source
      .filter((e) => e.date >= todayISO)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [today]);

  // 點月曆後，平滑滾動右側列表到第一個 date >= selectedDate 的事項
  const scrollToDate = useCallback(
    (iso) => {
      if (!iso || !scrollRef.current) return;
      const targetIdx = upcoming.findIndex((e) => e.date >= iso);
      if (targetIdx < 0) return;
      const el = itemRefs.current[targetIdx];
      if (!el) return;
      const containerTop = scrollRef.current.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollTop + (elTop - containerTop) - 4,
        behavior: 'smooth',
      });
    },
    [upcoming]
  );

  useEffect(() => {
    if (selectedDate) scrollToDate(selectedDate);
  }, [selectedDate, scrollToDate]);

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
            {t('calendar.title')}
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
          {t('calendar.fullCalendar')}
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
              <IconButton size="small" onClick={goPrev} aria-label={t('calendar.prevMonth')}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('calendar.yearMonth', { year, month: month + 1 })}
              </Typography>
              <IconButton size="small" onClick={goNext} aria-label={t('calendar.nextMonth')}>
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
              {t('calendar.weekdays', { returnObjects: true }).map((w, i) => (
                <Typography
                  key={w}
                  variant="caption"
                  sx={{
                    textAlign: 'center',
                    fontWeight: 600,
                    color: i === 0 || i === 6 ? HOLIDAY_RED : 'text.secondary',
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
                const isHolidayDay = cell.topKind === 'holiday';
                const isCriticalDay = cell.topKind === 'critical';

                // 文字顏色：放假/週末 → 紅；其他 → 深色（critical 用粗體區別，不用色）
                let textColor;
                if (cell.isOtherMonth) {
                  textColor = 'text.disabled';
                } else if (isHolidayDay || isWeekend) {
                  textColor = HOLIDAY_RED;
                } else {
                  textColor = 'text.primary';
                }

                // critical 用紅色 outline 圈住數字（跟假日紅字明顯不同）
                const criticalRing =
                  isCriticalDay && !cell.isOtherMonth && !cell.isToday
                    ? `1.5px solid ${HOLIDAY_RED}`
                    : '1.5px solid transparent';

                const isSelected = cell.iso === selectedDate && !cell.isToday;
                const cellBg = cell.isToday
                  ? 'primary.main'
                  : isSelected
                  ? 'rgba(25, 118, 210, 0.12)'
                  : 'transparent';

                return (
                  <Box
                    key={cell.iso}
                    onClick={() => setSelectedDate(cell.iso)}
                    sx={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      border: criticalRing,
                      bgcolor: cellBg,
                      color: cell.isToday ? 'primary.contrastText' : textColor,
                      fontWeight:
                        cell.isToday || isCriticalDay ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'background-color 120ms ease',
                      '&:hover': {
                        bgcolor: cell.isToday
                          ? 'primary.dark'
                          : 'rgba(15, 23, 42, 0.05)',
                      },
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
                    {/* 假期 / 學期事件 顯示底部小點 */}
                    {(isHolidayDay || cell.topKind === 'highlight') && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          width: 4,
                          height: 4,
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
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: `1.5px solid ${HOLIDAY_RED}`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {t('calendar.legendDeadline')}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: HOLIDAY_RED }} />
                <Typography variant="caption" color="text.secondary">
                  {t('calendar.legendHoliday')}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1976d2' }} />
                <Typography variant="caption" color="text.secondary">
                  {t('calendar.legendTermEvent')}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* 右：近期行程 — flex 1.618、可滾動瀏覽全部未來事項 */}
          <Box
            sx={{
              flex: { md: '1.618 1 0' },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: { xs: 380, md: 480 },
            }}
          >
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                pt: { xs: 2, sm: 2.5 },
                pb: 0.75,
                flexShrink: 0,
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  display: 'block',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                }}
              >
                {t('calendar.upcoming')}
              </Typography>
            </Box>
            {upcoming.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 4, textAlign: 'center' }}
              >
                {t('calendar.noUpcoming')}
              </Typography>
            ) : (
              <Stack
                ref={scrollRef}
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  px: { xs: 2, sm: 2.5 },
                  pb: { xs: 2, sm: 2.5 },
                  scrollBehavior: 'smooth',
                  // 細緻 scrollbar
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-track': { background: 'transparent' },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(15, 23, 42, 0.12)',
                    borderRadius: 3,
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: 'rgba(15, 23, 42, 0.24)',
                  },
                }}
              >
                {upcoming.map((event, idx) => {
                  const d = new Date(event.date);
                  const md = `${d.getMonth() + 1}/${d.getDate()}`;
                  const weekday = t('calendar.weekdays', { returnObjects: true })[d.getDay()];
                  const isCritical = event.kind === 'critical';
                  const isHoliday = event.kind === 'holiday';
                  const isHighlight = event.kind === 'highlight';

                  const dateColor = isHoliday
                    ? HOLIDAY_RED
                    : isHighlight
                    ? 'primary.main'
                    : 'text.secondary';

                  const titleColor = isHoliday
                    ? HOLIDAY_RED
                    : 'text.primary';

                  const isMatched =
                    selectedDate && event.date === selectedDate;
                  return (
                    <Stack
                      key={`${event.date}-${idx}`}
                      ref={(el) => {
                        if (el) itemRefs.current[idx] = el;
                      }}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                      sx={{
                        py: 1,
                        px: 0.75,
                        borderRadius: 1,
                        transition:
                          'background-color 200ms ease, box-shadow 200ms ease',
                        bgcolor: isMatched
                          ? 'rgba(25, 118, 210, 0.08)'
                          : 'transparent',
                        '&:hover': { bgcolor: isMatched ? 'rgba(25, 118, 210, 0.12)' : 'grey.50' },
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
                          {t('calendar.weekdayShort', { day: weekday })}
                        </Typography>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        {isCritical && (
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              border: `1.5px solid ${HOLIDAY_RED}`,
                              color: HOLIDAY_RED,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              lineHeight: 1,
                            }}
                          >
                            !
                          </Box>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            flex: 1,
                            lineHeight: 1.55,
                            fontWeight: isCritical ? 700 : 500,
                            color: titleColor,
                          }}
                        >
                          {event.title}
                        </Typography>
                      </Stack>
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
