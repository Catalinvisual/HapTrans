const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDhnmuEnVdne_kDme5CDi6N2jZRh4HPkw8');

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hello');
    console.log(result.response.text());
  } catch (error) {
    console.error('Error with gemini-1.5-flash:', error.message);
    try {
      console.log('Trying gemini-1.5-pro...');
      const modelPro = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const resultPro = await modelPro.generateContent('Hello');
      console.log(resultPro.response.text());
    } catch (e2) {
      console.error('Error with gemini-1.5-pro:', e2.message);
    }
  }
}

run();
