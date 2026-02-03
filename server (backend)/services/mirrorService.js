const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const mongoose = require('mongoose');

class MirrorService {
    constructor() {
        this.csvDirectory = path.join(__dirname, '..', 'data_mirrors');
        if (!fs.existsSync(this.csvDirectory)) {
            fs.mkdirSync(this.csvDirectory, { recursive: true });
        }
    }

    /**
     * Mirrors a collection to a CSV file.
     * @param {string} modelName - The name of the Mongoose model.
     */
    async mirrorCollection(modelName) {
        try {
            const Model = mongoose.model(modelName);
            const data = await Model.find().lean();
            
            if (data.length === 0) {
                // If no data, just create an empty file with headers or leave it
                const filePath = path.join(this.csvDirectory, `${modelName.toLowerCase()}s.csv`);
                fs.writeFileSync(filePath, '');
                return;
            }

            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(data);
            
            const filePath = path.join(this.csvDirectory, `${modelName.toLowerCase()}s.csv`);
            fs.writeFileSync(filePath, csv);
            
            console.log(`[MirrorService] Successfully mirrored ${modelName} to CSV.`);
        } catch (error) {
            console.error(`[MirrorService] Error mirroring ${modelName}:`, error.message);
        }
    }
}

module.exports = new MirrorService();
