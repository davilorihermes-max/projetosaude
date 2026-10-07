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
    it('should reject when name has less than 2 words or is too short', () => {
      const result = RegisterSchema.safeParse({
        name: 'Davi',
        email: 'davi@saude.com.br',
        password: 'Password123!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.name).toBeDefined();
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
        profession: 'MEDICINA',
        specialty: 'Pediatria Neonatal',
        councilNumber: 'CRM/RJ 204910',
        cpf: '529.982.247-25',
        phone: '(21) 99876-5432'
      });

      expect(result.success).toBe(true);
    });
  });
});
