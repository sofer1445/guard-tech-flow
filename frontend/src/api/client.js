/// <reference types="vite/client" />

import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

const normalizeCategory = (category) => ({
  ...category,
  id: category.id ?? category._id,
});

const normalizeReport = (report) => ({
  ...report,
  id: report.id ?? report._id,
});

const normalizeCommander = (commander) => ({
  ...commander,
  id: commander.userId,
});

export const fetchCategories = async () => {
  const response = await apiClient.get('/categories');
  const categories = response?.data?.data ?? [];
  return categories.map(normalizeCategory);
};

export const addCategory = async (name) => {
  const response = await apiClient.post('/categories', { name });
  return response?.data?.data ? normalizeCategory(response.data.data) : response.data;
};

export const deleteCategory = async (name) => {
  const response = await apiClient.delete(`/categories/${name}`);
  return response.data;
};

export const fetchReports = async () => {
  const response = await apiClient.get('/reports');
  const reports = response?.data?.data ?? [];
  return reports.map(normalizeReport);
};

export const fetchCommanders = async () => {
  const response = await apiClient.get('/users/commanders');
  const commanders = response?.data?.data ?? [];
  return commanders.map(normalizeCommander);
};

export const submitReport = async (data) => {
  const response = await apiClient.post('/reports', data);
  return response.data;
};

export const approveReport = async (data) => {
  const response = await apiClient.post('/reports/approve', data);
  return response.data;
};
