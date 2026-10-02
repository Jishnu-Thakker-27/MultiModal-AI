import React from 'react';
import { BookOpen, Menu, X } from 'lucide-react';

export default function Navbar({ selectedCourse, courses, onSelectCourse, isSidebarOpen, onToggleSidebar }) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3.5">
        {/* Slide-in / Slide-out Menu Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-slate-800 transition duration-200 focus:outline-none shadow-inner"
          title={isSidebarOpen ? "Slide Out Navigation" : "Slide In Navigation"}
        >
          {isSidebarOpen ? <X className="w-4 h-4 text-indigo-400" /> : <Menu className="w-4 h-4 text-slate-300" />}
        </button>

        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0 shadow-md shadow-indigo-500/10">
          <BookOpen className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="font-bold tracking-tight text-slate-100 text-sm sm:text-base leading-tight flex items-center gap-2">
            <span className="gradient-text-indigo font-extrabold">AI Study Companion</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-300 border border-indigo-500/30 font-semibold hidden sm:inline-block shadow-xs">
              MVP
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Source-Grounded Mastery Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Course Selector */}
        <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-800 p-1 pl-3 rounded-xl shadow-inner">
          <label className="text-xs text-slate-400 font-medium hidden md:block">Active Course:</label>
          <select
            value={selectedCourse?.id || ''}
            onChange={(e) => {
              const c = courses.find((item) => item.id === e.target.value);
              if (c) onSelectCourse(c);
            }}
            className="bg-slate-950 border border-slate-700/80 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[180px] sm:max-w-none truncate cursor-pointer transition hover:border-slate-600"
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

        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20">
          S
        </div>
      </div>
    </header>
  );
}
