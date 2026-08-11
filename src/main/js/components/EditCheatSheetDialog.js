import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    Box,
    Alert,
    Divider,
    Paper,
    Chip,
    Stack
} from '@mui/material';

const EditCheatSheetDialog = ({ 
    open, 
    onClose, 
    cheatSheet, 
    onSave, 
    onFileUpdate 
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        courseCode: '',
        courseName: '',
        title: '',
        description: '',
        tags: []
    });
    
    const [file, setFile] = useState(null);
    const [newTag, setNewTag] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (cheatSheet) {
            setFormData({
                courseCode: cheatSheet.courseCode || '',
                courseName: cheatSheet.courseName || '',
                title: cheatSheet.title || '',
                description: cheatSheet.description || '',
                tags: cheatSheet.tags || []
            });
        }
    }, [cheatSheet]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError('');
    };

    const handleAddTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }));
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSaveInfo = async () => {
        if (!formData.courseCode.trim() || !formData.courseName.trim() || !formData.title.trim()) {
            setError(t('cheatSheet.form.requiredFields'));
            return;
        }

        setLoading(true);
        try {
            await onSave(cheatSheet.id, formData);
            setError('');
        } catch (err) {
            setError(err.message || t('exam.form.updateFailed'));
        }
        setLoading(false);
    };

    const handleUpdateFile = async () => {
        if (!file) {
            setError(t('cheatSheet.form.pickFile'));
            return;
        }

        setLoading(true);
        try {
            const fileFormData = new FormData();
            fileFormData.append('file', file);

            await onFileUpdate(cheatSheet.id, fileFormData);
            setFile(null);
            setError('');
        } catch (err) {
            setError(err.message || t('exam.form.fileUpdateFailed'));
        }
        setLoading(false);
    };

    const handleClose = () => {
        setError('');
        setFile(null);
        setNewTag('');
        onClose();
    };

    if (!cheatSheet) return null;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>編輯大抄</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* 基本資訊編輯 */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {t('exam.form.basicInfo')}
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('courseReview.form.courseCode')}
                                value={formData.courseCode}
                                onChange={(e) => handleInputChange('courseCode', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('courseReview.form.courseName')}
                                value={formData.courseName}
                                onChange={(e) => handleInputChange('courseName', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('cheatSheet.form.title')}
                                value={formData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('cheatSheet.form.description')}
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                            />
                        </Grid>
                        
                        {/* 標籤管理 */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('cheatSheet.form.tags')}
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    size="small"
                                    label={t('cheatSheet.form.addTag')}
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    sx={{ mr: 1 }}
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleAddTag}
                                    disabled={!newTag.trim()}
                                >
                                    {t('cheatSheet.form.add')}
                                </Button>
                            </Box>
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                {formData.tags.map((tag, index) => (
                                    <Chip
                                        key={index}
                                        label={tag}
                                        onDelete={() => handleRemoveTag(tag)}
                                        variant="outlined"
                                    />
                                ))}
                            </Stack>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveInfo}
                            disabled={loading}
                        >
                            {t('exam.form.updateInfo')}
                        </Button>
                    </Box>
                </Paper>

                <Divider sx={{ my: 2 }} />

                {/* 檔案管理 */}
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        {t('exam.form.fileManagement')}
                    </Typography>
                    
                    {/* 當前檔案資訊 */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {t('exam.form.currentFiles')}
                        </Typography>
                        <Typography variant="body2">
                            {cheatSheet.fileName}
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('cheatSheet.form.updateFilePdf')}
                            </Typography>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                style={{ width: '100%' }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleUpdateFile}
                            disabled={loading || !file}
                        >
                            {t('exam.form.updateFile')}
                        </Button>
                    </Box>
                </Paper>
            </DialogContent>
            
            <DialogActions>
                <Button onClick={handleClose}>
                    {t('common.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditCheatSheetDialog;