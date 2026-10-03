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

export const deleteDocument = async (documentId) => {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
};

export const getCourseTopics = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/topics`);
  return response.data;
};

export const getConversations = async () => {
  const response = await api.get('/conversations');
  return response.data;
};

export const createConversation = async (data = {}) => {
  const response = await api.post('/conversations', data);
  return response.data;
};

export const getConversationDetails = async (conversationId) => {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
};

export const updateConversation = async (conversationId, data) => {
  const response = await api.patch(`/conversations/${conversationId}`, data);
  return response.data;
};

export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/conversations/${conversationId}`);
  return response.data;
};

export const postConversationChat = async (conversationId, question) => {
  const response = await api.post(`/conversations/${conversationId}/chat`, { question });
  return response.data;
};

export const uploadSourceToConversation = async (conversationId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/conversations/${conversationId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const attachDocumentToConversation = async (conversationId, documentId) => {
  const response = await api.post(`/conversations/${conversationId}/documents/${documentId}`);
  return response.data;
};

export const sendChatMessage = async (courseId, question, conversationId = null) => {
  if (conversationId) {
    return postConversationChat(conversationId, question);
  }
  const response = await api.post(`/courses/${courseId}/chat`, {
    question,
    conversation_id: conversationId,
  });
  return response.data;
};

export const getChatHistory = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/chat/history`);
  return response.data;
};

export const generateAssessment = async (courseId, params) => {
  const response = await api.post(`/courses/${courseId}/assessments/generate`, params);
  return response.data;
};

export const submitAssessment = async (assessmentId, answers, topicId = null) => {
  const response = await api.post(`/assessments/${assessmentId}/submit`, {
    answers,
    topic_id: topicId,
  });
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

export const getCourseConceptMap = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/concept-map`);
  return response.data;
};

export default api;
