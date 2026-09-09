'use client';

import * as React from 'react';

export default function DebugCookiesPage() {
  const [cookies, setCookies] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    setCookies(document.cookie.split(';').map(c => c.trim().split('=')[0]));
  }, []);
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Debug Cookies</h1>
      <pre>{JSON.stringify(cookies, null, 2)}</pre>
    </div>
  );
}
