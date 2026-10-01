import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import UploadPage from './pages/UploadPage';
import TutorPage from './pages/TutorPage';
import PracticePage from './pages/PracticePage';
import ProgressPage from './pages/ProgressPage';
import EvaluationPage from './pages/EvaluationPage';
import { getCourses, createCourse } from './services/api';

export default function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    getCourses()
      .then(async (data) => {
        if (data && data.length > 0) {
          setCourses(data);
          setSelectedCourse(data[0]);
        } else {
          // Automatically create a default demo course on initial load so dashboard & chatbot are active immediately
          try {
            const defaultCourse = await createCourse({
              title: "Data Structures & Algorithms",
              description: "Core CS fundamentals course"
            });
            setCourses([defaultCourse]);
            setSelectedCourse(defaultCourse);
          } catch (err) {
            console.error("Failed to auto-create default course", err);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCourseCreated = (newCourse) => {
    setCourses((prev) => [newCourse, ...prev]);
    setSelectedCourse(newCourse);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar
          selectedCourse={selectedCourse}
          courses={courses}
          onSelectCourse={setSelectedCourse}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
        />
        <div className="flex-1 flex overflow-hidden relative">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
          <main className="flex-1 overflow-y-auto bg-slate-900/40 transition-all duration-300">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    selectedCourse={selectedCourse}
                    onCourseCreated={handleCourseCreated}
                  />
                }
              />
              <Route
                path="/courses"
                element={
                  <CoursesPage
                    courses={courses}
                    onCourseCreated={handleCourseCreated}
                    selectedCourse={selectedCourse}
                    onSelectCourse={setSelectedCourse}
                  />
                }
              />
              <Route path="/upload" element={<UploadPage selectedCourse={selectedCourse} />} />
              <Route path="/tutor" element={<TutorPage selectedCourse={selectedCourse} />} />
              <Route path="/practice" element={<PracticePage selectedCourse={selectedCourse} />} />
              <Route path="/progress" element={<ProgressPage selectedCourse={selectedCourse} />} />
              <Route path="/evaluation" element={<EvaluationPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
