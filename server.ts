import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateHandler from './api/generate';

dotenv.config();

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Wrapper to adapt Vercel handler to Express
const adapter = (handler: any) => async (req: any, res: any) => {
    const resProxy = {
        status: (code: number) => {
            res.status(code);
            return resProxy;
        },
        json: (data: any) => {
            res.json(data);
            return resProxy;
        },
        setHeader: (name: string, value: string) => {
            res.setHeader(name, value);
            return resProxy;
        },
        end: (data: any) => {
            res.end(data);
            return resProxy;
        }
    };
    await handler(req, resProxy);
};

app.post('/api/generate', adapter(generateHandler));

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
