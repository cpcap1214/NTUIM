import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Chip,
    Checkbox,
    FormControlLabel,
    Divider,
    Stack,
    Box,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useAuth } from '../contexts/AuthContext';
import announcementService from '../services/announcementService';
import {
    getDismissedAnnouncements,
    addDismissedAnnouncements,
} from '../services/announcementStorage';

// 蓋在登入/註冊表單上只會擋路，那兩頁不顯示
const SUPPRESSED_PATHS = ['/login', '/register'];

// 站上公告視窗。
//
// 顯示條件：有「生效中」且「這個人還沒關掉」的公告。關掉的判斷取
// 後端記錄與 localStorage 的聯集——訪客沒有帳號可綁記錄，理由見 announcementStorage.js。
//
// 「有新公告就再跳出來」不需要任何額外邏輯：新公告不在已關集合裡，自然會出現。
const AnnouncementDialog = () => {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const location = useLocation();

    const [pending, setPending] = useState([]);
    const [checked, setChecked] = useState({});
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const { announcements, dismissedIds } = await announcementService.getActive();
            // 聯集：後端記錄（登入者才有）∪ 本機記錄（訪客與登入者都有）
            const dismissed = new Set([...dismissedIds, ...getDismissedAnnouncements()]);
            const remaining = announcements.filter((a) => !dismissed.has(a.id));

            setPending(remaining);
            setChecked({});
            setOpen(remaining.length > 0);
        } catch (error) {
            // 公告拿不到不該影響任何其他功能，安靜略過即可
            setPending([]);
            setOpen(false);
        }
    }, []);

    useEffect(() => {
        // 等認證狀態底定再抓：authLoading 期間 user 還是 null，
        // 這時去抓會拿到訪客版的 dismissedIds，登入者的記錄會被漏掉。
        if (authLoading) return;
        load();
        // user 變動（登入/登出）時重抓，換帳號才會看到對方該看的公告
    }, [authLoading, user?.id, load]);

    const handleClose = async () => {
        setOpen(false);

        const ids = pending.filter((a) => checked[a.id]).map((a) => a.id);
        if (ids.length === 0) return;

        // 本機一律先寫：後端呼叫失敗時至少這台裝置不會再被打擾
        addDismissedAnnouncements(ids);

        if (user) {
            // 逐筆送出，其中一筆失敗不影響其他筆
            await Promise.allSettled(ids.map((id) => announcementService.dismiss(id)));
        }
    };

    if (!open || SUPPRESSED_PATHS.includes(location.pathname)) return null;

    return (
        <Dialog open onClose={handleClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                <CampaignIcon color="primary" />
                {t('announcement.dialogTitle')}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5}>
                    {pending.map((announcement, index) => (
                        <Box key={announcement.id}>
                            {index > 0 && <Divider sx={{ mb: 2.5 }} />}

                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    {announcement.title}
                                </Typography>
                                {announcement.level === 'important' && (
                                    <Chip label={t('announcement.important')} color="error" size="small" />
                                )}
                            </Stack>

                            {/* 內容是純文字，換行要自己保留；用 pre-line 而不是 dangerouslySetInnerHTML，
                                公告由管理員輸入，不該讓它有機會塞進標記 */}
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}
                            >
                                {announcement.body}
                            </Typography>

                            <FormControlLabel
                                sx={{ mt: 1 }}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={Boolean(checked[announcement.id])}
                                        onChange={(e) =>
                                            setChecked((prev) => ({
                                                ...prev,
                                                [announcement.id]: e.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={
                                    <Typography variant="body2" color="text.secondary">
                                        {t('announcement.dontRemindMe')}
                                    </Typography>
                                }
                            />
                        </Box>
                    ))}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose} variant="contained">
                    {t('common.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AnnouncementDialog;
