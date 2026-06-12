'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useLanguage } from '@/context/LanguageContext';

export default function ContactPage() {
  const { t } = useLanguage();
  const [content, setContent] = useState<string>('Se încarcă...');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Fetch left column content from CMS
    fetch('http://localhost:3001/api/website-cms')
      .then(res => res.json())
      .then(data => {
        if (data['contact']) {
          setContent(data['contact']);
        } else {
          setContent('<p>Detaliile de contact nu au fost setate încă.</p>');
        }
      })
      .catch(() => {
        setContent('<p>Eroare la încărcarea conținutului.</p>');
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://joyful-exploration-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{t('contactPageTitle')}</h1>
            <p className="text-lg text-slate-500">{t('contactPageSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            
            {/* Left Side: CMS Content */}
            <div>
              <div 
                className="prose prose-lg prose-blue max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>

            {/* Right Side: Contact Form */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              {status === 'success' ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Mesaj Trimis!</h3>
                  <p className="text-slate-600">{t('contactSuccess')}</p>
                  <button onClick={() => setStatus('idle')} className="mt-8 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Trimite alt mesaj
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('contactName')}</label>
                    <input 
                      required 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('contactEmail')}</label>
                    <input 
                      required 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('contactSubject')}</label>
                    <input 
                      required 
                      type="text" 
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('contactMessage')}</label>
                    <textarea 
                      required 
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    disabled={status === 'loading'}
                    className="w-full py-4 bg-[#FF5A00] text-white font-bold text-lg rounded-xl hover:bg-[#e65000] active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {status === 'loading' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('contactSending')}
                      </>
                    ) : (
                      t('contactSend')
                    )}
                  </button>
                  
                  {status === 'error' && (
                    <p className="text-red-500 text-sm text-center font-medium mt-2">A apărut o eroare la trimiterea mesajului. Încearcă din nou.</p>
                  )}
                </form>
              )}
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
