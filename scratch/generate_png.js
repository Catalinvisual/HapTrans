const sharp = require('sharp');
const fs = require('fs');

const svgBuffer = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#FF5A00" width="100" height="100">
  <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
  <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
</svg>
`);

sharp(svgBuffer)
  .png()
  .toFile('../web/public/logo-icon.png')
  .then(info => {
    console.log('PNG generated:', info);
  })
  .catch(err => {
    console.error('Error:', err);
  });
