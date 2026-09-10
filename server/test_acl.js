const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
dotenv.config();

async function testUpload() {
  const client = new S3Client({
    endpoint: 'http://100.107.134.23:9000', // using the new tailscale IP
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '0X6E90Y7FTZJZ0P3G0MR',
      secretAccessKey: process.env.S3_SECRET_KEY || '+QbmgmexbBJWUJnpzOTBYgpgrARvt8jkEzNbR9G5',
    },
    forcePathStyle: true,
  });

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: 'docs',
        Key: 'test_acl.txt',
        Body: 'hello world',
        ContentType: 'text/plain',
        ACL: 'public-read',
      })
    );
    console.log('Upload with ACL succeeded!');
  } catch (err) {
    console.error('Upload with ACL FAILED:', err.message);
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: 'docs',
        Key: 'test_no_acl.txt',
        Body: 'hello world',
        ContentType: 'text/plain',
      })
    );
    console.log('Upload without ACL succeeded!');
  } catch (err) {
    console.error('Upload without ACL FAILED:', err.message);
  }
}

testUpload();
