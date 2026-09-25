import apiClient from './apiClient';

export const geocodingApi = {
  searchAddress: (query, countryCode) =>
    apiClient.get('/v1/geocoding/search', {
      params: { q: query, country: countryCode }
    }),

  getDistance: (origLng, origLat, destLng, destLat) =>
    apiClient.get('/v1/geocoding/distance', {
      params: { origLng, origLat, destLng, destLat }
    })
};
