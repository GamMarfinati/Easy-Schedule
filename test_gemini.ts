
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const key = process.env.GEMINI_API_KEY || '';
console.log('Key length:', key.length);
console.log('Key starts with:', key.substring(0, 4));

const genAI = new GoogleGenerativeAI(key);

async function listModels() {
  try {
    console.log('Testing gemini-1.5-flash-001...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
    const result = await model.generateContent("Hello");
    console.log('gemini-1.5-flash-001 success:', result.response.text());
  } catch (error: any) {
    console.error('Error flash-001:', error.message);
  }

  try {
    console.log('Testing gemini-1.0-pro...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const result = await model.generateContent("Hello");
    console.log('gemini-1.0-pro success:', result.response.text());
  } catch (error: any) {
    console.error('Error 1.0-pro:', error.message);
  }
}

listModels();
