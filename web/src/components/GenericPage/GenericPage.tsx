'use client';
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';

export default function GenericPage({ slug, title }: { slug: string, title: string }) {
  const [content, setContent] = useState<string>('Se încarcă...');

  useEffect(() => {
    // In production, point to backend API
    // As a workaround for cross-env dev, we fetch from the backend port (3001)
    fetch('http://localhost:3001/api/website-cms')
      .then(res => res.json())
      .then(data => {
        if (data[slug]) {
          setContent(data[slug]);
        } else {
          setContent('Conținutul pentru această pagină nu a fost definit încă.');
        }
      })
      .catch(() => {
        setContent('Eroare la încărcarea conținutului.');
      });
  }, [slug]);

  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">{title}</h1>
          <div 
            className="prose prose-lg max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
