// test/clinical-voice-parser.test.ts
import { describe, it, expect } from 'vitest';
import {
  extractVitalsFromSpokenText,
  parseClinicalVoiceNote
} from '../src/services/clinicalVoiceParser.js';

describe('Clinical Voice Parser - Voice-to-SOAP Engine', () => {
  it('deve estruturar com precisão o áudio enviado pela profissional ("Davi estável, boa saturação, conduta: sentado, mobilização de membro")', () => {
    const rawAudioSpoken = 'Ó, Davi estável, boa saturação, conduta: sentado, mobilização de membro';
    
    const result = parseClinicalVoiceNote(rawAudioSpoken, { patientName: 'Davi' });

    expect(result.patientNameHint).toBe('Davi');
    expect(result.vitals.oxygenSaturation).toBe(98);
    expect(result.detectedKeywords).toContain('Quadro Estável');
    expect(result.detectedKeywords).toContain('Sedestação / Sentado');
    expect(result.detectedKeywords).toContain('Mobilização de Membros');
    expect(result.detectedKeywords).toContain('SpO2 98%');

    // Verifica campos do SOAP
    expect(result.subjective).toContain('estável');
    expect(result.objective).toContain('SpO2: 98%');
    expect(result.plan).toContain('sedestação');
    expect(result.plan).toContain('mobilização');
    expect(result.summarizedConduct).toContain('Sedestação no leito + Mobilização de membros');
  });

  it('deve extrair sinais vitais numéricos falados em português oral (PA 12 por 8, FC 78, saturação 97%, afebril)', () => {
    const spoken = 'Paciente lúcida, afebril, PA 12 por 8, FC 78 batimentos, saturação de 97 por cento. Conduta realizada: treino de marcha com andador e orientada a cuidadora.';
    
    const vitals = extractVitalsFromSpokenText(spoken);
    expect(vitals.bloodPressure).toBe('120/80');
    expect(vitals.heartRate).toBe(78);
    expect(vitals.oxygenSaturation).toBe(97);
    expect(vitals.temperature).toBe(36.5);

    const parsed = parseClinicalVoiceNote(spoken, { patientName: 'Nilza' });
    expect(parsed.detectedKeywords).toContain('Treino de Marcha');
    expect(parsed.detectedKeywords).toContain('Orientação ao Cuidador');
    expect(parsed.plan).toContain('Treino de marcha');
    expect(parsed.plan).toContain('cuidador');
  });

  it('deve lidar com formatos de PA abreviados e glicemia', () => {
    const vitals = extractVitalsFromSpokenText('PA 130 por 85 e glicemia de 110');
    expect(vitals.bloodPressure).toBe('130/85');
    expect(vitals.glucose).toBe(110);
  });

  it('deve prover SOAP coerente mesmo quando a profissional falar poucas palavras', () => {
    const parsed = parseClinicalVoiceNote('Paciente bem, exercícios normais', { patientName: 'Carlos' });
    expect(parsed.subjective).toBeTruthy();
    expect(parsed.objective).toBeTruthy();
    expect(parsed.assessment).toBeTruthy();
    expect(parsed.plan).toBeTruthy();
    expect(parsed.summarizedConduct).toBeTruthy();
  });
});
