const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/components/Header/Header.tsx');
let code = fs.readFileSync(file, 'utf8');

// Change menu links
code = code.replace(/<Link href="\/".*?\{t\('home'\)\}<\/Link>/, `<Link href="#diensten" className={\`\${styles.navLink}\`} onClick={() => setMobileMenuOpen(false)}>{t('services')}</Link>`);
code = code.replace(/<Link href="\/despre-noi".*?\{t\('about'\)\}<\/Link>/, `<Link href="#harta" className={\`\${styles.navLink}\`} onClick={() => setMobileMenuOpen(false)}>Routes</Link>`);
code = code.replace(/<Link href="\/servicii".*?\{t\('services'\)\}<\/Link>/, `<Link href="#flota" className={\`\${styles.navLink}\`} onClick={() => setMobileMenuOpen(false)}>{t('fleet')}</Link>`);
code = code.replace(/<Link href="\/flota".*?\{t\('fleet'\)\}<\/Link>/, `<Link href="#despre" className={\`\${styles.navLink}\`} onClick={() => setMobileMenuOpen(false)}>{t('about')}</Link>`);

// Add two buttons to desktop actions
const desktopLoginBtnHtml = `<Link href="#quote" className={\`btn btn-primary \${styles.desktopLoginBtn}\`} style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', backgroundColor: '#fff', color: '#FF5A00', border: '2px solid #FF5A00' }}>
            {t('navQuote') || 'Cere oferta'}
          </Link>
          <Link href="/track" className={\`btn btn-primary \${styles.desktopLoginBtn}\`} style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', backgroundColor: '#FF5A00' }}>
            {t('clientLogin') || 'PORTAL CLIEN?I'}
          </Link>`;

code = code.replace(/<Link href="\/track" className=\{\`btn btn-primary \$\{styles\.desktopLoginBtn\}\`\}.*?<\/Link>/s, desktopLoginBtnHtml);

fs.writeFileSync(file, code);
console.log('Fixed Header');
