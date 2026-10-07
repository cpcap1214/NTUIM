import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { API_BASE_URL } from '../services/api';

export const sponsorSlides = [
    { id: 'imsa', title: '臺大資管系學會', src: '/images/branding/imsa-banner.png' },
    {
        id: 'easywallet-banner',
        title: '悠遊付｜開學季最高回饋 30%',
        src: '/images/sponsors/easywallet-banner.jpeg',
    },
    {
        id: 'easywallet-coupons',
        title: '悠遊付｜雙週領券與使用步驟',
        src: '/images/sponsors/easywallet-coupons.jpeg',
    },
    {
        id: 'easywallet-details',
        title: '悠遊付｜活動辦法',
        src: '/images/sponsors/easywallet-details.png',
    },
];

let fallbackVisitor;
function visitorId() {
    try {
        let id = localStorage.getItem('sponsorVisitorId');
        if (!/^[0-9a-f-]{36}$/i.test(id || '')) {
            id = crypto.randomUUID();
            localStorage.setItem('sponsorVisitorId', id);
        }
        return id;
    } catch {
        fallbackVisitor ||= crypto.randomUUID();
        return fallbackVisitor;
    }
}

export default function SponsorCarousel() {
    const [index, setIndex] = useState(0);
    const [opened, setOpened] = useState(false);
    const [visible, setVisible] = useState(false);
    const [foreground, setForeground] = useState(!document.hidden);
    const [loaded, setLoaded] = useState(null);
    const frame = useRef(null);
    const pageView = useRef(null);
    const sent = useRef(new Set());
    const slide = sponsorSlides[index];
    const active = visible && foreground && !opened;

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5),
            { threshold: [0, 0.5] },
        );
        observer.observe(frame.current);
        const update = () => setForeground(!document.hidden);
        document.addEventListener('visibilitychange', update);
        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', update);
        };
    }, []);

    const record = useCallback((type, id) => {
        const key = `${id}:${type}`;
        if (id === 'imsa' || sent.current.has(key)) return;
        sent.current.add(key);
        pageView.current ||= crypto.randomUUID();
        fetch(`${API_BASE_URL}/sponsors/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
                eventId: crypto.randomUUID(),
                creativeId: id,
                type,
                visitorId: visitorId(),
                pageViewId: pageView.current,
            }),
        })
            .then((response) => {
                if (!response.ok) sent.current.delete(key);
            })
            .catch(() => sent.current.delete(key));
    }, []);

    useEffect(() => {
        if (!active || loaded !== slide.id || slide.id === 'imsa') return undefined;
        const timer = setTimeout(() => record('impression', slide.id), 1000);
        return () => clearTimeout(timer);
    }, [active, loaded, slide.id, record]);

    useEffect(() => {
        if (!foreground || opened) return undefined;
        const timer = setInterval(() => {
            setLoaded(null);
            setIndex((current) => (current + 1) % sponsorSlides.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [foreground, opened]);

    return (
        <Box
            component="section"
            aria-label="系學會與贊助活動輪播"
            aria-roledescription="輪播"
            sx={{
                mb: { xs: 3, md: 4 },
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Box ref={frame} sx={{ height: { xs: 230, sm: 350, md: 440 }, bgcolor: '#f4f7fa' }}>
                <Box
                    component="button"
                    type="button"
                    aria-label={`${slide.title}，點開完整圖片`}
                    onClick={() => {
                        record('open', slide.id);
                        setOpened(true);
                    }}
                    sx={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        p: 0,
                        border: 0,
                        bgcolor: 'transparent',
                        cursor: 'zoom-in',
                        '&:focus-visible': { outline: '3px solid #1976d2', outlineOffset: '-3px' },
                    }}
                >
                    <Box
                        key={slide.id}
                        component="img"
                        src={slide.src}
                        alt={slide.title}
                        onLoad={() => setLoaded(slide.id)}
                        sx={{
                            display: 'block',
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                        }}
                    />
                </Box>
            </Box>
            <Dialog
                open={opened}
                onClose={() => setOpened(false)}
                maxWidth="lg"
                fullWidth
                aria-labelledby="sponsor-image-title"
            >
                <DialogTitle id="sponsor-image-title">
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography component="span" fontWeight={600}>
                            {slide.title}
                        </Typography>
                        <Button onClick={() => setOpened(false)}>關閉</Button>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Box
                        component="img"
                        src={slide.src}
                        alt={slide.title}
                        sx={{ display: 'block', width: '100%', height: 'auto' }}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
}
