
import { fileURLToPath } from 'url';
import { evaluateRamExpression } from './dsl.js';
import path from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupAndStartServer = () => {
    const app = express();
    const port = process.env.APIFY_CONTAINER_PORT || 3000;

    app.use(express.json());

    // Serve the HTML interface from root
    app.get('/', (_, res) => {
        return res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    app.post('/evaluate', (req, res) => {
        const { expression, runOptions, input } = req.body;
        if (typeof expression !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid expression' });
        }
        try {
            const result = evaluateRamExpression(expression, { runOptions, input });
            return res.json({ result });
        } catch (err: any) {
            return res.status(400).json({ error: err.message });
        }
    });

    app.listen(port, () => {
        console.log(`RAM DSL API server listening on port ${port}`);
    });
}
