const User = require('../models/User');
const Event = require('../models/Event');
const { spawn } = require('child_process');
const path = require('path');

/**
 * AI Oracle Service
 * Provides suitability matchmaking for users and events.
 */
const getPersonalizedMatches = async (user, events) => {
    try {
        if (!events || events.length === 0) return [];

        const pythonData = {
            user: {
                interests: user.interests || [],
                skills: user.skills || []
            },
            events: events.map(e => ({
                category: e.category,
                description: e.description,
                skills: e.skills || [],
                city: e.city
            }))
        };

        const runPythonMatchmaker = (data) => {
            return new Promise((resolve, reject) => {
                const pyPath = path.join(__dirname, '..', 'ml_service', 'matchmaker.py');
                const pythonProcess = spawn('python', [pyPath]);

                let result = '';
                let error = '';

                pythonProcess.stdin.write(JSON.stringify(data));
                pythonProcess.stdin.end();

                pythonProcess.stdout.on('data', (d) => result += d.toString());
                pythonProcess.stderr.on('data', (d) => error += d.toString());

                pythonProcess.on('close', (code) => {
                    if (code !== 0) reject(error || 'Python Matchmaker exited with code ' + code);
                    else {
                        try {
                            resolve(JSON.parse(result));
                        } catch (e) {
                            reject('Failed to parse Python result: ' + result);
                        }
                    }
                });
            });
        };

        const matchResults = await runPythonMatchmaker(pythonData);
        return matchResults;

    } catch (error) {
        console.warn("Python Matchmaker Fallback:", error.message);
        return events.map(event => {
            const categoryMatch = user.interests?.includes(event.category);
            return {
                match_score: categoryMatch ? 85 : 45,
                reason: categoryMatch ? `Fits your interest in ${event.category}` : "Explore something new!",
                is_fallback: true
            };
        });
    }
};

module.exports = { getPersonalizedMatches };
