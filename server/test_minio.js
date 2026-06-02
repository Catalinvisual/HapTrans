const { uploadToMinio } = require('./dist/src/utils/storage.js');

async function testUpload() {
  const buffer = Buffer.from('Test document content 123', 'utf-8');
  try {
    const url = await uploadToMinio(buffer, 'test_doc.txt', 'text/plain');
    console.log('Return URL:', url);
  } catch (err) {
    console.error('Test Error:', err);
  }
}

testUpload();
