/**
 * CANAL WAYPOINTS — Ilha de Gigoia, Barra da Tijuca, RJ
 *
 * Espinha dorsal navegável em 4 segmentos conectados por junções:
 *
 *   CANAL_SUL   — margem continental sul
 *                 piers: METRO(1), EST.NOVO(2), EST.MARCIA(3), UNIMED(4), PRINCIPAL(5), BARRA POINT(6)
 *
 *   CANAL_LESTE — margem leste da ilha
 *                 piers: PASSARELA(7), CASA DAS ARTES(8), BECO(9), JULIO(10), MARINA(11), PESCADORES(12)
 *
 *   CANAL_NORTE — canal norte / Canal de Marapendi
 *                 piers: CAIÇARAS(13), ILHA PRIMEIRA(14), ASSOCIAÇÃO(15), COQUEIROS(16),
 *                        CANAL ILHA PRIMEIRA(17), JACARÉ(18), INVASÃO(19)
 *
 *   CANAL_OESTE — margem oeste/interna
 *                 piers: RATO(20), COLIBRI(21), CONDADO(22), DOWNTOWN(23), HORTIFRUTI(24)
 */

export type LatLng = { lat: number; lng: number };

// ─── Junções ─────────────────────────────────────────────────────────────────

const J_SE: LatLng = { lat: -23.0068, lng: -43.3060 }; // canal sul → canal leste
const J_NE: LatLng = { lat: -23.0012, lng: -43.3060 }; // canal leste → canal norte
const J_NW: LatLng = { lat: -23.0012, lng: -43.3105 }; // canal norte → canal oeste

// ─── Segmentos (indexados de "início" → "fim" em direção ao interior) ─────────

// SUL: oeste (METRO/EST) → leste (BARRA POINT → J_SE)
const CANAL_SUL: LatLng[] = [
  { lat: -23.0060, lng: -43.3120 },
  { lat: -23.0060, lng: -43.3110 },
  { lat: -23.0062, lng: -43.3100 },
  { lat: -23.0063, lng: -43.3090 },
  { lat: -23.0065, lng: -43.3080 },
  J_SE,
];

// LESTE: J_SE (sul) → J_NE (norte), passando pelos piers leste
const CANAL_LESTE: LatLng[] = [
  J_SE,
  { lat: -23.0071, lng: -43.3040 }, // PASSARELA (7)
  { lat: -23.0060, lng: -43.3045 },
  { lat: -23.0048, lng: -43.3068 },
  { lat: -23.0040, lng: -43.3075 }, // CASA DAS ARTES (8)
  { lat: -23.0033, lng: -43.3078 }, // BECO (9)
  { lat: -23.0022, lng: -43.3070 }, // JULIO (10)
  { lat: -23.0025, lng: -43.3060 }, // MARINA (11)
  { lat: -23.0018, lng: -43.3058 }, // PESCADORES (12)
  J_NE,
];

// NORTE: J_NE (leste) → J_NW (centro-norte) → INVASÃO (oeste)
const CANAL_NORTE: LatLng[] = [
  J_NE,
  { lat: -23.0010, lng: -43.3082 }, // CAIÇARAS (13) / ILHA PRIMEIRA (14)
  { lat: -23.0008, lng: -43.3090 }, // ASSOCIAÇÃO (15) / COQUEIROS (16)
  { lat: -22.9998, lng: -43.3105 }, // CANAL ILHA PRIMEIRA (17)
  J_NW,
  { lat: -22.9990, lng: -43.3130 }, // JACARÉ (18)
  { lat: -22.9988, lng: -43.3170 }, // INVASÃO (19)
];

// OESTE: J_NW (norte) → HORTIFRUTI (sul)
const CANAL_OESTE: LatLng[] = [
  J_NW,
  { lat: -23.0025, lng: -43.3105 }, // RATO (20)
  { lat: -23.0035, lng: -43.3108 }, // COLIBRI (21)
  { lat: -23.0040, lng: -43.3135 }, // CONDADO (22)
  { lat: -23.0055, lng: -43.3162 }, // DOWNTOWN (23)
  { lat: -23.0073, lng: -43.3178 }, // HORTIFRUTI (24)
];

// ─── Lookup: pier → canal ────────────────────────────────────────────────────

const PIER_CANAL: Record<string, 'sul' | 'leste' | 'norte' | 'oeste'> = {
  '1': 'sul', '2': 'sul', '3': 'sul', '4': 'sul', '5': 'sul', '6': 'sul',
  '7': 'leste', '8': 'leste', '9': 'leste', '10': 'leste', '11': 'leste', '12': 'leste',
  '13': 'norte', '14': 'norte', '15': 'norte', '16': 'norte',
  '17': 'norte', '18': 'norte', '19': 'norte',
  '20': 'oeste', '21': 'oeste', '22': 'oeste', '23': 'oeste', '24': 'oeste',
};

type CanalName = 'sul' | 'leste' | 'norte' | 'oeste';

