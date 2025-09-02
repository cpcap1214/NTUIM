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
            setError('課程代碼、課程名稱和標題為必填');
            return;
        }

        setLoading(true);
        try {
            await onSave(cheatSheet.id, formData);
            setError('');
        } catch (err) {
            setError(err.message || '更新失敗');
        }
        setLoading(false);
    };

    const handleUpdateFile = async () => {
        if (!file) {
            setError('請選擇要上傳的檔案');
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
            setError(err.message || '檔案更新失敗');
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
                        基本資訊
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="課程代碼"
                                value={formData.courseCode}
                                onChange={(e) => handleInputChange('courseCode', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="課程名稱"
                                value={formData.courseName}
                                onChange={(e) => handleInputChange('courseName', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="標題"
                                value={formData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="描述"
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                            />
                        </Grid>
                        
                        {/* 標籤管理 */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                標籤
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    size="small"
                                    label="新增標籤"
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
                                    新增
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
                            更新資訊
                        </Button>
                    </Box>
                </Paper>

                <Divider sx={{ my: 2 }} />

                {/* 檔案管理 */}
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        檔案管理
                    </Typography>
                    
                    {/* 當前檔案資訊 */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            當前檔案：
                        </Typography>
                        <Typography variant="body2">
                            {cheatSheet.fileName}
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                更新檔案 (PDF)
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
                            更新檔案
                        </Button>
                    </Box>
                </Paper>
            </DialogContent>
            
            <DialogActions>
                <Button onClick={handleClose}>
                    關閉
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditCheatSheetDialog;