const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/email/resend.service.ts');
let code = fs.readFileSync(file, 'utf8');

// 1. Add cloudinary import
if (!code.includes('cloudinary')) {
  code = "import { v2 as cloudinary } from 'cloudinary';\n" + code;
}

// 2. Modify getLogoUrl
const getLogoUrlRegex = /private async getLogoUrl\(company\?: any\): Promise<string> \{([\s\S]*?)\}  async sendTripStatusEmail/m;

const newGetLogoUrl = `private async getLogoUrl(company?: any): Promise<string> {
    if (company && company.logo && company.logo.startsWith('http')) {
      return company.logo;
    }
    if (company && company.logo && company.logo.startsWith('data:image')) {
      try {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const result = await cloudinary.uploader.upload(company.logo, {
          folder: 'hapcargo_settings',
          public_id: 'company_logo',
          overwrite: true,
        });
        return result.secure_url;
      } catch (e) {
        console.error('Failed to upload data URI logo to cloudinary in resend service', e);
      }
    }
    try {
      const users = await this.usersService.findAll();
      const admin: any = users.find(u => u.role === 'admin' && u.companyLogoUrl && u.companyLogoUrl.startsWith('http'));
      if (admin) {
        return admin.companyLogoUrl;
      }
    } catch (e) {
      console.error('Error fetching admin logo URL', e);
    }
    return '';
  }

  async sendTripStatusEmail`;

code = code.replace(getLogoUrlRegex, newGetLogoUrl);

// 3. Modify email templates to hide broken image icon
code = code.replace(/const logoUrl = await this\.getLogoUrl\((.*?)\);\s*const logoHtml = `<img src="\$\{logoUrl\}"(.*?)\/>`;/g, 
`const logoUrl = await this.getLogoUrl($1);
    const logoHtml = logoUrl ? \`<img src="\${logoUrl}"$2/>\` : \`<h2 style="color: #ff5a00; margin: 0; font-size: 24px;">HapCargo</h2>\`;`);

// For sendTripStatusEmail where logoHtml isn't used
code = code.replace(/<img src="\$\{logoUrl\}"([^>]+)alt="HapCargo Logo" \/>/g, 
`\${logoUrl ? \`<img src="\${logoUrl}"$1alt="HapCargo Logo" />\` : \`<h2 style="color: #ff5a00; margin: 0; font-size: 24px;">HapCargo</h2>\`}`);

fs.writeFileSync(file, code);
console.log('Fixed resend.service.ts!');
