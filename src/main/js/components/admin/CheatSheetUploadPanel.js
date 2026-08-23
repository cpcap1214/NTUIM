import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Chip,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { API_BASE_URL } from '../../services/api';

// 上傳走裸 fetch 而不是共用的 api 實例：送的是 FormData，
// 而 api 實例把 Content-Type 固定成 application/json，
// 會蓋掉 multipart 的 boundary 標頭，後端就解不出檔案。
const MAX_FILE_BYTES = 50 * 1024 * 1024;

// 後台的「上傳大抄」分頁。原本是 AdminPage.js 裡的一段 activeTab === 2。
const CheatSheetUploadPanel = ({ onNotify }) => {
    const { t } = useTranslation();
    const [cheatSheetForm, setCheatSheetForm] = useState({
        courseCode: '',
        courseName: '',
        title: '',
        description: '',
        tags: [],
        currentTag: '',
        file: null,
    });
    const [uploadErrors, setUploadErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleCheatSheetChange = (field, value) => {
        setCheatSheetForm((prev) => ({ ...prev, [field]: value }));
        setUploadErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const addTag = () => {
        if (cheatSheetForm.currentTag && !cheatSheetForm.tags.includes(cheatSheetForm.currentTag)) {
            setCheatSheetForm((prev) => ({
                ...prev,
                tags: [...prev.tags, prev.currentTag],
                currentTag: '',
            }));
        }
    };

    const removeTag = (tagToRemove) => {
        setCheatSheetForm((prev) => ({
            ...prev,
            tags: prev.tags.filter((tag) => tag !== tagToRemove),
        }));
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            onNotify(t('admin.upload.pdfOnly'), 'error');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            onNotify(t('admin.upload.tooLarge'), 'error');
            return;
        }
        handleCheatSheetChange('file', file);
    };

    const validateCheatSheetForm = () => {
        const newErrors = {};

        if (!cheatSheetForm.courseCode) newErrors.courseCode = t('admin.upload.courseCodeRequired');
        if (!cheatSheetForm.courseName) newErrors.courseName = t('admin.upload.courseNameRequired');
        if (!cheatSheetForm.title) newErrors.title = t('admin.upload.titleRequired');
        if (!cheatSheetForm.description)
            newErrors.description = t('admin.upload.descriptionRequired');
        if (cheatSheetForm.tags.length === 0) newErrors.tags = t('admin.upload.tagRequired');
        if (!cheatSheetForm.file) newErrors.file = t('admin.upload.fileRequired');

        setUploadErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadCheatSheet = async () => {
        if (!validateCheatSheetForm()) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', cheatSheetForm.file);
        formData.append('courseCode', cheatSheetForm.courseCode);
        formData.append('courseName', cheatSheetForm.courseName);
        formData.append('title', cheatSheetForm.title);
        formData.append('description', cheatSheetForm.description);
        formData.append('tags', JSON.stringify(cheatSheetForm.tags));

        try {
            const response = await fetch(`${API_BASE_URL}/cheat-sheets/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(t('admin.upload.failed'));
            }

            onNotify(t('admin.upload.cheatSheetSuccess'), 'success');

            setCheatSheetForm({
                courseCode: '',
                courseName: '',
                title: '',
                description: '',
                tags: [],
                currentTag: '',
                file: null,
            });

            setUploadProgress(100);
        } catch (error) {
            onNotify(error.message || t('admin.upload.failedRetry'), 'error');
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    return (
        <Paper sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                {t('admin.uploadCheatSheet')}
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label={t('courseReview.form.courseCode')}
                        placeholder={t('admin.upload.courseCodeExample')}
                        value={cheatSheetForm.courseCode}
                        onChange={(e) => handleCheatSheetChange('courseCode', e.target.value)}
                        error={!!uploadErrors.courseCode}
                        helperText={uploadErrors.courseCode}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label={t('courseReview.form.courseName')}
                        placeholder={t('admin.upload.courseNameExample')}
                        value={cheatSheetForm.courseName}
                        onChange={(e) => handleCheatSheetChange('courseName', e.target.value)}
                        error={!!uploadErrors.courseName}
                        helperText={uploadErrors.courseName}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label={t('admin.upload.cheatSheetTitleLabel')}
                        placeholder={t('admin.upload.cheatSheetTitleExample')}
                        value={cheatSheetForm.title}
                        onChange={(e) => handleCheatSheetChange('title', e.target.value)}
                        error={!!uploadErrors.title}
                        helperText={uploadErrors.title}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label={t('cheatSheet.form.description')}
                        placeholder={t('admin.upload.cheatSheetDescExample')}
                        value={cheatSheetForm.description}
                        onChange={(e) => handleCheatSheetChange('description', e.target.value)}
                        error={!!uploadErrors.description}
                        helperText={uploadErrors.description}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            fullWidth
                            label={t('cheatSheet.form.tags')}
                            placeholder={t('admin.upload.tagPlaceholder')}
                            value={cheatSheetForm.currentTag}
                            onChange={(e) => handleCheatSheetChange('currentTag', e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addTag();
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        onClick={addTag}
                                        disabled={!cheatSheetForm.currentTag}
                                    >
                                        <AddIcon />
                                    </IconButton>
                                ),
                            }}
                        />
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {cheatSheetForm.tags.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                onDelete={() => removeTag(tag)}
                                deleteIcon={<DeleteIcon />}
                                color="primary"
                                variant="outlined"
                            />
                        ))}
                    </Stack>
                    {uploadErrors.tags && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            {uploadErrors.tags}
                        </Typography>
                    )}
                </Grid>
                <Grid item xs={12}>
                    <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center' }}>
                        <input
                            accept="application/pdf"
                            style={{ display: 'none' }}
                            id="cheatsheet-file-upload"
                            type="file"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                        />
                        <label htmlFor="cheatsheet-file-upload">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<CloudUploadIcon />}
                                sx={{ mb: 1 }}
                            >
                                {t('admin.upload.pickPdf')}
                            </Button>
                        </label>
                        {cheatSheetForm.file && (
                            <Typography variant="body2" color="success.main">
                                {t('admin.upload.selected', {
                                    name: cheatSheetForm.file.name,
                                })}
                            </Typography>
                        )}
                        {uploadErrors.file && (
                            <Typography variant="body2" color="error">
                                {uploadErrors.file}
                            </Typography>
                        )}
                    </Box>
                </Grid>
            </Grid>

            {/* 進度條 */}
            {uploading && (
                <Box sx={{ mt: 3 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
            )}

            {/* 上傳按鈕 */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={uploadCheatSheet}
                    disabled={uploading}
                    startIcon={<CloudUploadIcon />}
                >
                    {t(uploading ? 'admin.upload.uploading' : 'admin.uploadCheatSheet')}
                </Button>
            </Box>
        </Paper>
    );
};

export default CheatSheetUploadPanel;
