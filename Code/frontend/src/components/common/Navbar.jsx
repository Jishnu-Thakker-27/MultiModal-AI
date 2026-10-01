import React from 'react';
import { BookOpen, Menu, X } from 'lucide-react';

export default function Navbar({ selectedCourse, courses, onSelectCourse, isSidebarOpen, onToggleSidebar }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Slide-in / Slide-out Menu Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none"
          title={isSidebarOpen ? "Slide Out Navigation" : "Slide In Navigation"}
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5 text-slate-300" />}
        </button>

        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-100 text-sm leading-tight flex items-center gap-2">
            AI Study Companion
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium hidden sm:inline-block">
              MVP
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">Source-Grounded Mastery Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Course Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium hidden md:block">Active Course:</label>
          <select
            value={selectedCourse?.id || ''}
            onChange={(e) => {
              const c = courses.find((item) => item.id === e.target.value);
              if (c) onSelectCourse(c);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[180px] sm:max-w-none truncate"
          >
            {courses.length === 0 ? (
              <option value="">No courses created yet</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-600/20">
          S
        </div>
      </div>
    </header>
  );
}
