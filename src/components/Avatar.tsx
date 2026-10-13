// src/components/Avatar.tsx
import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

const GRADIENT_PALETTES = [
  'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', // teal
  'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', // sky
  'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // blue
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', // violet
  'linear-gradient(135deg, #059669 0%, #047857 100%)', // emerald
  'linear-gradient(135deg, #d97706 0%, #b45309 100%)', // amber
  'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', // rose
  'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', // indigo
];

/**
 * Extrai iniciais elegantes a partir do nome (ex: "Dra. Camila Nogueira" -> "CN", "Henrique" -> "HE")
 */
export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  const clean = name
    .replace(/^(dr\.|dra\.|enf\.|ft\.|fono\.|nutri\.|prof\.|sr\.|sra\.)\s+/i, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Retorna gradiente determinístico e harmonioso a partir do nome
 */
export function getGradientForName(name?: string | null): string {
  if (!name) return GRADIENT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Componente de Avatar robusto para ambiente de saúde:
 * - Carrega a imagem com tratamento de erro (onError) para nunca exibir ícone quebrado do navegador.
 * - Caso não haja imagem ou o carregamento falhe, renderiza badge profissional com as iniciais do usuário
 *   ou ícone médico sobre gradiente estilizado.
 */
export default function Avatar({
  src,
  name = '',
  size = 40,
  color,
  className = '',
  style = {},
  alt
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 40;
  const initials = getInitials(name);

  const bgStyle = color
    ? `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), rgba(0,0,0,0.2)), ${color}`
    : getGradientForName(name);

  // Se tem src válida e não ocorreu erro de rede
  if (src && typeof src === 'string' && src.trim() !== '' && !hasError) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={className}
        onError={() => setHasError(true)}
        style={{
          width: `${numSize}px`,
          height: `${numSize}px`,
          minWidth: `${numSize}px`,
          minHeight: `${numSize}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          flexShrink: 0,
          ...style
        }}
      />
    );
  }

  // Fallback seguro: Iniciais ou ícone estilizado sem jamais quebrar o layout
  return (
    <div
      className={className}
      title={name}
      aria-label={name || 'Avatar do usuário'}
      style={{
        width: `${numSize}px`,
        height: `${numSize}px`,
        minWidth: `${numSize}px`,
        minHeight: `${numSize}px`,
        borderRadius: '50%',
        background: bgStyle,
        color: '#ffffff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${Math.max(11, Math.round(numSize * 0.4))}px`,
        letterSpacing: '0.03em',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 1px 3px rgba(0, 0, 0, 0.12)',
        ...style
      }}
    >
      {initials ? initials : <User size={Math.round(numSize * 0.5)} color="#ffffff" />}
    </div>
  );
}
