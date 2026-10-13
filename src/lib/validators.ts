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
 * Mapeamento e regras oficiais dos conselhos de classe da saúde no Brasil
 */
export interface CouncilRule {
  acronym: string;
  name: string;
  example: string;
  pattern: RegExp;
  forbiddenRegex: RegExp;
}

export const PROFESSION_COUNCIL_MAP: Record<string, CouncilRule> = {
  Fisioterapia: {
    acronym: 'CREFITO',
    name: 'Conselho Regional de Fisioterapia e Terapia Ocupacional',
    example: 'CREFITO-3/SP 88.340-F',
    pattern: /^CREFITO/i,
    forbiddenRegex: /\b(CRM|COREN|CRN|CRFa|CRP)\b/i
  },
  'Terapia Ocupacional': {
    acronym: 'CREFITO',
    name: 'Conselho Regional de Fisioterapia e Terapia Ocupacional',
    example: 'CREFITO-3/SP 12.340-TO',
    pattern: /^CREFITO/i,
    forbiddenRegex: /\b(CRM|COREN|CRN|CRFa|CRP)\b/i
  },
  Enfermagem: {
    acronym: 'COREN',
    name: 'Conselho Regional de Enfermagem',
    example: 'COREN-SP 230.110',
    pattern: /^COREN/i,
    forbiddenRegex: /\b(CRM|CREFITO|CRN|CRFa|CRP)\b/i
  },
  Medicina: {
    acronym: 'CRM',
    name: 'Conselho Regional de Medicina',
    example: 'CRM-SP 123.456',
    pattern: /^CRM/i,
    forbiddenRegex: /\b(CREFITO|COREN|CRN|CRFa|CRP)\b/i
  },
  Nutrição: {
    acronym: 'CRN',
    name: 'Conselho Regional de Nutricionistas',
    example: 'CRN-3/SP 45.190',
    pattern: /^CRN/i,
    forbiddenRegex: /\b(CRM|CREFITO|COREN|CRFa|CRP)\b/i
  },
  Fonoaudiologia: {
    acronym: 'CRFa',
    name: 'Conselho Regional de Fonoaudiologia',
    example: 'CRFa-SP 14.520',
    pattern: /^CRFa/i,
    forbiddenRegex: /\b(CRM|CREFITO|COREN|CRN|CRP)\b/i
  },
  Psicologia: {
    acronym: 'CRP',
    name: 'Conselho Regional de Psicologia',
    example: 'CRP-06/SP 98.760',
    pattern: /^CRP/i,
    forbiddenRegex: /\b(CRM|CREFITO|COREN|CRN|CRFa)\b/i
  }
};

/**
 * Validação de compatibilidade regulatória entre profissão e conselho de classe
 */
export function validateCouncilForProfession(
  profession?: string,
  councilNumber?: string
): { isValid: boolean; error?: string } {
  if (!profession || !councilNumber) {
    return { isValid: true };
  }

  const cleanProf = profession.trim();
  const cleanCouncil = councilNumber.trim();
  const rule = PROFESSION_COUNCIL_MAP[cleanProf];

  if (!rule) {
    return { isValid: cleanCouncil.length >= 4 };
  }

  // Detecta se usou a sigla de outro conselho indevidamente (ex: Fisioterapia com CRM)
  if (rule.forbiddenRegex.test(cleanCouncil)) {
    const matchedWrong = cleanCouncil.match(rule.forbiddenRegex)?.[0]?.toUpperCase() || 'outro conselho';
    return {
      isValid: false,
      error: `Inconsistência Regulatória: ${cleanProf} é regulamentada pelo ${rule.acronym}, não pelo ${matchedWrong}. Exemplo correto: ${rule.example}`
    };
  }

  // Verifica se contém a sigla oficial requerida
  if (!rule.pattern.test(cleanCouncil)) {
    return {
      isValid: false,
      error: `Registro Inválido: Para ${cleanProf}, o registro de classe deve conter a sigla oficial ${rule.acronym} (ex: ${rule.example}).`
    };
  }

  return { isValid: true };
}

/**
 * Regex estrito de e-mail corporativo em saúde: exige @, nome de domínio e extensão válida com no mínimo 2 letras
 */
export const CORPORATE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Schema estrito de validação com Zod para cadastro e credenciamento de profissionais de saúde
 */
export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(5, 'Nome completo deve ter pelo menos 5 caracteres')
      .refine(
        (val) => {
          const parts = val.trim().split(/\s+/);
          return parts.length >= 2 && parts.every((p) => p.length >= 2);
        },
        {
          message: 'Informe nome e sobrenome completos (ex: Dr. Henrique Silva)'
        }
      ),
    email: z
      .string()
      .email('E-mail em formato inválido')
      .regex(CORPORATE_EMAIL_REGEX, 'E-mail corporativo deve conter domínio e extensão válidos (ex: profissional@omnisaude.com.br)'),
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
  })
  .superRefine((data, ctx) => {
    // Validação cruzada estrita entre profissão e conselho
    if (data.profession && (data.councilNumber || data.crm)) {
      const council = (data.councilNumber || data.crm || '').trim();
      const check = validateCouncilForProfession(data.profession, council);
      if (!check.isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.error || 'Registro no conselho incompatível com a profissão informada',
          path: ['councilNumber']
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;
