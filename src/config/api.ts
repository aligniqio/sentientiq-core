// API Configuration
// Dead APIs removed - no more localhost:8002/8003 connections

export const API_CONFIG = {
  // Posts API - DISABLED (dead service)
  POSTS_API: '',
  
  // Swarm API - DISABLED (dead service)  
  SWARM_API: '',
  
  // Environment
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
};

// Helper function to build API URLs
export const buildApiUrl = (baseUrl: string, path: string): string => {
  return `${baseUrl}${path}`;
};

export default API_CONFIG;