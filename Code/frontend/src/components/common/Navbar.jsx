import React from 'react';
import { BookOpen, Menu, X, Sparkles, User } from 'lucide-react';

export default function Navbar({ selectedCourse, courses, onSelectCourse, isSidebarOpen, onToggleSidebar }) {
  return (
    <header className="h-16 border-b border-[#E2D9CC] bg-[#FFFDF9]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl bg-[#F0EAE1] hover:bg-[#E2D9CC] text-[#2D3748] transition focus:outline-none cursor-pointer"
          title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        >
          {isSidebarOpen ? <X className="w-4 h-4 text-[#399283]" /> : <Menu className="w-4 h-4 text-[#4A5568]" />}
        </button>

        <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] border border-[#70C1B3]/40 flex items-center justify-center text-[#399283] font-bold shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>

        <div>
          <h1 className="font-extrabold text-sm sm:text-base text-[#2D3748] leading-tight flex items-center gap-2">
            <span>AI Study Companion</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6F4F1] text-[#399283] font-bold border border-[#70C1B3]/30 hidden sm:inline-block">
              Track D
            </span>
          </h1>
          <p className="text-[11px] text-[#718096] font-medium hidden sm:block">Source-Grounded Adaptive Learning</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Course Selector (Optional Global Course Filter) */}
        {courses && courses.length > 0 && (
          <div className="flex items-center gap-2 bg-[#F0EAE1]/80 border border-[#E2D9CC] p-1 pl-3 rounded-xl">
            <label className="text-xs text-[#718096] font-medium hidden md:block">Course:</label>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const c = courses.find((item) => item.id === e.target.value);
                if (c) onSelectCourse(c);
              }}
              className="bg-[#FFFDF9] border border-[#E2D9CC] text-[#2D3748] text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#70C1B3] max-w-[160px] truncate cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Profile Badge */}
        <div className="w-9 h-9 rounded-full bg-[#F2A679] text-white flex items-center justify-center text-xs font-bold shadow-2xs ring-2 ring-[#F2A679]/30">
          S
        </div>
      </div>
    </header>
  );
}