const CANALS: Record<CanalName, LatLng[]> = {
  sul: CANAL_SUL,
  leste: CANAL_LESTE,
  norte: CANAL_NORTE,
  oeste: CANAL_OESTE,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dist2(a: LatLng, b: LatLng): number {
  const dlat = a.lat - b.lat;
  const dlng = a.lng - b.lng;
  return dlat * dlat + dlng * dlng;
}

function closestIdx(point: LatLng, seg: LatLng[]): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < seg.length; i++) {
    const d = dist2(point, seg[i]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function dedupe(path: LatLng[]): LatLng[] {
  return path.filter((p, i) => i === 0 || dist2(p, path[i - 1]) > 1e-12);
}

/**
 * Retorna o subtrecho do canal entre dois índices.
 * Se iFrom > iTo, percorre de trás pra frente.
 */
function canalSlice(seg: LatLng[], iFrom: number, iTo: number): LatLng[] {
  if (iFrom <= iTo) return seg.slice(iFrom, iTo + 1);
  return seg.slice(iTo, iFrom + 1).reverse();
}

// ─── Grafo de canais (topologia de conexões entre junções) ───────────────────
//
// Cada canal é um array linear. Junções conectam canais:
//   J_SE conecta CANAL_SUL[last] ↔ CANAL_LESTE[0]
//   J_NE conecta CANAL_LESTE[last] ↔ CANAL_NORTE[0]
//   J_NW conecta CANAL_NORTE[4] ↔ CANAL_OESTE[0]
//
// Para ir de canal A para canal B, encontramos o caminho mínimo pelo grafo:
//   sul ──J_SE── leste ──J_NE── norte ──J_NW── oeste
//
// A função abaixo retorna os waypoints do canal de origem (pier → junção),
// depois os canais intermediários completos, depois o canal de destino
// (junção → pier).

function junctionIdx(canal: CanalName, junction: LatLng): number {
  return closestIdx(junction, CANALS[canal]);
}

/**
 * Retorna waypoints navegáveis de pier `from` (canal `fromC`) até pier `to` (canal `toC`).
 * Inclui apenas os pontos do canal estritamente necessários — sem loops.
 */
export function buildWaterRoute(
  from: LatLng,
  fromPierId: string,
  to: LatLng,
  toPierId: string,
): LatLng[] {
  const fromC = PIER_CANAL[fromPierId] as CanalName;
  const toC   = PIER_CANAL[toPierId]   as CanalName;

  const fromSeg = CANALS[fromC];
  const toSeg   = CANALS[toC];
  const iFrom   = closestIdx(from, fromSeg);
  const iTo     = closestIdx(to,   toSeg);

  // ── Mesmo canal ───────────────────────────────────────────────────────────
  if (fromC === toC) {
    return dedupe([from, ...canalSlice(fromSeg, iFrom, iTo), to]);
  }

  // ── Canais diferentes: constrói caminho via junções ───────────────────────
  // Ordem linear de canais: sul(0) - leste(1) - norte(2) - oeste(3)
  const ORDER: CanalName[] = ['sul', 'leste', 'norte', 'oeste'];
  const iFromO = ORDER.indexOf(fromC);
  const iToO   = ORDER.indexOf(toC);

  // Junções entre canais adjacentes (na ordem LINEAR)
  const JUNCTIONS: LatLng[] = [J_SE, J_NE, J_NW]; // entre [sul-leste, leste-norte, norte-oeste]

  const path: LatLng[] = [from];

  if (iFromO < iToO) {
    // Vai "para frente" na ordem: sul→leste→norte→oeste
    // 1. Do pier de origem até a junção de saída do canal de origem
    const exitJ = JUNCTIONS[iFromO]; // J_SE para sul, J_NE para leste, J_NW para norte
    const iExitInFrom = junctionIdx(fromC, exitJ);
    path.push(...canalSlice(fromSeg, iFrom, iExitInFrom));

    // 2. Canais intermediários (completos)
    for (let c = iFromO + 1; c < iToO; c++) {
      const seg = CANALS[ORDER[c]];
      // entrada é o índice 0 (vem da junção anterior), saída é o índice da próxima junção
      const exitJNext = JUNCTIONS[c];
      const iExitNext = junctionIdx(ORDER[c], exitJNext);
      path.push(...seg.slice(0, iExitNext + 1));
    }

    // 3. Do canal de destino: da junção de entrada até o pier de destino
    const entryJ = JUNCTIONS[iToO - 1];
    const iEntryInTo = junctionIdx(toC, entryJ);
    path.push(...canalSlice(toSeg, iEntryInTo, iTo));
  } else {
    // Vai "para trás": oeste→norte→leste→sul
    const entryJ = JUNCTIONS[iFromO - 1]; // J_NW para oeste, J_NE para norte, J_SE para leste
    const iEntryInFrom = junctionIdx(fromC, entryJ);
    path.push(...canalSlice(fromSeg, iFrom, iEntryInFrom));

    for (let c = iFromO - 1; c > iToO; c--) {
      const seg = CANALS[ORDER[c]];
      const exitJ = JUNCTIONS[c - 1];
      const iExitIdx = junctionIdx(ORDER[c], exitJ);
      // percorre o canal do fim para o início (entramos pela junção "direita", saímos pela "esquerda")
      const iEntryIdx = junctionIdx(ORDER[c], JUNCTIONS[c]);
      path.push(...canalSlice(seg, iEntryIdx, iExitIdx));
    }

    const exitJ = JUNCTIONS[iToO];
    const iExitInTo = junctionIdx(toC, exitJ);
    path.push(...canalSlice(toSeg, iExitInTo, iTo));
  }

  path.push(to);
  return dedupe(path);
}

/**
 * Rota do piloto (posição GPS livre → pier de embarque).
 * Linha reta até a entrada do canal, depois segue o canal até o pier.
 */
export function buildPilotRoute(
  pilotPos: LatLng,
  toPierId: string,
  toPos: LatLng,
): LatLng[] {
  const toC   = PIER_CANAL[toPierId] as CanalName;
  const toSeg = CANALS[toC];
  const iTo   = closestIdx(toPos, toSeg);
  // Entra pelo início do canal (índice 0) e vai até o pier
  return dedupe([pilotPos, ...toSeg.slice(0, iTo + 1), toPos]);
}
