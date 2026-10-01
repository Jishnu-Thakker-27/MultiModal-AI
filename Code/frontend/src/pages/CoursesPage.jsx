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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Course Management</h2>
        <p className="text-xs text-slate-400">Create and switch between active study courses</p>
      </div>

      {/* Create Course Form */}
      <form onSubmit={handleSubmit} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-400" />
          Create New Course
        </h3>

        {error && <div className="text-xs text-rose-400">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Course Title *</label>
            <input
              type="text"
              placeholder="e.g. Data Structures & Algorithms"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Core CS concepts, binary trees, graphs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition flex items-center gap-2"
        >
          {creating ? 'Creating...' : 'Create Course'}
        </button>
      </form>

      {/* Courses List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">Available Courses ({courses.length})</h3>

        {courses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-xl">
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
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-600/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-100">{c.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{c.description || 'No description'}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
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
