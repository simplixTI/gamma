/**
 * CANAL WAYPOINTS — Ilha de Gigoia, Barra da Tijuca, RJ
 *
 * Waypoints calibrados nas coordenadas reais verificadas in loco (mockData.ts).
 *
 * Topologia de canais (sentido horário):
 *
 *   CANAL_SUL   — margem continental sul (piers 1–6)
 *                 lng decresce de -43.311 a -43.308 (oeste→leste)
 *
 *   CANAL_LESTE — margem leste da ilha (piers 7–12)
 *                 lat sobe de -23.007 a -23.001 (sul→norte)
 *
 *   CANAL_NORTE — Canal de Marapendi (piers 13–19)
 *                 lng decresce de -43.308 a -43.317 (leste→oeste)
 *
 *   CANAL_OESTE — margem oeste/interna (piers 20–24)
 *                 lat desce de -23.002 a -23.007 (norte→sul)
 *
 * Junções reais (calculadas a partir das coordenadas dos piers extremos):
 *   J_SE  : BARRA POINT (6) ↔ PASSARELA (7)
 *   J_NE  : PESCADORES (12) ↔ CAIÇARAS (13)
 *   J_NW  : CAIÇARAS (13) / RATO (20) confluência
 */

export type LatLng = { lat: number; lng: number };

// ─── Junções calibradas nas coordenadas reais ─────────────────────────────────

// Entre canal sul e canal leste: ponto médio entre BARRA POINT (-43.3083,-23.0058)
// e PASSARELA (-43.3039,-23.0071) — ponto de virada do canal
const J_SE: LatLng = { lat: -23.0065, lng: -43.3061 };

// Entre canal leste e canal norte: ponto médio entre PESCADORES (-43.3055,-23.0018)
// e CAIÇARAS (-43.3081,-23.0011)
const J_NE: LatLng = { lat: -23.0014, lng: -43.3068 };

// Entre canal norte e canal oeste: confluência CAIÇARAS/RATO
// RATO (-43.3105,-23.0025) / CAIÇARAS (-43.3081,-23.0011)
const J_NW: LatLng = { lat: -23.0018, lng: -43.3093 };

// ─── Segmentos do canal ───────────────────────────────────────────────────────

// SUL: METRO/EST (oeste) → BARRA POINT → J_SE (leste)
// Segue a margem sul continental — lat ~-23.006, lng varia de -43.311 a J_SE
const CANAL_SUL: LatLng[] = [
  { lat: -23.0058, lng: -43.3104 }, // próximo METRO (1) [-43.3104,-23.0058]
  { lat: -23.0054, lng: -43.3113 }, // ESTAC. NOVO (2) [-43.3113,-23.0054]
  { lat: -23.0053, lng: -43.3115 }, // ESTAC. MARCIA (3) [-43.3115,-23.0053]
  { lat: -23.0058, lng: -43.3095 }, // UNIMED (4) [-43.3095,-23.0058]
  { lat: -23.0054, lng: -43.3093 }, // PRINCIPAL (5) [-43.3093,-23.0054]
  { lat: -23.0058, lng: -43.3083 }, // BARRA POINT (6) [-43.3083,-23.0058]
  J_SE,
];

// LESTE: J_SE (sul) → PASSARELA → ... → PESCADORES → J_NE (norte)
// Segue a margem leste/interior da ilha
const CANAL_LESTE: LatLng[] = [
  J_SE,
  { lat: -23.0071, lng: -43.3039 }, // PASSARELA (7) [-43.3039,-23.0071]
  { lat: -23.0060, lng: -43.3052 }, // interpolação
  { lat: -23.0041, lng: -43.3081 }, // CASA DAS ARTES (8) [-43.3081,-23.0041]
  { lat: -23.0034, lng: -43.3083 }, // BECO/PRAÇA (9) [-43.3083,-23.0034]
  { lat: -23.0021, lng: -43.3071 }, // JULIO (10) [-43.3071,-23.0021]
  { lat: -23.0028, lng: -43.3058 }, // MARINA (11) [-43.3058,-23.0028]
  { lat: -23.0018, lng: -43.3055 }, // PESCADORES (12) [-43.3055,-23.0018]
  J_NE,
];

