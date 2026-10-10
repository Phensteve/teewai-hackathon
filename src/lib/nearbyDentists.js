import { unrufld } from '@/api/unrufldClient';

// Transport only. Distance/radius decisions are authoritative on the server.
export async function finderRequest(payload) {
  const response = await unrufld.functions.invoke('nearbyDentists',payload);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}
export async function geocodeCity(query) {
  return (await finderRequest({op:'geocode',query})).position;
}