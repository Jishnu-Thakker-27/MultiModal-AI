import React, { useState } from 'react';
import { createCourse } from '../services/api';
import { Plus, BookOpen, Check } from 'lucide-react';

export default function CoursesPage({ courses, onCourseCreated, selectedCourse, onSelectCourse }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const newCourse = await createCourse({ title, description });
      setTitle('');
      setDescription('');
      setError(null);
      onCourseCreated(newCourse);
    } catch (err) {
      console.error(err);
      setError("Failed to create course. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12">
      <div className="p-6 glass-panel rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Course Management</h2>
        <p className="text-xs text-slate-400 font-medium">Create and switch between active study courses</p>
      </div>

      {/* Create Course Form */}
      <form onSubmit={handleSubmit} className="p-6 glass-panel rounded-2xl space-y-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 tracking-wide pb-3 border-b border-slate-800">
          <Plus className="w-4.5 h-4.5 text-indigo-400" />
          Create New Course
        </h3>

        {error && <div className="text-xs text-rose-400 font-medium">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Course Title *</label>
            <input
              type="text"
              placeholder="e.g. Data Structures & Algorithms"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Core CS concepts, binary trees, graphs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="px-5 py-2.5 btn-glow-primary disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
        >
          {creating ? 'Creating...' : 'Create Course'}
        </button>
      </form>

      {/* Courses List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-100 tracking-wide">Available Courses ({courses.length})</h3>

        {courses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 glass-panel rounded-2xl">
            No courses found. Create your first course above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courses.map((c) => {
              const isSelected = selectedCourse?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCourse(c)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border-indigo-500/60 shadow-xl shadow-indigo-600/10 ring-1 ring-indigo-500/30'
                      : 'glass-panel glass-panel-hover'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs shadow-xs">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{c.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 font-medium">{c.description || 'No description'}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="p-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
