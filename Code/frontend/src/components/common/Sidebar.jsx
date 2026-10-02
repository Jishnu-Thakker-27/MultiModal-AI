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
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sliding Sidebar Container */}
      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-40 bg-[#0d1322]/90 border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out transform ${
          isOpen
            ? 'translate-x-0 w-64 opacity-100'
            : '-translate-x-full lg:-translate-x-full w-0 lg:w-0 p-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/60 transition"
              title="Slide Out"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-600/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-glow" />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'
                      }`} />
                      <span className="truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-slate-900/90 to-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-slate-400 space-y-1 shadow-inner">
          <p className="font-bold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Track D Prototype
          </p>
          <p className="text-[11px] text-slate-400 font-medium">Source Grounded RAG + Mastery</p>
        </div>
      </aside>
    </>
  );
}
