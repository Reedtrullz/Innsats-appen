export const MAPLIBRE_RUNTIME_BROWSER_ONLY = true;

let pmtilesProtocolRegistered = false;

type ProtocolLike = { tile: unknown };
type MapLibreLike = {
  addProtocol: (scheme: string, handler: unknown) => void;
  removeProtocol?: (scheme: string) => void;
};

export function registerPmtilesProtocolOnce(maplibre: MapLibreLike, protocol: ProtocolLike) {
  if (pmtilesProtocolRegistered) return false;
  maplibre.addProtocol('pmtiles', protocol.tile);
  pmtilesProtocolRegistered = true;
  return true;
}

export function resetPmtilesRuntimeForTests() {
  pmtilesProtocolRegistered = false;
}
