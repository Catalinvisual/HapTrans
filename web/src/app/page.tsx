import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import Features from '@/components/Features/Features';
import MapSection from '@/components/MapSection/MapSection';
import StatsSection from '@/components/StatsSection/StatsSection';
import TestimonialsSection from '@/components/TestimonialsSection/TestimonialsSection';
import Footer from '@/components/Footer/Footer';

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <StatsSection />
      <Features />
      <MapSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}
