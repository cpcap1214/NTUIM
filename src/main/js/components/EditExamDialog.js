import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Typography,
    Box,
    Alert,
    Divider,
    Paper
} from '@mui/material';

const EditExamDialog = ({ 
    open, 
    onClose, 
    exam, 
    onSave, 
    onFileUpdate 
}) => {
    const [formData, setFormData] = useState({
        courseCode: '',
        courseName: '',
        professor: '',
        year: new Date().getFullYear(),
        semester: '1',
        examType: 'final',
        examAttempt: 1
    });
    
    const [files, setFiles] = useState({
        questionFile: null,
        answerFile: null
    });
    
    const [removeAnswerFile, setRemoveAnswerFile] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (exam) {
            setFormData({
                courseCode: exam.courseCode || '',
                courseName: exam.courseName || '',
                professor: exam.professor || '',
                year: exam.year || new Date().getFullYear(),
                semester: exam.semester || '1',
                examType: exam.examType || 'final',
                examAttempt: exam.examAttempt || 1
            });
        }
    }, [exam]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError('');
    };

    const handleFileChange = (field, file) => {
        setFiles(prev => ({
            ...prev,
            [field]: file
        }));
        setError('');
    };

    const handleSaveInfo = async () => {
        if (!formData.courseCode.trim() || !formData.courseName.trim()) {
            setError('課程代碼和課程名稱為必填');
            return;
        }

        setLoading(true);
        try {
            await onSave(exam.id, formData);
            setError('');
        } catch (err) {
            setError(err.message || '更新失敗');
        }
        setLoading(false);
    };

    const handleUpdateFiles = async () => {
        if (!files.questionFile && !files.answerFile && !removeAnswerFile) {
            setError('請選擇要更新的檔案或移除答案檔案');
            return;
        }

        setLoading(true);
        try {
            const fileFormData = new FormData();
            
            if (files.questionFile) {
                fileFormData.append('questionFile', files.questionFile);
            }
            
            if (files.answerFile) {
                fileFormData.append('answerFile', files.answerFile);
            }
            
            if (removeAnswerFile) {
                fileFormData.append('removeAnswerFile', 'true');
            }

            await onFileUpdate(exam.id, fileFormData);
            setFiles({ questionFile: null, answerFile: null });
            setRemoveAnswerFile(false);
            setError('');
        } catch (err) {
            setError(err.message || '檔案更新失敗');
        }
        setLoading(false);
    };

    const handleClose = () => {
        setError('');
        setFiles({ questionFile: null, answerFile: null });
        setRemoveAnswerFile(false);
        onClose();
    };

    if (!exam) return null;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>編輯考古題</DialogTitle>
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
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="教授"
                                value={formData.professor}
                                onChange={(e) => handleInputChange('professor', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="年份"
                                value={formData.year}
                                onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                                inputProps={{ min: 2000, max: 2100 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel>學期</InputLabel>
                                <Select
                                    value={formData.semester}
                                    label="學期"
                                    onChange={(e) => handleInputChange('semester', e.target.value)}
                                >
                                    <MenuItem value="1">第一學期</MenuItem>
                                    <MenuItem value="2">第二學期</MenuItem>
                                    <MenuItem value="summer">暑期</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel>考試類型</InputLabel>
                                <Select
                                    value={formData.examType}
                                    label="考試類型"
                                    onChange={(e) => handleInputChange('examType', e.target.value)}
                                >
                                    <MenuItem value="midterm">期中考</MenuItem>
                                    <MenuItem value="final">期末考</MenuItem>
                                    <MenuItem value="quiz">小考</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="考試次數"
                                value={formData.examAttempt}
                                onChange={(e) => handleInputChange('examAttempt', parseInt(e.target.value))}
                                inputProps={{ min: 1, max: 3 }}
                            />
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
                            題目檔案：{exam.questionFileName}
                        </Typography>
                        {exam.answerFileName && (
                            <Typography variant="body2">
                                答案檔案：{exam.answerFileName}
                            </Typography>
                        )}
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                更新題目檔案 (PDF)
                            </Typography>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange('questionFile', e.target.files[0])}
                                style={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                更新答案檔案 (PDF)
                            </Typography>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange('answerFile', e.target.files[0])}
                                style={{ width: '100%' }}
                            />
                        </Grid>
                    </Grid>

                    {exam.answerFileName && (
                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setRemoveAnswerFile(!removeAnswerFile)}
                            >
                                {removeAnswerFile ? '取消移除答案檔案' : '移除答案檔案'}
                            </Button>
                        </Box>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleUpdateFiles}
                            disabled={loading}
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

export default EditExamDialog;