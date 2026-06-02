const { S3Client, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

async function makeBucketPublic() {
  const client = new S3Client({
    endpoint: 'http://192.168.2.36:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: '0X6E90Y7FTZJZ0P3G0MR',
      secretAccessKey: '+QbmgmexbBJWUJnpzOTBYgpgrARvt8jkEzNbR9G5',
    },
    forcePathStyle: true,
  });

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicRead',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: ['arn:aws:s3:::docs/*'],
      },
    ],
  };

  try {
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: 'docs',
        Policy: JSON.stringify(policy),
      })
    );
    console.log('Bucket docs is now public! AccessDenied should be fixed.');
  } catch (error) {
    console.error('Failed to set bucket policy:', error);
  }
}

makeBucketPublic();
