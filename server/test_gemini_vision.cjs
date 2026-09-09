const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDhnmuEnVdne_kDme5CDi6N2jZRh4HPkw8');

async function testFetchAndScan() {
  const fileUrl = 'https://res.cloudinary.com/dmconsi2x/image/upload/v1/sample.jpg';
  
  console.log('Fetching', fileUrl);
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  let mimeType = response.headers.get('content-type') || 'image/jpeg';
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (mimeType.includes('pdf')) mimeType = 'application/pdf';
  if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
    mimeType = 'image/jpeg';
  }

  console.log('Got buffer', buffer.byteLength, 'bytes, mimeType', mimeType);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = "Extract details from this image. Respond in JSON.";

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType,
        },
      },
    ]);
    console.log('Success:', result.response.text());
  } catch (err) {
    console.error('Gemini Error:', err.message);
  }
}

testFetchAndScan();
