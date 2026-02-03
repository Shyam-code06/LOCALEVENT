const Tesseract = require('tesseract.js');

exports.extractEventDetails = async (imageBuffer) => {
    try {
        const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        const details = {
            title: '',
            dateTime: '',
            description: '',
            locality: '',
            rawText: text
        };

        // --- Heuristic Parsing Logic ---

        // 1. Title Estimation (First significant line usually)
        if (lines.length > 0) {
            details.title = lines[0];
            // If first line is very short, maybe append second?
            if (details.title.length < 5 && lines.length > 1) {
                details.title += ' ' + lines[1];
            }
        }

        // 2. Date & Time Extraction
        // Patterns: "DD Month", "Month DD", "DD/MM/YYYY", "HH:MM AM/PM"
        const dateRegex = /(\d{1,2}(?:st|nd|rd|th)?[\s\/\-\.]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\/\-\.]+(?:\d{4})?)|(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i;
        const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/;

        const dateMatch = text.match(dateRegex);
        const timeMatch = text.match(timeRegex);

        let parsedDate = null;
        let parsedTime = null;

        if (dateMatch) parsedDate = dateMatch[0];
        if (timeMatch) parsedTime = timeMatch[0];

        if (parsedDate) {
            // Attempt to construct a Date object
            let dateStr = parsedDate;
            if (parsedTime) dateStr += ' ' + parsedTime;

            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
                // Format to YYYY-MM-DDTHH:MM for input compatibility
                const year = dateObj.getFullYear();
                // If year is way off (e.g. 2001 default), try to use current year
                const currentYear = new Date().getFullYear();
                if (year < currentYear) dateObj.setFullYear(currentYear);

                // Convert to local ISO string for datetime-local input
                // Simple hack: toISOString is UTC. We need local.
                const offset = dateObj.getTimezoneOffset() * 60000;
                const localISOTime = new Date(dateObj.getTime() - offset).toISOString().slice(0, 16);
                details.dateTime = localISOTime;
            }
        }

        // 3. Location / Locality
        // Look for keywords: "Venue:", "At:", "Location:", "Addr:"
        const locationKeywords = ['Venue:', 'Venue', 'At:', 'Location:', 'Address:', 'Where:'];
        const locationLineIndex = lines.findIndex(line =>
            locationKeywords.some(keyword => line.toLowerCase().startsWith(keyword.toLowerCase()))
        );

        if (locationLineIndex !== -1) {
            // Extract text after the keyword
            let locText = lines[locationLineIndex];
            locationKeywords.forEach(k => {
                const regex = new RegExp(`^${k}\\s*`, 'i');
                locText = locText.replace(regex, '');
            });
            details.locality = locText.trim();
        } else {
            // Fallback: Use last line as address if it looks reasonable
            if (lines.length > 1) {
                const lastLine = lines[lines.length - 1];
                // basic noise filter
                if (lastLine.length > 5 && !lastLine.match(/copyright|rights reserved/i)) { 
                    details.locality = lastLine; 
                }
            }
        }

        // 4. Description
        // Join middle lines
        const descriptionLines = lines.slice(1, locationLineIndex !== -1 ? locationLineIndex : lines.length - 1);
        details.description = descriptionLines.join('\n').substring(0, 200); // Limit length

        return details;

    } catch (error) {
        console.error("OCR Error:", error);
        throw new Error("Failed to extract text from image");
    }
};
