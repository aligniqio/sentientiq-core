// src/utils/isAppHost.ts
export const isAppHost = (h: string) =>
  h === 'localhost' || /(^|\.)sentientiq\.app$/i.test(h);