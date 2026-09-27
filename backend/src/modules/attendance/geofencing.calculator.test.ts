import { GeofencingCalculator } from './geofencing.calculator';
import { GeoPoint } from './attendance.types';

function runGeofencingUnitTests() {
  console.log('🧪 Iniciando testes unitários de Geofencing e Check-in...');

  // Coordenadas base: Exemplo na Av. Paulista, São Paulo
  const patientHome: GeoPoint = {
    latitude: -23.561414,
    longitude: -46.655881
  };

  // Ponto a aproximadamente 45 metros de distância (dentro do raio de 150m)
  const nearbyCheckIn: GeoPoint = {
    latitude: -23.561600,
    longitude: -46.655500
  };

  // Ponto a aproximadamente 600 metros de distância (claramente fora do raio de 150m)
  const farAwayCheckIn: GeoPoint = {
    latitude: -23.566000,
    longitude: -46.651000
  };

  // Teste 1: Cálculo de distância próxima
  const distNear = GeofencingCalculator.calculateDistanceMeters(patientHome, nearbyCheckIn);
  if (distNear > 150 || distNear < 10) {
    throw new Error(`Falha no cálculo de distância próxima: obtido ${distNear}m`);
  }
  console.log(`  ✅ Distância de ponto próximo calculada corretamente: ${distNear}m`);

  // Teste 2: Avaliação de Check-in no local (< 150m) -> ON_SITE_VALIDATED
  const assessNear = GeofencingCalculator.assessCheckIn(nearbyCheckIn, patientHome);
  if (assessNear.status !== 'ON_SITE_VALIDATED' || !assessNear.isWithinGeofence) {
    throw new Error(`Falha no Teste 2: esperado ON_SITE_VALIDATED, obtido ${assessNear.status}`);
  }
  console.log('  ✅ Check-in dentro do raio validado como ON_SITE_VALIDATED com sucesso.');

  // Teste 3: Check-in fora do raio sem justificativa -> deve lançar erro
  let errorCaught = false;
  try {
    GeofencingCalculator.assessCheckIn(farAwayCheckIn, patientHome);
  } catch (err: any) {
    errorCaught = true;
    console.log(`  ✅ Check-in fora do raio sem justificativa bloqueado com sucesso: "${err.message}"`);
  }
  if (!errorCaught) {
    throw new Error('Falha no Teste 3: check-in fora do raio deveria ter sido bloqueado!');
  }

  // Teste 4: Check-in fora do raio com justificativa aceita -> OUT_OF_BOUNDS_ACCEPTED
  const assessFarWithReason = GeofencingCalculator.assessCheckIn(
    farAwayCheckIn,
    patientHome,
    'Sessão realizada no parque ao lado do condomínio a pedido da família'
  );
  if (assessFarWithReason.status !== 'OUT_OF_BOUNDS_ACCEPTED' || assessFarWithReason.isWithinGeofence) {
    throw new Error(`Falha no Teste 4: esperado OUT_OF_BOUNDS_ACCEPTED, obtido ${assessFarWithReason.status}`);
  }
  console.log('  ✅ Check-in fora do raio com justificativa aceito como OUT_OF_BOUNDS_ACCEPTED.');

  // Teste 5: Sobrescrita manual administrativa -> MANUAL_OVERRIDE
  const assessManual = GeofencingCalculator.assessCheckIn(
    farAwayCheckIn,
    patientHome,
    undefined,
    true
  );
  if (assessManual.status !== 'MANUAL_OVERRIDE') {
    throw new Error(`Falha no Teste 5: esperado MANUAL_OVERRIDE, obtido ${assessManual.status}`);
  }
  console.log('  ✅ Sobrescrita manual administrativa validada como MANUAL_OVERRIDE.');

  console.log('🎉 Todos os testes de geofencing passaram com 100% de sucesso!');
}

runGeofencingUnitTests();
