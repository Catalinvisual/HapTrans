const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/components/StatsSection/StatsSection.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import React from 'react';/, "import React, { useEffect, useState } from 'react';");

code = code.replace(/const { t } = useLanguage\(\);/, `const { t } = useLanguage();
  const [data, setData] = useState({ trucks: 50, trips: 15000, clients: 250, countries: 24 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
        const res = await fetch(\`\${apiUrl}/public/stats\`);
        if (res.ok) {
          const json = await res.json();
          if (json && !json.error) {
            setData({
              trucks: json.trucks || 50,
              trips: json.trips || 15000,
              clients: json.clients || 250,
              countries: json.countries || 24,
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch public stats', e);
      }
    };
    fetchStats();
  }, []);
`);

code = code.replace(/value: '50\+'/, "value: `${data.trucks}+`");
code = code.replace(/value: '250\+'/, "value: `${data.clients}+`");
code = code.replace(/value: '15\.000\+'/, "value: `${data.trips.toLocaleString('nl-NL')}+`");
code = code.replace(/value: '24'/, "value: `${data.countries}`");

fs.writeFileSync(file, code);
console.log('Fixed StatsSection');
