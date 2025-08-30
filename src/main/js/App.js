import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/layout/Layout';
import { ErrorBoundary } from './components/common';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import CourseReviewPage from './pages/CourseReviewPage';
import ExamArchivePage from './pages/ExamArchivePage';
import CheatSheetPage from './pages/CheatSheetPage';
import AboutUsPage from './pages/AboutUsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import AdminUploadPage from './pages/AdminUploadPage';
import ExamManagePage from './pages/ExamManagePage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/course-reviews" element={<CourseReviewPage />} />
              <Route path="/exam-archive" element={<ExamArchivePage />} />
              <Route path="/cheat-sheets" element={<CheatSheetPage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/upload" element={<AdminUploadPage />} />
              <Route path="/admin/exam-manage" element={<ExamManagePage />} />
            </Routes>
          </Layout>
        </Box>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;