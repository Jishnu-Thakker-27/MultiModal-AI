import React, { useEffect, useState } from 'react';
import { uploadDocument, getCourseDocuments, processDocument, deleteDocument } from '../services/api';
import { UploadCloud, FileText, Presentation, Video, CheckCircle, Clock, AlertCircle, Play, Trash2, Layers } from 'lucide-react';

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
    if (!window.confirm("Are you sure you want to delete this source document?")) return;
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
    if (type === 'pdf') return <FileText className="w-4 h-4 text-rose-500" />;
    if (type === 'pptx') return <Presentation className="w-4 h-4 text-amber-500" />;
    if (type === 'video') return <Video className="w-4 h-4 text-[#399283]" />;
    return <FileText className="w-4 h-4 text-[#718096]" />;
  };

  const renderStatus = (status) => {
    if (status === 'Completed') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-[#399283] bg-[#E6F4F1] px-2.5 py-0.5 rounded-full border border-[#70C1B3]/30">
          <CheckCircle className="w-3.5 h-3.5" /> Processed
        </span>
      );
    }
    if (status === 'Processing') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-[#399283] bg-[#E6F4F1] px-2.5 py-0.5 rounded-full border border-[#70C1B3]/30 animate-pulse">
          <Clock className="w-3.5 h-3.5" /> Processing...
        </span>
      );
    }
    if (status === 'Failed') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
          <AlertCircle className="w-3.5 h-3.5" /> Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#718096] bg-[#F0EAE1] px-2.5 py-0.5 rounded-full border border-[#E2D9CC]">
        <Clock className="w-3.5 h-3.5" /> Pending
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12 bg-[#F7F3ED] text-[#2D3748] min-h-full">
      <div className="p-6 pastel-card bg-[#FFFDF9] space-y-2 border-[#E2D9CC]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E6F4F1] border border-[#70C1B3]/30 flex items-center justify-center text-[#399283]">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2D3748]">Course Sources Repository</h2>
            <p className="text-xs text-[#718096]">Global document repository for course materials and textbooks</p>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold">{error}</div>}

      {/* Upload Box */}
      <div className="p-8 pastel-card border-2 border-dashed border-[#E2D9CC] hover:border-[#70C1B3] rounded-2xl text-center space-y-4 transition bg-[#FFFDF9]">
        <div className="w-12 h-12 rounded-2xl bg-[#E6F4F1] text-[#399283] border border-[#70C1B3]/30 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#2D3748]">Upload PDF, PPTX, or Video Files</p>
          <p className="text-xs text-[#718096]">Supported formats: PDF textbooks, PPTX slides, MP4 videos</p>
        </div>
        <div>
          <label className="px-5 py-2.5 bg-[#48A999] hover:bg-[#399283] text-white rounded-xl text-xs font-bold cursor-pointer inline-block transition shadow-2xs">
            {uploading ? 'Uploading File...' : 'Browse Local File'}
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
      <div className="p-6 pastel-card space-y-5 bg-[#FFFDF9] border-[#E2D9CC]">
        <h3 className="text-sm font-bold text-[#2D3748] tracking-wide flex items-center justify-between pb-3 border-b border-[#E2D9CC]">
          <span>Uploaded Sources List</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F0EAE1] text-[#2D3748] border border-[#E2D9CC] font-bold">
            {documents.length} Files
          </span>
        </h3>

        {loading ? (
          <p className="text-xs text-[#718096] text-center py-6">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-[#718096] text-center py-6">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <div key={doc.id} className="p-3.5 rounded-xl bg-[#F0EAE1]/50 border border-[#E2D9CC] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E2D9CC]">
                    {renderIcon(doc.source_type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2D3748]">{doc.title}</h4>
                    <p className="text-[11px] text-[#718096] uppercase font-semibold">{doc.source_type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {renderStatus(doc.status)}
                  {doc.status !== 'Completed' && (
                    <button
                      onClick={() => handleProcess(doc.id)}
                      disabled={processingId === doc.id || deletingId === doc.id}
                      className="px-3.5 py-1.5 bg-[#48A999] hover:bg-[#399283] text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                      {processingId === doc.id ? 'Processing...' : 'Process Now'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-lg transition cursor-pointer"
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
