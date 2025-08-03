import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/layout/Layout';
import { ErrorBoundary } from './components/common';
import HomePage from './pages/HomePage';
import CourseReviewPage from './pages/CourseReviewPage';
import ExamArchivePage from './pages/ExamArchivePage';
import CheatSheetPage from './pages/CheatSheetPage';
import AboutUsPage from './pages/AboutUsPage';

function App() {
  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/course-reviews" element={<CourseReviewPage />} />
            <Route path="/exam-archive" element={<ExamArchivePage />} />
            <Route path="/cheat-sheets" element={<CheatSheetPage />} />
            <Route path="/about" element={<AboutUsPage />} />
          </Routes>
        </Layout>
      </Box>
    </ErrorBoundary>
  );
}

export default App;