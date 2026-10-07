// src/lib/validators.ts
import { z } from 'zod';

/**
 * Validação algorítmica de CPF (dígitos verificadores da Receita Federal)
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Schema estrito de validação com Zod para cadastro e credenciamento de profissionais de saúde
 */
export const RegisterSchema = z.object({
  name: z
    .string()
    .min(5, 'Nome completo deve ter pelo menos 5 caracteres')
    .refine((val) => val.trim().split(/\s+/).length >= 2, {
      message: 'Informe nome e sobrenome completos (ex: Dra. Camila Nogueira)'
    }),
  email: z
    .string()
    .email('E-mail corporativo em formato inválido (ex: camila@omnisaude.com.br)'),
  password: z
    .string()
    .min(8, 'A senha deve conter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter ao menos um número')
    .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um caractere especial (!@#$%^&*...)'),
  role: z.string().default('PROFESSIONAL'),
  profession: z.string().min(3, 'Selecione a profissão de atuação multidisciplinar').optional(),
  specialty: z.string().min(4, 'Especialidade clínica deve ter pelo menos 4 caracteres').optional(),
  councilNumber: z.string().min(4, 'Registro no conselho é obrigatório (mínimo 4 caracteres)').optional(),
  crm: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((val) => !val || isValidCPF(val), {
      message: 'CPF informado é inválido pelo algoritmo da Receita Federal'
    }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || val.replace(/\D/g, '').length >= 10, {
      message: 'Telefone com DDD deve conter pelo menos 10 dígitos'
    }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  linkToCareTeams: z.boolean().default(true)
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
