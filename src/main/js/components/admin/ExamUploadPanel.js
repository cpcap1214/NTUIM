import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    FormControl,
    Grid,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { API_BASE_URL } from '../../services/api';

// 上傳走裸 fetch 而不是共用的 api 實例：送的是 FormData，
// 而 api 實例把 Content-Type 固定成 application/json，
// 會蓋掉 multipart 的 boundary 標頭，後端就解不出檔案。
const MAX_FILE_BYTES = 50 * 1024 * 1024;

// 後台的「上傳考古題」分頁。原本是 AdminPage.js 裡的一段 activeTab === 1。
//
// 拆開之後 handleFileSelect 不必再用 activeTab 判斷自己在哪個分頁——
// 那個判斷本來就是「兩份表單擠在同一個元件」的產物。
const ExamUploadPanel = ({ onNotify }) => {
    const { t } = useTranslation();
    const [examForm, setExamForm] = useState({
        courseCode: '',
        courseName: '',
        professor: '',
        year: new Date().getFullYear() - 1911,
        semester: '1',
        examType: 'midterm',
        examAttempt: 1,
        questionFile: null,
        answerFile: null,
    });
    const [uploadErrors, setUploadErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleExamChange = (field, value) => {
        setExamForm((prev) => ({ ...prev, [field]: value }));
        setUploadErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const handleFileSelect = (file, fileType = 'question') => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            onNotify(t('admin.upload.pdfOnly'), 'error');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            onNotify(t('admin.upload.tooLarge'), 'error');
            return;
        }
        handleExamChange(fileType === 'answer' ? 'answerFile' : 'questionFile', file);
    };

    const validateExamForm = () => {
        const newErrors = {};

        if (!examForm.courseCode) newErrors.courseCode = t('admin.upload.courseCodeRequired');
        if (!examForm.courseName) newErrors.courseName = t('admin.upload.courseNameRequired');
        if (!examForm.professor) newErrors.professor = t('admin.upload.professorRequired');
        if (!examForm.year) newErrors.year = t('admin.upload.yearRequired');
        if (!examForm.questionFile) newErrors.questionFile = t('admin.upload.questionFileRequired');

        setUploadErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadExam = async () => {
        if (!validateExamForm()) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('questionFile', examForm.questionFile);
        if (examForm.answerFile) {
            formData.append('answerFile', examForm.answerFile);
        }
        formData.append('courseCode', examForm.courseCode);
        formData.append('courseName', examForm.courseName);
        formData.append('professor', examForm.professor);
        formData.append('year', examForm.year + 1911);
        formData.append('semester', examForm.semester);
        formData.append('examType', examForm.examType);
        formData.append('examAttempt', examForm.examAttempt);

        try {
            const response = await fetch(`${API_BASE_URL}/exams/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(t('admin.upload.failed'));
            }

            onNotify(t('admin.upload.examSuccess'), 'success');

            setExamForm((prev) => ({
                ...prev,
                questionFile: null,
                answerFile: null,
            }));

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
                {t('nav.uploadExam')}
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label={t('courseReview.form.courseCode')}
                        placeholder={t('admin.upload.courseCodeExample')}
                        value={examForm.courseCode}
                        onChange={(e) => handleExamChange('courseCode', e.target.value)}
                        error={!!uploadErrors.courseCode}
                        helperText={uploadErrors.courseCode}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label={t('courseReview.form.courseName')}
                        placeholder={t('admin.upload.courseNameExample')}
                        value={examForm.courseName}
                        onChange={(e) => handleExamChange('courseName', e.target.value)}
                        error={!!uploadErrors.courseName}
                        helperText={uploadErrors.courseName}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label={t('admin.upload.professorLabel')}
                        placeholder={t('admin.upload.professorExample')}
                        value={examForm.professor}
                        onChange={(e) => handleExamChange('professor', e.target.value)}
                        error={!!uploadErrors.professor}
                        helperText={uploadErrors.professor}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        type="number"
                        label={t('admin.upload.yearRocLabel')}
                        value={examForm.year}
                        onChange={(e) => handleExamChange('year', parseInt(e.target.value))}
                        error={!!uploadErrors.year}
                        helperText={uploadErrors.year}
                        inputProps={{ min: 100, max: 150 }}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>學期</InputLabel>
                        <Select
                            value={examForm.semester}
                            label={t('courseReview.detailField.academicTerm')}
                            onChange={(e) => handleExamChange('semester', e.target.value)}
                        >
                            <MenuItem value="1">上學期</MenuItem>
                            <MenuItem value="2">下學期</MenuItem>
                            <MenuItem value="summer">暑期</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>考試類型</InputLabel>
                        <Select
                            value={examForm.examType}
                            label={t('exam.form.examType')}
                            onChange={(e) => handleExamChange('examType', e.target.value)}
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
                        value={examForm.examAttempt}
                        onChange={(e) => handleExamChange('examAttempt', parseInt(e.target.value))}
                        inputProps={{ min: 1, max: 10 }}
                    />
                </Grid>
                {/* 題目檔案上傳 */}
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        {t('admin.upload.questionFileLabel')}{' '}
                        <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center' }}>
                        <input
                            accept="application/pdf"
                            style={{ display: 'none' }}
                            id="exam-question-file-upload"
                            type="file"
                            onChange={(e) => handleFileSelect(e.target.files[0], 'question')}
                        />
                        <label htmlFor="exam-question-file-upload">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<CloudUploadIcon />}
                                sx={{ mb: 1 }}
                            >
                                {t('admin.upload.pickQuestionPdf')}
                            </Button>
                        </label>
                        {examForm.questionFile && (
                            <Typography variant="body2" color="success.main">
                                {t('admin.upload.selected', {
                                    name: examForm.questionFile.name,
                                })}
                            </Typography>
                        )}
                        {uploadErrors.questionFile && (
                            <Typography variant="body2" color="error">
                                {uploadErrors.questionFile}
                            </Typography>
                        )}
                    </Box>
                </Grid>

                {/* 答案檔案上傳 */}
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        {t('admin.upload.answerFileLabel')}{' '}
                        <span style={{ color: 'gray' }}>{t('admin.upload.optionalTag')}</span>
                    </Typography>
                    <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center' }}>
                        <input
                            accept="application/pdf"
                            style={{ display: 'none' }}
                            id="exam-answer-file-upload"
                            type="file"
                            onChange={(e) => handleFileSelect(e.target.files[0], 'answer')}
                        />
                        <label htmlFor="exam-answer-file-upload">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<CloudUploadIcon />}
                                sx={{ mb: 1 }}
                                color="secondary"
                            >
                                {t('admin.upload.pickAnswerPdf')}
                            </Button>
                        </label>
                        {examForm.answerFile && (
                            <Typography variant="body2" color="success.main">
                                {t('admin.upload.selected', {
                                    name: examForm.answerFile.name,
                                })}
                            </Typography>
                        )}
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 1 }}
                        >
                            {t('admin.upload.answerOptionalHint')}
                        </Typography>
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
                    onClick={uploadExam}
                    disabled={uploading}
                    startIcon={<CloudUploadIcon />}
                >
                    {t(uploading ? 'admin.upload.uploading' : 'nav.uploadExam')}
                </Button>
            </Box>
        </Paper>
    );
};

export default ExamUploadPanel;
