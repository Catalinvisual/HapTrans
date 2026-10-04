import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import heroStyles from '@/components/Hero/Hero.module.css';
import TmsStats from '@/components/Hero/TmsStats';
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
      {/* The existing Hero contains the calculator; leave its markup and handlers
          untouched. Hide only its legacy, hard-coded stats card by its CSS-module
          class and replace it with the live TMS component below. */}
      <style>{`.${heroStyles.statsBanner}{display:none}`}</style>
      <CinematicHeroLayer>
        <Hero />
      </CinematicHeroLayer>
      <TmsStats />
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
