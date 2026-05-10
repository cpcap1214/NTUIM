import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Stack,
  Link,
  IconButton,
  Grid,
  Divider,
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

const NTUCalendar = ({ upcomingLimit = 7 }) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewDate, setViewDate] = useState(today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // 事件日期集合，給月曆判斷有無事件
  const eventDates = useMemo(() => {
    const set = new Set();
    for (const e of calendarData.events || []) set.add(e.date);
    return set;
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
      list.push({
        iso,
        day: d.getDate(),
        weekday: d.getDay(),
        isOtherMonth: d.getMonth() !== month,
        isToday: d.getTime() === today.getTime(),
        hasEvent: eventDates.has(iso),
      });
    }
    return list;
  }, [year, month, today, eventDates]);

  // 近期重要事項（從今天起取 N 件）
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
        <Grid container>
          {/* 左：簡單月曆 */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              borderRight: { md: '1px solid' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider',
              p: { xs: 2, sm: 2.5 },
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
                    color: i === 0 || i === 6 ? '#dc2626' : 'text.secondary',
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
                const baseColor = cell.isOtherMonth
                  ? 'text.disabled'
                  : isWeekend
                  ? '#dc2626'
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
                      bgcolor: cell.isToday ? 'primary.main' : 'transparent',
                      color: cell.isToday ? 'primary.contrastText' : baseColor,
                      fontWeight: cell.isToday ? 700 : 500,
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
                    {cell.hasEvent && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          bgcolor: cell.isToday
                            ? 'primary.contrastText'
                            : 'primary.main',
                          opacity: cell.isOtherMonth ? 0.4 : 1,
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Grid>

          {/* 右：近期重要行程 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
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
                近期重要行程
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
                <Stack
                  divider={<Divider flexItem />}
                  sx={{ mt: 0.5 }}
                >
                  {upcoming.map((event, idx) => {
                    const d = new Date(event.date);
                    const md = `${d.getMonth() + 1}/${d.getDate()}`;
                    const weekday = WEEKDAYS[d.getDay()];
                    const isHoliday = event.kind === 'holiday';
                    return (
                      <Stack
                        key={`${event.date}-${idx}`}
                        direction="row"
                        spacing={1.5}
                        alignItems="baseline"
                        sx={{ py: 1 }}
                      >
                        <Box sx={{ minWidth: 56, flexShrink: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              color: isHoliday ? '#dc2626' : 'primary.main',
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
                          sx={{ flex: 1, lineHeight: 1.55 }}
                        >
                          {event.title}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default NTUCalendar;
