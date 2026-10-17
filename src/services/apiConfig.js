// src/services/apiConfig.js
// Configuração centralizada da URL do backend.
// O frontend usa SEMPRE o backend em nuvem (Vercel Serverless + Neon Postgres),
// inclusive quando a UI roda localmente via `npm run dev`. Não há fallback para servidor local.

// Backend oficial em nuvem (mesma URL usada pelo app mobile em mobile/src/services/storage.ts)
export const CLOUD_API_URL = 'https://omnihomecare.vercel.app';

export const API_BASE_URL = (() => {
  // 1. Override explícito para outro deploy em nuvem (ex: preview da Vercel)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // 2. Rodando em um domínio da nuvem (produção, staging ou preview): usa a mesma origem,
  //    onde as Serverless Functions /api estão hospedadas
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return window.location.origin;
  }

  // 3. UI rodando localmente: aponta para o backend em nuvem
  return CLOUD_API_URL;
})();
