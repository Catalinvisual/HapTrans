const { S3Client, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
dotenv.config();

async function checkPolicy() {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || 'http://192.168.2.36:9000',
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '0X6E90Y7FTZJZ0P3G0MR',
      secretAccessKey: process.env.S3_SECRET_KEY || '+QbmgmexbBJWUJnpzOTBYgpgrARvt8jkEzNbR9G5',
    },
    forcePathStyle: true,
  });

  try {
    const data = await client.send(new GetBucketPolicyCommand({ Bucket: 'docs' }));
    console.log('Current Policy:', data.Policy);
  } catch (err) {
    console.error('Error fetching policy:', err.message);
  }
}

checkPolicy();
