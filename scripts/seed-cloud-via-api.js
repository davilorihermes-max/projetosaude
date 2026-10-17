// scripts/seed-cloud-via-api.js
import { PROFESSIONALS, INITIAL_PATIENTS } from '../src/data/mockData.js';

const DOMAINS = [
  'https://projetosaude-gamma.vercel.app',
  'https://omnihomecare.vercel.app'
];

async function seedDomain(baseUrl) {
  console.log(`\n========================================================================`);
  console.log(`🚀 Populando dados na nuvem: ${baseUrl}`);
  console.log(`========================================================================`);

  // 1. Cadastra ou garante profissionais
  console.log(`\n📌 1. Enviando os 8 Fisioterapeutas da Grande Vitória...`);
  const proIdMap = {};

  for (const pro of PROFESSIONALS) {
    try {
      const res = await fetch(`${baseUrl}/api/scheduler/professionals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pro.name,
          email: pro.email,
          profession: pro.profession,
          specialty: pro.specialty,
          councilNumber: pro.councilNumber || pro.crm,
          crm: pro.crm,
          latitude: pro.baseCoordinates?.latitude,
          longitude: pro.baseCoordinates?.longitude
        })
      });

      const data = await res.json();
      if (res.ok && data.professional) {
        proIdMap[pro.id] = data.professional.id;
        console.log(`  ✓ Cadastrado: ${pro.name} [${pro.specialty}] -> ID: ${data.professional.id}`);
      } else if (res.status === 409) {
        console.log(`  ℹ Já existe: ${pro.name} (${pro.email})`);
      } else {
        console.warn(`  ⚠️ Resposta (${res.status}): ${pro.name} -`, data);
      }
    } catch (err) {
      console.error(`  ❌ Erro ao enviar ${pro.name}:`, err.message);
    }
  }

  // Busca lista atualizada de profissionais na nuvem para mapear IDs
  try {
    const listRes = await fetch(`${baseUrl}/api/scheduler/professionals`);
    const listData = await listRes.json();
    if (listData.professionals) {
      for (const p of listData.professionals) {
        const matchingMock = PROFESSIONALS.find(
          (m) => m.email.toLowerCase() === (p.user?.email || '').toLowerCase()
        );
        if (matchingMock) {
          proIdMap[matchingMock.id] = p.id;
        }
      }
    }
  } catch (err) {
    console.warn('  ⚠️ Falha ao buscar lista atualizada de profissionais:', err.message);
  }

  // 2. Cadastra os 7 pacientes
  console.log(`\n📌 2. Enviando os 7 Pacientes com Care Team da Grande Vitória...`);
  for (const pat of INITIAL_PATIENTS) {
    const mappedCareTeam = (pat.careTeamProfessionalIds || [])
      .map((mockId) => proIdMap[mockId] || mockId)
      .filter(Boolean);

    try {
      const res = await fetch(`${baseUrl}/api/scheduler/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pat.name,
          cpf: pat.cpf,
          email: pat.email,
          phone: pat.phone,
          address: pat.address,
          latitude: pat.latitude,
          longitude: pat.longitude,
          careTeamProfessionalIds: mappedCareTeam
        })
      });

      const data = await res.json();
      if (res.ok && data.patient) {
        console.log(`  ✓ Paciente salvo: ${pat.name} (${pat.address}) -> ID: ${data.patient.id}`);
      } else {
        console.warn(`  ⚠️ Resposta (${res.status}): ${pat.name} -`, data);
      }
    } catch (err) {
      console.error(`  ❌ Erro ao enviar paciente ${pat.name}:`, err.message);
    }
  }

  console.log(`\n✅ Concluído para ${baseUrl}!`);
}

async function main() {
  for (const domain of DOMAINS) {
    await seedDomain(domain);
  }
}

main().catch(console.error);
