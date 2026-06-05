export const MAPLIBRE_RUNTIME_BROWSER_ONLY = true;

let pmtilesProtocolRegistered = false;

type ProtocolLike<TProtocolHandler> = { tile: TProtocolHandler };
type MapLibreLike<TProtocolHandler> = {
  addProtocol: (scheme: string, handler: TProtocolHandler) => void;
  removeProtocol?: (scheme: string) => void;
};

export function registerPmtilesProtocolOnce<TProtocolHandler>(
  maplibre: MapLibreLike<TProtocolHandler>,
  protocol: ProtocolLike<TProtocolHandler>,
) {
  if (pmtilesProtocolRegistered) return false;
  maplibre.addProtocol('pmtiles', protocol.tile);
  pmtilesProtocolRegistered = true;
  return true;
}

export function resetPmtilesRuntimeForTests() {
  pmtilesProtocolRegistered = false;
}
