// Auto-generate event image based on category and keywords
const generateEventImage = (title, description, category) => {
    // Curated Unsplash collections for each category
    const categoryImages = {
        'Tech': [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop', // Tech workspace
            'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=400&fit=crop', // Laptop code
            'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=400&fit=crop', // Tech devices
        ],
        'Music': [
            'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=400&fit=crop', // Music studio
            'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=400&fit=crop', // Concert
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop', // DJ
        ],
        'Art': [
            'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=400&fit=crop', // Art gallery
            'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=400&fit=crop', // Painting
            'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=400&fit=crop', // Art supplies
        ],
        'Food': [
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop', // Food spread
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop', // Restaurant
            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop', // Burger
        ],
        'Workshop': [
            'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop', // Team workshop
            'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=400&fit=crop', // Learning
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop', // Classroom
        ],
        'Meetup': [
            'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=400&fit=crop', // Group discussion
            'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop', // Coffee meetup
            'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&h=400&fit=crop', // Networking
        ],
        'Sports': [
            'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop', // Running
            'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop', // Basketball
            'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=400&fit=crop', // Gym
        ],
        'Other': [
            'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop', // Event
            'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=400&fit=crop', // Community
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop', // People
        ]
    };

    // Get images for category
    const images = categoryImages[category] || categoryImages['Other'];

    // Smart selection based on keywords in title/description
    const text = `${title} ${description}`.toLowerCase();

    // Keyword-based selection
    if (text.includes('code') || text.includes('programming') || text.includes('developer')) {
        return images[1] || images[0];
    }
    if (text.includes('concert') || text.includes('live') || text.includes('band')) {
        return images[1] || images[0];
    }
    if (text.includes('food') || text.includes('dinner') || text.includes('lunch')) {
        return images[0];
    }

    // Default: Random selection from category
    return images[Math.floor(Math.random() * images.length)];
};

module.exports = { generateEventImage };
