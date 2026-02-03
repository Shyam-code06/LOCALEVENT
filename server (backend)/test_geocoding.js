const { geocodeAddress } = require('./utils/geocoder');

const testGeocoding = async () => {
    console.log('Testing Geocoding...');
    
    const addresses = [
        'Eiffel Tower, Paris',
        'Times Square, New York',
        'Taj Mahal, Agra'
    ];

    for (const address of addresses) {
        console.log(`Geocoding: ${address}`);
        const start = Date.now();
        const result = await geocodeAddress(address);
        const duration = Date.now() - start;
        console.log(`Result:`, result);
        console.log(`Takes: ${duration}ms`);
        console.log('---');
    }
};

testGeocoding();
