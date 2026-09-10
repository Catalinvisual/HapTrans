const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, 'server/firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const token = 'd6f9zpobRrKSUGuSe69yNj:APA91bF04v4POEYxsTIQ5i9AsMufBPmO5omltSs1JZa_Ag7evN4XohSZR94m87764rX-TUbeHMGN8coBpFUepgv1LNshXc6KxEe7bJEbkWMQ-KS9BRPUCck';

async function testPush() {
  try {
    const message = {
      token,
      notification: {
        title: 'Test Din Antigravity',
        body: 'Daca vezi asta, push merge!',
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        type: 'test'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'hapcargo_channel_id',
        },
      },
    };

    const res = await admin.messaging().send(message);
    console.log('Push trimis cu succes:', res);
  } catch(e) {
    console.error('Eroare push:', e.message);
  }
}

testPush();
