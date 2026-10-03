import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import CinematicHeroLayer from '@/components/Hero/CinematicHeroLayer';
import Features from '@/components/Features/Features';
import ServicesSection from '@/components/ServicesSection/ServicesSection';
import HowItWorksSection from '@/components/HowItWorksSection/HowItWorksSection';
import MapSection from '@/components/MapSection/MapSection';
import TestimonialsSection from '@/components/TestimonialsSection/TestimonialsSection';
import TrustSection from '@/components/TrustSection/TrustSection';
import Footer from '@/components/Footer/Footer';

export default function Home() {
  return (
    <main>
      <Header />
      <CinematicHeroLayer>
        <Hero />
      </CinematicHeroLayer>
      <TrustSection />
      <Features />
      <ServicesSection />
      <HowItWorksSection />
      <MapSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}
