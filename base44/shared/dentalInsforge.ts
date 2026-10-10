// InsForge-backed entity adapters for the dental-index tables.
//
// These 5 tables (dental_coverage, dental_units, dental_search_cache,
// dental_geocoder_state, dental_geocode_cache) were migrated from Base44
// entities to InsForge. The backend functions (dentalIndex, nearbyDentists,
// dentalGeocoder, publicDentalClinics) used `svc.entities.X` with the Base44
// SDK API. This module provides drop-in replacements using the shared
// insforgeEntity factory.

import { makeInsforgeEntity } from "./insforgeEntity.ts";

export const DentalCoverage = makeInsforgeEntity("dental_coverage", {
  cell: "cell", status: "status", ingested_at: "ingested_at", unit_count: "unit_count", attempts: "attempts",
});

export const DentalUnit = makeInsforgeEntity("dental_units", {
  source_id: "source_id", cell: "cell", latitude: "latitude", longitude: "longitude",
});

export const DentalSearchCache = makeInsforgeEntity("dental_search_cache", {
  key: "key",
});

export const DentalGeocoderState = makeInsforgeEntity("dental_geocoder_state", {
  name: "name", next_allowed_at: "next_allowed_at",
});

export const DentalGeocodeCache = makeInsforgeEntity("dental_geocode_cache", {
  key: "key", query: "query",
});

export const dentalEntities = {
  DentalCoverage,
  DentalUnit,
  DentalSearchCache,
  DentalGeocoderState,
  DentalGeocodeCache,
};