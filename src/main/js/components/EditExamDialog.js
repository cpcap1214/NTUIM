import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
            setError(t('exam.form.codeAndNameRequired'));
            return;
        }

        setLoading(true);
        try {
            await onSave(exam.id, formData);
            setError('');
        } catch (err) {
            setError(err.message || t('exam.form.updateFailed'));
        }
        setLoading(false);
    };

    const handleUpdateFiles = async () => {
        if (!files.questionFile && !files.answerFile && !removeAnswerFile) {
            setError(t('exam.form.pickFileOrRemove'));
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
            setError(err.message || t('exam.form.fileUpdateFailed'));
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
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('courseReview.detailField.professor')}
                                value={formData.professor}
                                onChange={(e) => handleInputChange('professor', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label={t('exam.form.year')}
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
                                    label={t('courseReview.detailField.academicTerm')}
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
                                    label={t('exam.form.examType')}
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
                                label={t('exam.form.examAttempt')}
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
                            {t('exam.form.questionFile', { name: exam.questionFileName })}
                        </Typography>
                        {exam.answerFileName && (
                            <Typography variant="body2">
                                {t('exam.form.answerFile', { name: exam.answerFileName })}
                            </Typography>
                        )}
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('exam.form.updateQuestionFile')}
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
                                {t('exam.form.updateAnswerFile')}
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
                                {t(removeAnswerFile ? 'exam.form.cancelRemoveAnswer' : 'exam.form.removeAnswer')}
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

export default EditExamDialog;