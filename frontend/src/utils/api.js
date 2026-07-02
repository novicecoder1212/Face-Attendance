let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1);
}
export const API_URL = baseUrl;
