export const calculateSuitability = (user, event) => {
    if (!user || !event) return { score: 0, reasons: [] };

    let score = 0;
    const reasons = [];

    // 1. LOCATION (Weight: 30%)
    let locationScore = 0;
    if (event.eventType === 'online') {
        locationScore = 30;
        reasons.push({ type: 'success', text: '🌐 Remote Friendly (Online)' });
    } else {
        const userCity = user.locationCity?.toLowerCase().trim();
        const eventCity = event.city?.toLowerCase().trim();

        if (userCity && eventCity && userCity === eventCity) {
            locationScore = 30;
            reasons.push({ type: 'success', text: '📍 In Your City' });
        } else {
            locationScore = 5;
        }
    }
    score += locationScore;

    // 2. INTERESTS & SKILLS (Weight: 50%)
    let interestScore = 0;
    let categoryMatch = false;

    // Check Category
    if (user.interests && user.interests.some(i => i.toLowerCase() === event.category?.toLowerCase())) {
        categoryMatch = true;
        interestScore += 25;
    }

    // Check Keywords in Title/Description
    let keywordMatches = 0;
    if (user.interests) {
        const content = `${event.title} ${event.description}`.toLowerCase();
        user.interests.forEach(interest => {
            if (content.includes(interest.toLowerCase())) {
                keywordMatches++;
            }
        });
    }

    const keywordPoints = Math.min(keywordMatches * 10, 25);
    interestScore += keywordPoints;
    score += interestScore;

    // 3. TRUST & QUALITY (Weight: 20%)
    const trustPoints = Math.round((event.trustScore || 0) * 0.20);
    score += trustPoints;

    // Final Reasoning based on Score (Matching matchmaker.py logic)
    const finalScore = Math.min(Math.round(score), 100);

    if (finalScore >= 92) {
        reasons.push({ type: 'danger', text: '🔥 Peak Interest Match: Perfect fit for your profile!' });
    } else if (finalScore >= 80) {
        reasons.push({ type: 'primary', text: `✨ High Potential: Aligned with your ${event.category} skills` });
    } else if (categoryMatch) {
        reasons.push({ type: 'warning', text: `🎯 Interest Hub: Matches your ${event.category} tag.` });
    } else {
        reasons.push({ type: 'info', text: '💡 New Opportunity: Expand your skill horizons.' });
    }

    if (event.trustScore > 80) {
        reasons.push({ type: 'success', text: '🛡️ High Quality & Trusted' });
    }

    return {
        score: finalScore,
        reasons
    };
};

