import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import ChatPage from './pages/ChatPage';
import PracticePage from './pages/PracticePage';
import ProgressPage from './pages/ProgressPage';
import EvaluationPage from './pages/EvaluationPage';
import UploadPage from './pages/UploadPage';
import CoursesPage from './pages/CoursesPage';
import { getCourses, createCourse, createConversation } from './services/api';

export default function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    getCourses()
      .then(async (data) => {
        if (data && data.length > 0) {
          setCourses(data);
          setSelectedCourse(data[0]);
        } else {
          try {
            const defaultCourse = await createCourse({
              title: "Data Structures & Digital Fundamentals",
              description: "Core academic materials"
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

  const handleSelectConversation = (conv) => {
    setCurrentConversation(conv);
  };

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation({
        title: "New Learning Session",
        course_id: selectedCourse?.id || "default_course"
      });
      setCurrentConversation(newConv);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to create new conversation", err);
      setCurrentConversation(null);
    }
  };

  const handleConversationUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Router>
      <div className="h-screen bg-[#F7F3ED] text-[#2D3748] flex flex-col font-sans overflow-hidden">
        <Navbar
          selectedCourse={selectedCourse}
          courses={courses}
          onSelectCourse={setSelectedCourse}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />
        
        <div className="flex-1 flex overflow-hidden relative">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            currentConversation={currentConversation}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            refreshTrigger={refreshTrigger}
          />

          <main className="flex-1 flex flex-col overflow-hidden bg-[#F7F3ED]">
            <Routes>
              <Route
                path="/"
                element={
                  <ChatPage
                    currentConversation={currentConversation}
                    selectedCourse={selectedCourse}
                    onSelectConversation={handleSelectConversation}
                    onConversationUpdated={handleConversationUpdated}
                    onNewChat={handleNewChat}
                  />
                }
              />
              <Route
                path="/practice"
                element={
                  <PracticePage
                    selectedCourse={selectedCourse}
                    currentConversation={currentConversation}
                  />
                }
              />
              <Route
                path="/progress"
                element={<ProgressPage selectedCourse={selectedCourse} />}
              />
              <Route
                path="/evaluation"
                element={<EvaluationPage />}
              />
              <Route
                path="/upload"
                element={<UploadPage selectedCourse={selectedCourse} />}
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
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
