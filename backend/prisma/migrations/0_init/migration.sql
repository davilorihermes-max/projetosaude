-- ============================================================================
-- PROJETO SAÚDE - DDL DE INICIALIZAÇÃO, EXTENSÕES, TRIGGERS E POLÍTICAS DE RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Funções auxiliares para leitura de contexto de sessão da aplicação (JWT / RLS)
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_app_user_role() RETURNS TEXT AS $$
  SELECT current_setting('app.current_user_role', true);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_professional_id() RETURNS UUID AS $$
  SELECT id FROM professionals WHERE user_id = current_app_user_id() LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Trigger: Enforce Care Team Integrity on Schedule
CREATE OR REPLACE FUNCTION check_care_team_schedule_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM patient_care_team
    WHERE patient_id = NEW.patient_id
      AND professional_id = NEW.professional_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'VIOLAÇÃO DE CARE TEAM: O profissional % não pertence à equipe ativa do paciente %.',
      NEW.professional_id, NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatic UpdatedAt
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
