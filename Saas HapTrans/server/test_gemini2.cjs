const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDhnmuEnVdne_kDme5CDi6N2jZRh4HPkw8');

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Hello');
    console.log('Success with gemini-2.5-flash:', result.response.text());
  } catch (error) {
    console.error('Error with gemini-2.5-flash:', error.message);
  }
}

run();
