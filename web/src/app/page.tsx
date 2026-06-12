import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import Features from '@/components/Features/Features';
import MapSection from '@/components/MapSection/MapSection';
import Footer from '@/components/Footer/Footer';

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Features />
      <MapSection />
      <Footer />
    </main>
  );
}
