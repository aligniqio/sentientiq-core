// API Configuration
// Uses environment variables for production, falls back to localhost for development

export const API_CONFIG = {
  // Posts API - use relative URLs in production to leverage Netlify proxy
  POSTS_API: import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'),
  
  // Swarm API - use relative URLs in production to leverage Netlify proxy
  SWARM_API: import.meta.env.PROD ? '' : (import.meta.env.VITE_SWARM_API_URL || 'http://localhost:8003'),
  
  // Environment
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
};

// Helper function to build API URLs
export const buildApiUrl = (baseUrl: string, path: string): string => {
  return `${baseUrl}${path}`;
};

export default API_CONFIG;