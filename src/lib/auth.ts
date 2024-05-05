import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.API_TOKEN ? process.env.API_TOKEN : 'API Token Not Set';
const AUTH_HEADERS = { Authorization: `Bearer ${API_TOKEN}` };

export const getAuthHeaders = (): Record<string, string> => {
  return AUTH_HEADERS;
};
