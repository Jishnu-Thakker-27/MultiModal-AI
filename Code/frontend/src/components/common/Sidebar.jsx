import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  UploadCloud, 
  MessageSquare, 
  BrainCircuit, 
  TrendingUp, 
  FlaskConical,
  ChevronLeft
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Courses', path: '/courses', icon: FolderKanban },
  { name: 'Upload Sources', path: '/upload', icon: UploadCloud },
  { name: 'Learn / Tutor', path: '/tutor', icon: MessageSquare },
  { name: 'Practice', path: '/practice', icon: BrainCircuit },
  { name: 'Progress', path: '/progress', icon: TrendingUp },
  { name: 'Evaluation', path: '/evaluation', icon: FlaskConical },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Backdrop overlay for mobile when sidebar slides in */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sliding Sidebar Container */}
      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-40 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out transform ${
          isOpen
            ? 'translate-x-0 w-64 opacity-100'
            : '-translate-x-full lg:-translate-x-full w-0 lg:w-0 p-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Navigation Menu
            </span>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition"
              title="Slide Out"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    // Auto-close overlay on mobile
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-lg text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Track D Prototype</p>
          <p className="text-[11px] text-slate-500">Source Grounded RAG + Mastery</p>
        </div>
      </aside>
    </>
  );
}
