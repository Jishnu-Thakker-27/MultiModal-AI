import React, { useEffect, useState } from 'react';
import { uploadDocument, getCourseDocuments, processDocument } from '../services/api';
import { UploadCloud, FileText, Presentation, Video, CheckCircle, Clock, AlertCircle, Play } from 'lucide-react';

export default function UploadPage({ selectedCourse }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Upload Course Sources</h2>
        <p className="text-xs text-slate-400">
          Upload PDF textbooks, PPTX slides, or MP4 lecture videos for automatic ingestion
        </p>
      </div>

      {error && <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs text-rose-300">{error}</div>}

      {/* Upload Box */}
      <div className="p-8 bg-slate-900 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl text-center space-y-3 transition">
        <div className="w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">Drag and drop or click to upload</p>
          <p className="text-xs text-slate-400">Supports PDF, PPTX/PPT, MP4 (Max 100MB)</p>
        </div>
        <div>
          <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer inline-block transition shadow-md shadow-indigo-600/20">
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
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">
          Uploaded Sources ({documents.length})
        </h3>

        {loading ? (
          <p className="text-xs text-slate-500 text-center py-4">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No documents uploaded yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    {renderIcon(doc.source_type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-slate-200">{doc.title}</h4>
                    <p className="text-[11px] text-slate-500 capitalize">{doc.source_type} document</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {renderStatus(doc.status)}
                  {doc.status !== 'Completed' && (
                    <button
                      onClick={() => handleProcess(doc.id)}
                      disabled={processingId === doc.id}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md transition flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 text-indigo-400" />
                      {processingId === doc.id ? 'Processing...' : 'Process Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
