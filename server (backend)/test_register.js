
async function testRegister() {
    try {
        const uniqueEmail = `test${Date.now()}@example.com`;
        console.log(`Attempting to register with email: ${uniqueEmail}`);

        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test User',
                email: uniqueEmail,
                password: 'password123',
                locationCity: 'Mumbai',
                interests: ['Music', 'Tech']
            })
        });

        const data = await response.json();
        console.log('Registration Status:', response.status);
        console.log('Response:', data);

    } catch (error) {
        console.log('Registration Error:', error.message);
    }
}

testRegister();