// NORTE: J_NE (leste) → CAIÇARAS → ... → INVASÃO (oeste)
// Segue o Canal de Marapendi rumo ao oeste
const CANAL_NORTE: LatLng[] = [
  J_NE,
  { lat: -23.0011, lng: -43.3081 }, // CAIÇARAS (13) [-43.3081,-23.0011]
  { lat: -23.0007, lng: -43.3082 }, // ILHA PRIMEIRA/CICERO (14) [-43.3082,-23.0007]
  { lat: -23.0009, lng: -43.3090 }, // ASSOCIAÇÃO (15) [-43.3090,-23.0009]
  { lat: -23.0014, lng: -43.3093 }, // COQUEIROS (16) [-43.3093,-23.0014]
  J_NW,
  { lat: -22.9998, lng: -43.3105 }, // CANAL ILHA PRIMEIRA (17) [-43.3105,-22.9998]
  { lat: -22.9987, lng: -43.3129 }, // JACARÉ (18) [-43.3129,-22.9987]
  { lat: -22.9984, lng: -43.3169 }, // INVASÃO (19) [-43.3169,-22.9984]
];

// OESTE: J_NW (norte) → RATO → ... → HORTIFRUTI (sul)
// Segue a margem oeste interna da ilha
const CANAL_OESTE: LatLng[] = [
  J_NW,
  { lat: -23.0025, lng: -43.3105 }, // RATO (20) [-43.3105,-23.0025]
  { lat: -23.0034, lng: -43.3108 }, // COLIBRI (21) [-43.3108,-23.0034]
  { lat: -23.0040, lng: -43.3135 }, // CONDADO (22) [-43.3135,-23.0040]
  { lat: -23.0054, lng: -43.3161 }, // DOWNTOWN (23) [-43.3161,-23.0054]
  { lat: -23.0073, lng: -43.3178 }, // HORTIFRUTI (24) [-43.3178,-23.0073]
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

// ─── Grafo de canais ─────────────────────────────────────────────────────────
//
// Ordem linear: sul(0) ── J_SE ── leste(1) ── J_NE ── norte(2) ── J_NW ── oeste(3)

function junctionIdx(canal: CanalName, junction: LatLng): number {
  return closestIdx(junction, CANALS[canal]);
}

/**
 * Retorna waypoints navegáveis de pier `from` até pier `to` pela água.
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
  const ORDER: CanalName[] = ['sul', 'leste', 'norte', 'oeste'];
  const iFromO = ORDER.indexOf(fromC);
  const iToO   = ORDER.indexOf(toC);

  // Junções entre canais adjacentes (na ordem LINEAR)
  const JUNCTIONS: LatLng[] = [J_SE, J_NE, J_NW]; // [sul-leste, leste-norte, norte-oeste]

  const path: LatLng[] = [from];

  if (iFromO < iToO) {
    // Vai "para frente": sul→leste→norte→oeste
    const exitJ = JUNCTIONS[iFromO];
    const iExitInFrom = junctionIdx(fromC, exitJ);
    path.push(...canalSlice(fromSeg, iFrom, iExitInFrom));

    for (let c = iFromO + 1; c < iToO; c++) {
      const seg = CANALS[ORDER[c]];
      const exitJNext = JUNCTIONS[c];
      const iExitNext = junctionIdx(ORDER[c], exitJNext);
      path.push(...seg.slice(0, iExitNext + 1));
    }

    const entryJ = JUNCTIONS[iToO - 1];
    const iEntryInTo = junctionIdx(toC, entryJ);
    path.push(...canalSlice(toSeg, iEntryInTo, iTo));
  } else {
    // Vai "para trás": oeste→norte→leste→sul
    const entryJ = JUNCTIONS[iFromO - 1];
    const iEntryInFrom = junctionIdx(fromC, entryJ);
    path.push(...canalSlice(fromSeg, iFrom, iEntryInFrom));

    for (let c = iFromO - 1; c > iToO; c--) {
      const seg = CANALS[ORDER[c]];
      const iEntryIdx = junctionIdx(ORDER[c], JUNCTIONS[c]);
      const iExitIdx  = junctionIdx(ORDER[c], JUNCTIONS[c - 1]);
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
 * Linha reta até a entrada do canal mais próxima, depois segue o canal até o pier.
 */
export function buildPilotRoute(
  pilotPos: LatLng,
  toPierId: string,
  toPos: LatLng,
): LatLng[] {
  const toC   = PIER_CANAL[toPierId] as CanalName;
  const toSeg = CANALS[toC];
  const iTo   = closestIdx(toPos, toSeg);
  return dedupe([pilotPos, ...toSeg.slice(0, iTo + 1), toPos]);
}
