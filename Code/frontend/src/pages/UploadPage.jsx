import React, { useEffect, useState } from 'react';
import { uploadDocument, getCourseDocuments, processDocument, deleteDocument } from '../services/api';
import { UploadCloud, FileText, Presentation, Video, CheckCircle, Clock, AlertCircle, Play, Trash2 } from 'lucide-react';

export default function UploadPage({ selectedCourse }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchDocs = () => {
    if (!selectedCourse?.id) return;
    setLoading(true);
    getCourseDocuments(selectedCourse.id)
      .then((data) => setDocuments(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, [selectedCourse]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedCourse?.id) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(selectedCourse.id, file);
      fetchDocs();
    } catch (err) {
      console.error(err);
      setError("Failed to upload document. Ensure file format is PDF, PPTX, or MP4.");
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async (docId) => {
    setProcessingId(docId);
    try {
      await processDocument(docId);
      fetchDocs();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this source document and all associated knowledge chunks?")) return;
    setDeletingId(docId);
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err) {
      console.error(err);
      setError("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderIcon = (type) => {
    if (type === 'pdf') return <FileText className="w-4 h-4 text-rose-400" />;
    if (type === 'pptx') return <Presentation className="w-4 h-4 text-amber-400" />;
    if (type === 'video') return <Video className="w-4 h-4 text-indigo-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const renderStatus = (status) => {
    if (status === 'Completed') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5" /> Processed
        </span>
      );
    }
    if (status === 'Processing') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 animate-pulse">
          <Clock className="w-3.5 h-3.5" /> Processing...
        </span>
      );
    }
    if (status === 'Failed') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" /> Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
        <Clock className="w-3.5 h-3.5" /> Pending
      </span>
    );
  };

  if (!selectedCourse) {
    return <div className="p-8 text-center text-slate-400">Select a course to upload sources.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12">
      <div className="p-6 glass-panel rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Upload Course Sources</h2>
        <p className="text-xs text-slate-400 font-medium">
          Upload PDF textbooks, PPTX slides, or MP4 lecture videos for automatic ingestion
        </p>
      </div>

      {error && <div className="p-4 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium shadow-md">{error}</div>}

      {/* Upload Drag & Drop Box */}
      <div className="p-10 glass-panel border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-2xl text-center space-y-4 transition-all duration-300 group shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-md group-hover:scale-110 transition-transform">
          <UploadCloud className="w-7 h-7 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100">Drag and drop or click to upload</p>
          <p className="text-xs text-slate-400 font-medium">Supports PDF, PPTX/PPT, MP4 (Max 100MB)</p>
        </div>
        <div>
          <label className="px-5 py-2.5 btn-glow-primary text-white rounded-xl text-xs font-bold cursor-pointer inline-block transition shadow-lg">
            {uploading ? 'Uploading...' : 'Choose File'}
            <input
              type="file"
              accept=".pdf,.pptx,.ppt,.mp4"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Document List */}
      <div className="p-6 glass-panel rounded-2xl space-y-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center justify-between pb-3 border-b border-slate-800">
          <span>Uploaded Sources</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {documents.length} Files
          </span>
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <div key={doc.id} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-4 transition">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                    {renderIcon(doc.source_type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{doc.title}</h4>
                    <p className="text-[11px] text-slate-400 capitalize font-medium">{doc.source_type} document</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {renderStatus(doc.status)}
                  {doc.status !== 'Completed' && (
                    <button
                      onClick={() => handleProcess(doc.id)}
                      disabled={processingId === doc.id || deletingId === doc.id}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 border border-slate-700 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 text-indigo-400" />
                      {processingId === doc.id ? 'Processing...' : 'Process Now'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    title="Delete source document"
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
