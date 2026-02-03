const axios = require('axios');

// Simple in-memory queue to enforce rate limiting
// Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_DELAY = 500; // 0.5 seconds for snappier feel

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/*
 * Geocodes an address string to coordinates using OpenStreetMap Nominatim
 * @param {string} address - The full address to geocode
 * @returns {Object|null} - { lat: number, lng: number } or null if failed
 */
const geocodeAddress = async (address) => {
    if (!address) return null;

    try {
        // Enforce Rate Limiting
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;

        if (timeSinceLastRequest < MIN_DELAY) {
            await sleep(MIN_DELAY - timeSinceLastRequest);
        }

        lastRequestTime = Date.now();

        const isPincode = /^\d{6}$/.test(address.trim());
        let params = {
            format: 'json',
            addressdetails: 1,
            limit: 1,
            countrycodes: 'in' // Restrict to India to avoid foreign matches
        };

        if (isPincode) {
            // Structured search for higher accuracy with pincodes
            params.postalcode = address.trim();
            params.country = 'India';
        } else {
            // General search
            params.q = address.toLowerCase().includes('india') ? address : `${address}, India`;
        }

        // Call Nominatim API
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params,
            headers: {
                'User-Agent': 'LocalEventsApp/1.0 (Student_Hackathon_Project)'
            }
        });

        if (response.data && response.data.length > 0) {
            const result = response.data[0];
            const addr = result.address || {};

            // Intelligent city fallback
            const city = addr.city ||
                addr.town ||
                addr.village ||
                addr.suburb ||
                addr.municipality ||
                addr.county ||
                addr.state_district ||
                '';

            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                city: city,
                state: addr.state || ''
            };
        }

        return null;
    } catch (error) {
        console.error('Geocoding Error:', error.message);
        return null;
    }
};

module.exports = { geocodeAddress };
