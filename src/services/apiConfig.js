// src/services/apiConfig.js
// Configuração centralizada da URL do backend
export const API_BASE_URL = (() => {
  // 1. Se houver variável explícita configurada (ex: backend dedicado no Render/Railway)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // 2. Se estiver rodando no navegador em produção (ex: Vercel / domínio em nuvem)
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    // Usa a mesma origem do Vercel onde as Serverless Functions /api estão hospedadas
    return window.location.origin;
  }

  // 3. Fallback para desenvolvimento local
  return 'http://localhost:3001';
})();
