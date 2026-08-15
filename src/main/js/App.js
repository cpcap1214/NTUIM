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
import ExamManagePage from './pages/ExamManagePage';
import CheatSheetManagePage from './pages/CheatSheetManagePage';
import ChangelogPage from './pages/ChangelogPage';
import ExamUploadPage from './pages/ExamUploadPage';
import ProtectedRoute from './components/ProtectedRoute';
import AnnouncementDialog from './components/AnnouncementDialog';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {/* 公告視窗放在 Layout 之外、AuthProvider 之內：它需要認證狀態來決定
            要不要把「不再提醒」寫回後端，但不屬於任何一個頁面，也不該被導覽列包住 */}
        <AnnouncementDialog />
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              {/* 模組守衛：未開放時直接顯示「即將推出」，不必等頁面自己去打 API 才發現。
                  requireAuth={false} 是因為這三個模組本身允許未登入瀏覽，
                  真正的登入/繳費限制仍由各頁面與後端各自把關。 */}
              <Route
                path="/course-reviews"
                element={
                  <ProtectedRoute requireAuth={false} requireModule="courseReviews">
                    <CourseReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exam-archive"
                element={
                  <ProtectedRoute requireAuth={false} requireModule="exams">
                    <ExamArchivePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cheat-sheets"
                element={
                  <ProtectedRoute requireAuth={false} requireModule="cheatSheets">
                    <CheatSheetPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/upload-exam" element={<ExamUploadPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/exam-manage" element={<ExamManagePage />} />
              <Route path="/admin/cheatsheet-manage" element={<CheatSheetManagePage />} />
            </Routes>
          </Layout>
        </Box>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;