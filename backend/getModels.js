import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

dotenv.config();

async function getModels() {
    try {
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: {
                Authorization: `Bearer ${process.env.LLM_API_KEY}`
            }
        });
        const models = response.data.data.map(m => m.id);
        const out = {
            deepseek: models.filter(m => m.includes('deepseek')),
            llama: models.filter(m => m.includes('llama'))
        };
        fs.writeFileSync('models.json', JSON.stringify(out, null, 2));
    } catch (error) {
        console.error('Error fetching models:', error.message);
    }
}
getModels();
