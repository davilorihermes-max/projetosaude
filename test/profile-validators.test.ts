import { describe, it, expect } from 'vitest';
import { isValidCPF, RegisterSchema } from '../src/lib/validators.js';

describe('Healthcare Profile Creation & Security Validators', () => {
  describe('CPF Algorithmic Validation (Receita Federal)', () => {
    it('should validate valid CPFs correctly', () => {
      // Known valid test CPFs
      expect(isValidCPF('529.982.247-25')).toBe(true);
      expect(isValidCPF('52998224725')).toBe(true);
    });

    it('should reject invalid CPFs', () => {
      expect(isValidCPF('')).toBe(false);
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('000.000.000-00')).toBe(false);
      expect(isValidCPF('123.456.789-00')).toBe(false);
      expect(isValidCPF('123')).toBe(false);
    });
  });

  describe('RegisterSchema Validation Requirements', () => {
    it('should reject invalid names such as "n", single word or less than 5 chars', () => {
      const invalidNames = ['n', 'Dr', 'Davi', 'a b', '1234', '   '];
      for (const name of invalidNames) {
        const result = RegisterSchema.safeParse({
          name,
          email: 'davi@saude.com.br',
          password: 'Password123!'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.flatten().fieldErrors;
          expect(errors.name).toBeDefined();
        }
      }
    });

    it('should reject malformed or non-corporate emails such as "x@n", "test@", "@domain.com"', () => {
      const invalidEmails = ['x@n', 'test@', '@domain.com', 'user@domain', 'plainaddress', 'a@b.c'];
      for (const email of invalidEmails) {
        const result = RegisterSchema.safeParse({
          name: 'Dr. Henrique Silva',
          email,
          password: 'Password123!'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.flatten().fieldErrors;
          expect(errors.email).toBeDefined();
        }
      }
    });

    it('should reject regulatory council incoherence (e.g. Fisioterapia with CRM)', () => {
      // Fisioterapia MUST be CREFITO, NEVER CRM!
      const fisioWithCrm = RegisterSchema.safeParse({
        name: 'Dr. Henrique Silva',
        email: 'henrique.silva@omnisaude.med.br',
        password: 'Password123!',
        profession: 'Fisioterapia',
        councilNumber: 'CRM/SP 987654'
      });
      expect(fisioWithCrm.success).toBe(false);
      if (!fisioWithCrm.success) {
        const errs = fisioWithCrm.error.issues;
        expect(errs.some((i) => i.message.includes('CREFITO'))).toBe(true);
      }

      // Medicina MUST be CRM, NEVER CREFITO!
      const medWithCrefito = RegisterSchema.safeParse({
        name: 'Dra. Gabriela Souza',
        email: 'gabriela@omnisaude.med.br',
        password: 'Password123!',
        profession: 'Medicina',
        councilNumber: 'CREFITO-3/SP 88.340'
      });
      expect(medWithCrefito.success).toBe(false);

      // Enfermagem MUST be COREN, NEVER CRM!
      const enfWithCrm = RegisterSchema.safeParse({
        name: 'Enf. Juliana Mendes',
        email: 'juliana@omnisaude.med.br',
        password: 'Password123!',
        profession: 'Enfermagem',
        councilNumber: 'CRM-SP 123.456'
      });
      expect(enfWithCrm.success).toBe(false);
    });

    it('should accept valid matching councils for each profession', () => {
      const validPairs = [
        { profession: 'Fisioterapia', council: 'CREFITO-3/SP 88.340-F' },
        { profession: 'Medicina', council: 'CRM-SP 123.456' },
        { profession: 'Enfermagem', council: 'COREN-SP 230.110' },
        { profession: 'Nutrição', council: 'CRN-3/SP 45.190' },
        { profession: 'Fonoaudiologia', council: 'CRFa-SP 14.520' },
        { profession: 'Psicologia', council: 'CRP-06/SP 98.760' }
      ];

      for (const pair of validPairs) {
        const result = RegisterSchema.safeParse({
          name: 'Profissional da Saúde',
          email: 'profissional@omnisaude.med.br',
          password: 'Password123!',
          profession: pair.profession,
          specialty: 'Atendimento Domiciliar',
          councilNumber: pair.council
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject weak passwords missing uppercase, lowercase, numbers or symbols', () => {
      const weakPasswords = [
        'short1!',         // too short (< 8)
        'password123!',     // no uppercase
        'PASSWORD123!',     // no lowercase
        'PasswordText!',    // no number
        'Password12345'     // no special char
      ];

      for (const pwd of weakPasswords) {
        const result = RegisterSchema.safeParse({
          name: 'Dr. Roberto Carlos',
          email: 'roberto@saude.com.br',
          password: pwd
        });
        expect(result.success).toBe(false);
      }
    });

    it('should accept robust clinical registration payloads', () => {
      const result = RegisterSchema.safeParse({
        name: 'Dra. Gabriela Souza',
        email: 'gabriela.souza@hospital.com.br',
        password: 'HospitalSec@2026',
        profession: 'Medicina',
        specialty: 'Pediatria Neonatal',
        councilNumber: 'CRM/RJ 204910',
        cpf: '529.982.247-25',
        phone: '(21) 99876-5432'
      });

      expect(result.success).toBe(true);
    });
  });
});
