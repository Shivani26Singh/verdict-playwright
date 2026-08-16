import Nav from "./components/Nav";
import Hero from "./components/Hero";
import WhySection from "./components/WhySection";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Install from "./components/Install";
import WorkflowAfterSetup from "./components/WorkflowAfterSetup";
import CliReference from "./components/CliReference";
import Reports from "./components/Reports";
import CiCd from "./components/CiCd";
import Benefits from "./components/Benefits";
import Faq from "./components/Faq";
import Troubleshooting from "./components/Troubleshooting";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <WhySection />
        <Features />
        <HowItWorks />
        <Install />
        <WorkflowAfterSetup />
        <CliReference />
        <Reports />
        <CiCd />
        <Benefits />
        <Faq />
        <Troubleshooting />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
