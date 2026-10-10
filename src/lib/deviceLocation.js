export function locationFailure(error) {
  return {
    title: 'Turn on location to see dentists near you',
    message: error?.code === 1 ? 'Allow location in your browser or phone app settings, or enter an area below.' : 'Your device could not return a location. Retry or enter an area below.',
  };
}

// Android WebViews use their native location provider through this web API.
// No invented bridge, IP estimate, or second blocking permission flow.
export function requestDeviceLocation(onPosition, onError) {
  let active = true;
  let best = null;
  const accept = p => {
    if (!active || !Number.isFinite(p.coords.latitude) || !Number.isFinite(p.coords.longitude)) return;
    if (!best || p.coords.accuracy < best.coords.accuracy || (p.timestamp > best.timestamp && p.coords.accuracy <= best.coords.accuracy * 1.25)) {
      best = p;
      onPosition(p);
    }
  };
  if (!navigator.geolocation) {
    onError(locationFailure({code:2}));
    return () => {active = false;};
  }
  navigator.geolocation.getCurrentPosition(p => {
    accept(p);
    if (active && (Date.now()-p.timestamp > 5000 || p.coords.accuracy > 100)) {
      navigator.geolocation.getCurrentPosition(accept, () => {}, {maximumAge:0,timeout:8000,enableHighAccuracy:true});
    }
  }, e => {if (active) onError(locationFailure(e));}, {maximumAge:60000,timeout:8000,enableHighAccuracy:false});
  return () => {active = false;};
}