import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getCourses = async () => {
  const response = await api.get('/courses');
  return response.data;
};

export const createCourse = async (courseData) => {
  const response = await api.post('/courses', courseData);
  return response.data;
};

export const getCourseDetails = async (courseId) => {
  const response = await api.get(`/courses/${courseId}`);
  return response.data;
};

export const uploadDocument = async (courseId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/courses/${courseId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getCourseDocuments = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/documents`);
  return response.data;
};

export const processDocument = async (documentId) => {
  const response = await api.post(`/documents/${documentId}/process`);
  return response.data;
};

export const getCourseTopics = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/topics`);
  return response.data;
};

export const sendChatMessage = async (courseId, question, conversationId = null) => {
  const response = await api.post(`/courses/${courseId}/chat`, {
    question,
    conversation_id: conversationId,
  });
  return response.data;
};

export const generateAssessment = async (courseId, params) => {
  const response = await api.post(`/courses/${courseId}/assessments/generate`, params);
  return response.data;
};

export const submitAssessment = async (assessmentId, answers) => {
  const response = await api.post(`/assessments/${assessmentId}/submit`, { answers });
  return response.data;
};

export const getCourseMastery = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/mastery`);
  return response.data;
};

export const getCourseDashboard = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/dashboard`);
  return response.data;
};

export const runEvaluation = async () => {
  const response = await api.post('/evaluation/run');
  return response.data;
};

export default api;
