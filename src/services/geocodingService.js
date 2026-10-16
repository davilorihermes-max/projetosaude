// src/services/geocodingService.js
/**
 * Serviço Universal de Geocodificação e Resolução de Coordenadas Geodésicas
 * Abrange todo o território brasileiro (Capitais, Regiões Metropolitanas e Interior)
 */

export const BRAZIL_REGIONS = [
  {
    state: 'SP',
    stateName: 'São Paulo',
    presets: [
      { name: 'Cerqueira César / Paulista (SP)', address: 'Alameda Santos, 1200 - Cerqueira César, São Paulo - SP', latitude: -23.563099, longitude: -46.654271 },
      { name: 'Pinheiros (SP)', address: 'Rua Fradique Coutinho, 800 - Pinheiros, São Paulo - SP', latitude: -23.567300, longitude: -46.693400 },
      { name: 'Moema (SP)', address: 'Av. Moema, 450 - Moema, São Paulo - SP', latitude: -23.602200, longitude: -46.662100 },
      { name: 'Vila Mariana (SP)', address: 'Rua Domingos de Morais, 800 - Vila Mariana, São Paulo - SP', latitude: -23.585000, longitude: -46.638000 },
      { name: 'Santana (SP)', address: 'Rua Voluntários da Pátria, 1500 - Santana, São Paulo - SP', latitude: -23.502100, longitude: -46.627800 },
      { name: 'Tatuapé (SP)', address: 'Rua Tuiuti, 1800 - Tatuapé, São Paulo - SP', latitude: -23.538000, longitude: -46.578000 },
      { name: 'Campinas (SP)', address: 'Av. José de Souza Campos, 500 - Cambuí, Campinas - SP', latitude: -22.898400, longitude: -47.051900 },
      { name: 'Santos (SP)', address: 'Av. Ana Costa, 400 - Gonzaga, Santos - SP', latitude: -23.964700, longitude: -46.333600 },
      { name: 'Ribeirão Preto (SP)', address: 'Av. Nove de Julho, 800 - Centro, Ribeirão Preto - SP', latitude: -21.178900, longitude: -47.811400 }
    ]
  },
  {
    state: 'RJ',
    stateName: 'Rio de Janeiro',
    presets: [
      { name: 'Copacabana (RJ)', address: 'Av. Atlântica, 1500 - Copacabana, Rio de Janeiro - RJ', latitude: -22.971100, longitude: -43.182500 },
      { name: 'Ipanema / Leblon (RJ)', address: 'Rua Visconde de Pirajá, 300 - Ipanema, Rio de Janeiro - RJ', latitude: -22.984400, longitude: -43.200300 },
      { name: 'Barra da Tijuca (RJ)', address: 'Av. das Américas, 3500 - Barra da Tijuca, Rio de Janeiro - RJ', latitude: -22.999700, longitude: -43.365900 },
      { name: 'Botafogo (RJ)', address: 'Rua Voluntários da Pátria, 200 - Botafogo, Rio de Janeiro - RJ', latitude: -22.951900, longitude: -43.184200 },
      { name: 'Tijuca (RJ)', address: 'Rua Conde de Bonfim, 400 - Tijuca, Rio de Janeiro - RJ', latitude: -22.925400, longitude: -43.235900 },
      { name: 'Niterói (Icaraí - RJ)', address: 'Praia de Icaraí, 250 - Icaraí, Niterói - RJ', latitude: -22.905600, longitude: -43.111900 }
    ]
  },
  {
    state: 'PR',
    stateName: 'Paraná (Curitiba & Região)',
    presets: [
      { name: 'Batel (Curitiba - PR)', address: 'Av. do Batel, 1500 - Batel, Curitiba - PR', latitude: -25.442800, longitude: -49.288900 },
      { name: 'Centro Cívico (Curitiba - PR)', address: 'Av. Cândido de Abreu, 500 - Centro Cívico, Curitiba - PR', latitude: -25.417200, longitude: -49.269400 },
      { name: 'Água Verde (Curitiba - PR)', address: 'Av. República Argentina, 1200 - Água Verde, Curitiba - PR', latitude: -25.452200, longitude: -49.281900 },
      { name: 'Bigorrilho (Curitiba - PR)', address: 'Rua Padre Anchieta, 1800 - Bigorrilho, Curitiba - PR', latitude: -25.433100, longitude: -49.301200 },
      { name: 'Londrina (PR)', address: 'Av. Higienópolis, 800 - Centro, Londrina - PR', latitude: -23.315000, longitude: -51.162500 },
      { name: 'Maringá (PR)', address: 'Av. Brasil, 3200 - Zona 01, Maringá - PR', latitude: -23.420999, longitude: -51.933056 }
    ]
  },
  {
    state: 'MG',
    stateName: 'Minas Gerais (Belo Horizonte)',
    presets: [
      { name: 'Savassi (BH - MG)', address: 'Av. Cristóvão Colombo, 500 - Savassi, Belo Horizonte - MG', latitude: -19.938600, longitude: -43.933300 },
      { name: 'Lourdes (BH - MG)', address: 'Rua da Bahia, 1800 - Lourdes, Belo Horizonte - MG', latitude: -19.928100, longitude: -43.945800 },
      { name: 'Funcionários (BH - MG)', address: 'Av. Getúlio Vargas, 1000 - Funcionários, Belo Horizonte - MG', latitude: -19.933900, longitude: -43.929200 },
      { name: 'Pampulha (BH - MG)', address: 'Av. Otacílio Negrão de Lima, 3000 - Pampulha, Belo Horizonte - MG', latitude: -19.851900, longitude: -43.974400 },
      { name: 'Uberlândia (MG)', address: 'Av. Rondon Pacheco, 2000 - Tibery, Uberlândia - MG', latitude: -18.918600, longitude: -48.277200 }
    ]
  },
  {
    state: 'DF',
    stateName: 'Distrito Federal (Brasília)',
    presets: [
      { name: 'Asa Sul (Brasília - DF)', address: 'SHCS EQS 208/408 - Asa Sul, Brasília - DF', latitude: -15.811400, longitude: -47.906100 },
      { name: 'Asa Norte (Brasília - DF)', address: 'SHCN EQN 206/406 - Asa Norte, Brasília - DF', latitude: -15.763900, longitude: -47.886400 },
      { name: 'Sudoeste (Brasília - DF)', address: 'CLSW 102 - Setor Sudoeste, Brasília - DF', latitude: -15.795800, longitude: -47.925000 },
      { name: 'Lago Sul (Brasília - DF)', address: 'SHIS QI 11 - Lago Sul, Brasília - DF', latitude: -15.839200, longitude: -47.854200 }
    ]
  },
  {
    state: 'RS',
    stateName: 'Rio Grande do Sul (Porto Alegre)',
    presets: [
      { name: 'Moinhos de Vento (POA - RS)', address: 'Rua Padre Chagas, 300 - Moinhos de Vento, Porto Alegre - RS', latitude: -30.026100, longitude: -51.203600 },
      { name: 'Bela Vista (POA - RS)', address: 'Av. Nilópolis, 250 - Bela Vista, Porto Alegre - RS', latitude: -30.039200, longitude: -51.192500 },
      { name: 'Menino Deus (POA - RS)', address: 'Rua José de Alencar, 600 - Menino Deus, Porto Alegre - RS', latitude: -30.051900, longitude: -51.221400 },
      { name: 'Caxias do Sul (RS)', address: 'Rua Sinimbu, 1500 - Centro, Caxias do Sul - RS', latitude: -29.167800, longitude: -51.179400 }
    ]
  },
  {
    state: 'BA',
    stateName: 'Bahia (Salvador)',
    presets: [
      { name: 'Barra / Ondina (Salvador - BA)', address: 'Av. Oceânica, 1200 - Barra, Salvador - BA', latitude: -13.008900, longitude: -38.528300 },
      { name: 'Pituba (Salvador - BA)', address: 'Av. Manoel Dias da Silva, 800 - Pituba, Salvador - BA', latitude: -12.999700, longitude: -38.459700 },
      { name: 'Caminho das Árvores (Salvador - BA)', address: 'Alameda das Espatódeas, 400 - Caminho das Árvores, Salvador - BA', latitude: -12.981900, longitude: -38.455600 }
    ]
  },
  {
    state: 'PE',
    stateName: 'Pernambuco (Recife)',
    presets: [
      { name: 'Boa Viagem (Recife - PE)', address: 'Av. Boa Viagem, 2000 - Boa Viagem, Recife - PE', latitude: -8.127500, longitude: -34.903600 },
      { name: 'Espinheiro / Graças (Recife - PE)', address: 'Rua da Hora, 450 - Espinheiro, Recife - PE', latitude: -8.041700, longitude: -34.897200 }
    ]
  },
  {
    state: 'SC',
    stateName: 'Santa Catarina (Florianópolis)',
    presets: [
      { name: 'Beira-Mar Norte (Florianópolis - SC)', address: 'Av. Beira Mar Norte, 2200 - Centro, Florianópolis - SC', latitude: -27.585500, longitude: -48.552400 },
      { name: 'Balneário Camboriú (SC)', address: 'Av. Atlântica, 1800 - Centro, Balneário Camboriú - SC', latitude: -26.992600, longitude: -48.634700 },
      { name: 'Joinville (SC)', address: 'Rua Otto Boehm, 500 - América, Joinville - SC', latitude: -26.304500, longitude: -48.848700 }
    ]
  },
  {
    state: 'CE',
    stateName: 'Ceará (Fortaleza)',
    presets: [
      { name: 'Meireles / Aldeota (Fortaleza - CE)', address: 'Av. Beira Mar, 2500 - Meireles, Fortaleza - CE', latitude: -3.726500, longitude: -38.498400 }
    ]
  },
  {
    state: 'GO',
    stateName: 'Goiás (Goiânia)',
    presets: [
      { name: 'Setor Bueno / Marista (Goiânia - GO)', address: 'Av. 136, 800 - Setor Marista, Goiânia - GO', latitude: -16.698900, longitude: -49.261200 }
    ]
  },
  {
    state: 'ES',
    stateName: 'Espírito Santo (Vitória)',
    presets: [
      { name: 'Praia do Canto (Vitória - ES)', address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES', latitude: -20.301200, longitude: -40.292500 }
    ]
  }
];

// Mapa plano de presets para consulta rápida por nome
export const ALL_PRESET_LOCATIONS = BRAZIL_REGIONS.reduce((acc, region) => {
  region.presets.forEach((p) => {
    acc[p.name] = { latitude: p.latitude, longitude: p.longitude, address: p.address };
  });
  return acc;
}, {});

// Dicionário de cidades e capitais brasileiras para fallback rápido offline
export const CITY_COORDINATES_MAP = {
  'sao paulo': { latitude: -23.550520, longitude: -46.633308 },
  sp: { latitude: -23.550520, longitude: -46.633308 },
  campinas: { latitude: -22.909938, longitude: -47.062633 },
  santos: { latitude: -23.960833, longitude: -46.333611 },
  'ribeirao preto': { latitude: -21.176667, longitude: -47.810833 },
  'sao jose dos campos': { latitude: -23.189600, longitude: -45.884100 },
  sorocaba: { latitude: -23.501500, longitude: -47.452600 },
  
  'rio de janeiro': { latitude: -22.906847, longitude: -43.172896 },
  rj: { latitude: -22.906847, longitude: -43.172896 },
  niteroi: { latitude: -22.883300, longitude: -43.103600 },
  petropolis: { latitude: -22.505000, longitude: -43.178900 },
  
  curitiba: { latitude: -25.428400, longitude: -49.273300 },
  pr: { latitude: -25.428400, longitude: -49.273300 },
  londrina: { latitude: -23.304452, longitude: -51.169582 },
  maringa: { latitude: -23.420999, longitude: -51.933056 },
  cascavel: { latitude: -24.957800, longitude: -53.459500 },
  'foz do iguacu': { latitude: -25.515800, longitude: -54.587800 },
  
  'belo horizonte': { latitude: -19.916681, longitude: -43.934493 },
  mg: { latitude: -19.916681, longitude: -43.934493 },
  uberlandia: { latitude: -18.918600, longitude: -48.277200 },
  'juiz de fora': { latitude: -21.759500, longitude: -43.344400 },
  contagem: { latitude: -19.931700, longitude: -44.053600 },
  
  brasilia: { latitude: -15.797515, longitude: -47.891887 },
  df: { latitude: -15.797515, longitude: -47.891887 },
  taguatinga: { latitude: -15.833100, longitude: -48.056700 },
  
  'porto alegre': { latitude: -30.034647, longitude: -51.217659 },
  rs: { latitude: -30.034647, longitude: -51.217659 },
  'caxias do sul': { latitude: -29.167800, longitude: -51.179400 },
  canoas: { latitude: -29.917800, longitude: -51.183600 },
  pelotas: { latitude: -31.765400, longitude: -52.337600 },
  
  salvador: { latitude: -12.977749, longitude: -38.501630 },
  ba: { latitude: -12.977749, longitude: -38.501630 },
  'feira de santana': { latitude: -12.266400, longitude: -38.966300 },
  
  recife: { latitude: -8.057838, longitude: -34.882897 },
  pe: { latitude: -8.057838, longitude: -34.882897 },
  olinda: { latitude: -8.008900, longitude: -34.855300 },
  
  fortaleza: { latitude: -3.731862, longitude: -38.526670 },
  ce: { latitude: -3.731862, longitude: -38.526670 },
  
  florianopolis: { latitude: -27.595378, longitude: -48.548050 },
  sc: { latitude: -27.595378, longitude: -48.548050 },
  joinville: { latitude: -26.304500, longitude: -48.848700 },
  'balneario camboriu': { latitude: -26.992600, longitude: -48.634700 },
  blumenau: { latitude: -26.919400, longitude: -49.066100 },
  
  goiania: { latitude: -16.686891, longitude: -49.264794 },
  go: { latitude: -16.686891, longitude: -49.264794 },
  
  vitoria: { latitude: -20.315500, longitude: -40.312800 },
  es: { latitude: -20.315500, longitude: -40.312800 },
  'vila velha': { latitude: -20.347800, longitude: -40.294700 },
  
  manaus: { latitude: -3.119028, longitude: -60.021731 },
  am: { latitude: -3.119028, longitude: -60.021731 },
  
  belem: { latitude: -1.455755, longitude: -48.490180 },
  pa: { latitude: -1.455755, longitude: -48.490180 },
  
  natal: { latitude: -5.794480, longitude: -35.211000 },
  rn: { latitude: -5.794480, longitude: -35.211000 },
  
  'joao pessoa': { latitude: -7.119496, longitude: -34.845012 },
  pb: { latitude: -7.119496, longitude: -34.845012 },
  
  maceio: { latitude: -9.665800, longitude: -35.735000 },
  al: { latitude: -9.665800, longitude: -35.735000 },
  
  aracaju: { latitude: -10.947200, longitude: -37.073100 },
  se: { latitude: -10.947200, longitude: -37.073100 },
  
  cuiaba: { latitude: -15.601411, longitude: -56.097892 },
  mt: { latitude: -15.601411, longitude: -56.097892 },
  
  'campo grande': { latitude: -20.469711, longitude: -54.620121 },
  ms: { latitude: -20.469711, longitude: -54.620121 },
  
  teresina: { latitude: -5.091944, longitude: -42.803333 },
  pi: { latitude: -5.091944, longitude: -42.803333 },
  
  'sao luis': { latitude: -2.530730, longitude: -44.306800 },
  ma: { latitude: -2.530730, longitude: -44.306800 }
};

// Normalização de texto para busca
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Resolução inteligente de coordenadas geodésicas:
 * 1. Procura primeiro no mapa de presets e bairros cadastrados.
 * 2. Se houver CEP no texto, pode resolver via CEP.
 * 3. Tenta geocodificação via OpenStreetMap Nominatim (com timeout seguro de 2s).
 * 4. Fallback imediato para mapeamento de cidade/estado sem travar a interface.
 */
export async function resolveAddressCoordinates(addressText) {
  if (!addressText || typeof addressText !== 'string' || addressText.trim().length === 0) {
    return { latitude: -23.585000, longitude: -46.638000, source: 'default' };
  }

  const clean = addressText.trim();
  const normalized = normalizeText(clean);

  // 1. Verifica se bate exatamente ou parcialmente com algum preset cadastrado
  for (const [presetName, loc] of Object.entries(ALL_PRESET_LOCATIONS)) {
    const normPreset = normalizeText(presetName);
    const normAddr = normalizeText(loc.address);
    if (normalized.includes(normPreset) || normalized.includes(normAddr) || normPreset.includes(normalized)) {
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        source: 'preset',
        matched: presetName
      };
    }
  }

  // 2. Tenta geocodificação em tempo real via OpenStreetMap Nominatim
  if (typeof fetch !== 'undefined') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const queryUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(clean)}`;
      const res = await fetch(queryUrl, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            return {
              latitude: lat,
              longitude: lon,
              formattedAddress: first.display_name,
              source: 'nominatim'
            };
          }
        }
      }
    } catch {
      // Ignora falhas de rede e segue para fallback determinístico
    }
  }

  // 3. Fallback inteligente baseado em nomes de cidades e estados detectados no texto
  for (const [cityName, coords] of Object.entries(CITY_COORDINATES_MAP)) {
    // Detecta nome da cidade ou sigla no texto (ex: "Curitiba - PR", "Rio de Janeiro", "Belo Horizonte")
    const regex = new RegExp(`\\b${cityName}\\b`, 'i');
    if (regex.test(normalized)) {
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: 'city_fallback',
        city: cityName
      };
    }
  }

  // 4. Default neutro em caso de endereço completamente não identificado
  return { latitude: -23.585000, longitude: -46.638000, source: 'default' };
}
