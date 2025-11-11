"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Lock, 
  FileCheck, 
  Database, 
  CheckCircle2, 
  ArrowRight, 
  Globe, 
  Building2, 
  FileText,
  MapPin,
  Server,
  Clock,
  Download,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header/Header";
import { useI18n } from "@/lib/i18n";
import TrustLock from "@/components/hero/TrustLock";

// ============================================================================
// Reusable Components
// ============================================================================

function Section({ 
  children, 
  className = "",
  bgColor = "white"
}: { 
  children: React.ReactNode; 
  className?: string;
  bgColor?: "white" | "sand" | "slate" | "faint";
}) {
  const bgClasses = {
    white: "bg-white",
    sand: "bg-[#F9FAFB]",
    slate: "bg-[#F8FAFC]",
    faint: "bg-[#F9FAFB]"
  };

  return (
    <section className={`py-20 ${bgClasses[bgColor]} ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        {children}
      </div>
    </section>
  );
}

function SectionHeading({ 
  title, 
  subtitle, 
  className = "" 
}: { 
  title: string; 
  subtitle?: string; 
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-3xl md:text-4xl font-display font-semibold text-[#1E3A8A] mb-4 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base text-slate-700 max-w-3xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function CertificationStrip() {
  const certifications = [
    "ISO 27001",
    "SOC 2",
    "CSA STAR",
    "PDPL/DIFC"
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 text-xs uppercase tracking-wider text-slate-400 font-medium">
      {certifications.map((cert, index) => (
        <span key={index} className="px-2">
          {index > 0 && <span className="mx-2">•</span>}
          {cert}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// Footer Component
// ============================================================================

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0F172A] text-white border-t border-[#1E293B]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Platform */}
          <div>
            <h3 className="text-white font-semibold mb-4 font-display">Platform</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link href="#consent" className="hover:text-white transition-colors">
                  Consent Management
                </Link>
              </li>
              <li>
                <Link href="#data-rights" className="hover:text-white transition-colors">
                  Data Rights
                </Link>
              </li>
              <li>
                <Link href="#residency" className="hover:text-white transition-colors">
                  Residency
                </Link>
              </li>
              <li>
                <Link href="#audit" className="hover:text-white transition-colors">
                  Audit
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4 font-display">Company</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link href="#about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#security" className="hover:text-white transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link href="#careers" className="hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4 font-display">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link href="#pdpl" className="hover:text-white transition-colors">
                  PDPL
                </Link>
              </li>
              <li>
                <Link href="#difc" className="hover:text-white transition-colors">
                  DIFC
                </Link>
              </li>
              <li>
                <Link href="#terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="#privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          {/* Region */}
          <div>
            <h3 className="text-white font-semibold mb-4 font-display">Region</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link href="#uae-pdpl" className="hover:text-white transition-colors">
                  UAE PDPL
                </Link>
              </li>
              <li>
                <Link href="#gcc-readiness" className="hover:text-white transition-colors">
                  GCC Readiness
                </Link>
              </li>
              <li>
                <Link href="#arabic" className="hover:text-white transition-colors">
                  Arabic Language
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1E293B] pt-8 text-sm text-slate-300">
          © {currentYear} ConsentVault FZ-LLC. All rights reserved. Hosted in UAE North.
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function HomePage() {
  const { t } = useI18n();

  const fadeInUp = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 1️⃣ Hero Section */}
      <section 
        className="relative min-h-[90vh] flex items-center overflow-hidden"
        style={{ 
          background: 'radial-gradient(ellipse at center, #F9FAFB 0%, #EEF2FF 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Textual trust narrative */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-[52px] leading-[1.15] font-semibold text-[#0F172A] tracking-tight mb-6">
                Built for <span className="font-bold text-[#1E3A8A]">UAE PDPL compliance</span><br/>
                Architected for <span className="font-bold text-[#155E75]">enterprise data protection</span>
              </h1>
              <p className="text-[18px] text-[#475569] mb-8 max-w-[640px] leading-relaxed">
                ConsentVault enables UAE organizations to demonstrate and defend compliance under PDPL, DIFC, and GCC frameworks — with verifiable consent, audit evidence, and local data residency.
              </p>
              <div className="flex gap-4 mt-8">
                <Link 
                  href="/contact"
                  className="px-6 py-3 rounded-lg bg-[#1E3A8A] text-white text-sm font-medium shadow-sm hover:bg-[#102A6A] transition-colors"
                >
                  Request a Demo
                </Link>
                <Link 
                  href="/docs"
                  className="px-6 py-3 rounded-lg border border-[#1E3A8A] text-[#1E3A8A] text-sm font-medium hover:bg-[#E0E7FF] transition-colors"
                >
                  Explore Platform
                </Link>
              </div>
            </motion.div>

            {/* Right: Trust Lock Visualization */}
            <div className="relative flex items-center justify-center">
              <TrustLock />
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ Why UAE Teams Trust ConsentVault */}
      <Section bgColor="white" className="relative">
        {/* Faint background radial gradient from bottom-right */}
        <div 
          className="absolute bottom-0 right-0 w-1/2 h-1/2 opacity-30 -z-10" 
          style={{ background: 'radial-gradient(circle at bottom right, #ECFEFF 0%, transparent 70%)' }}
        />
        <div className="relative z-10">
          <div className="text-center mb-4">
            <h2 className="text-[32px] font-display font-semibold text-[#1E3A8A] mb-3">
              Why UAE teams trust ConsentVault.
            </h2>
            <p className="text-base text-slate-700 max-w-2xl mx-auto">
              Purpose-built for regulated industries with high data assurance requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-12">
            {[
              {
                icon: MapPin,
                title: "PDPL-Aligned Infrastructure",
                description: "Consent management workflows mapped to UAE legal articles."
              },
              {
                icon: FileCheck,
                title: "Audit-Ready Evidence",
                description: "Generate regulator-ready logs and proof packages instantly."
              },
              {
                icon: Server,
                title: "Regional Data Residency",
                description: "Store and process data exclusively within approved UAE and GCC zones."
              }
            ].map((card, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`p-8 ${index < 2 ? 'md:border-r border-slate-200/70' : ''} ${index === 1 ? 'md:border-l md:border-r' : ''} ${index < 2 ? 'border-b md:border-b-0 border-slate-200/70' : ''}`}
              >
                <div className="w-10 h-10 flex items-center justify-center mb-6">
                  <card.icon className="w-6 h-6 text-[#1E3A8A] stroke-2" />
                </div>
                <h3 className="text-xl font-display font-semibold text-[#1E3A8A] mb-3">
                  {card.title}
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* 3️⃣ Operationalizing Compliance Diagram */}
      <Section bgColor="slate">
        <div className="text-center mb-8">
          <h2 className="text-[32px] font-display font-semibold text-[#1E3A8A] mb-3">
            Operationalizing Compliance
          </h2>
          <p className="text-sm text-slate-700 max-w-2xl mx-auto">
            Every consent event is cryptographically sealed and region-tagged to ensure compliance verification.
          </p>
        </div>

        <div className="bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] rounded-2xl p-8 md:p-12 mt-6">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {[
              { icon: FileText, label: "Consent Capture" },
              { icon: Lock, label: "Secure Ledger" },
              { icon: MapPin, label: "Residency Proof" },
              { icon: Clock, label: "Audit Trail" },
              { icon: Download, label: "Evidence Export" }
            ].map((step, index, array) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="flex items-center"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                    <step.icon className="w-10 h-10 text-[#0EA5A9]" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center max-w-[120px]">
                    {step.label}
                  </span>
                </div>
                {index < array.length - 1 && (
                  <div className="w-8 h-0.5 bg-[#0EA5A9]/30 mx-2 md:mx-4 hidden md:block flex-shrink-0" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* 4️⃣ Trusted by Teams */}
      <Section bgColor="white">
        <div className="text-center mb-12">
          <h2 className="text-[32px] font-display font-semibold text-[#1E3A8A] mb-8">
            Trusted by teams across Finance, Healthcare, and Cloud Services
          </h2>
        </div>

        {/* Partner logos - gray silhouette style */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-8 mb-12">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="flex items-center justify-center h-16 grayscale opacity-40"
            >
              <Building2 className="w-16 h-16 text-slate-400" />
            </div>
          ))}
        </div>

        {/* Certification badges */}
        <div className="mt-8">
          <CertificationStrip />
        </div>

        {/* Very faint horizontal divider */}
        <div className="border-t border-slate-100 mt-8" />
      </Section>

      {/* 5️⃣ Enterprise-Grade Assurance */}
      <Section bgColor="faint">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            {...fadeInUp}
          >
            <h2 className="text-[32px] font-display font-semibold text-[#1E3A8A] mb-6 leading-tight tracking-normal">
              Enterprise-grade assurance, engineered for UAE compliance.
            </h2>
            <ul className="space-y-4 mb-8">
              {[
                "SOC 2 in progress",
                "AES-256 Encryption",
                "Regional data isolation",
                "SLA 99.95% uptime"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[#0EA5A9] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-[#0EA5A9]" />
                  </div>
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
            <Button 
              size="lg"
              className="bg-[#1E3A8A] text-white hover:bg-[#102D6B] shadow-sm font-medium"
            >
              Explore Assurance Framework <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>

          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            {/* Soft shadow + gradient mask to blend into background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent rounded-2xl blur-xl" />
            <div className="relative aspect-video bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] rounded-2xl flex items-center justify-center shadow-lg">
              <div className="text-center">
                <Database className="w-16 h-16 text-[#1E3A8A]/30 mx-auto mb-4" />
                <p className="text-sm text-slate-500">Trust Dashboard Mock</p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* 6️⃣ Call to Action */}
      <Section bgColor="slate" className="bg-gradient-to-b from-[#F8FAFC] to-white">
        <motion.div
          {...fadeInUp}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-[32px] font-display font-semibold text-[#1E3A8A] mb-4">
            Align your PDPL compliance in less than a week.
          </h2>
          <p className="text-lg text-slate-700 mb-10 max-w-2xl mx-auto leading-relaxed">
            Our engineers will assess your current consent and data workflows, and build your compliance readiness plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-[#1E3A8A] text-white hover:bg-[#102D6B] shadow-sm font-medium"
            >
              Book a Compliance Consultation
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#E0E7FF] font-medium"
            >
              Contact Sales
            </Button>
          </div>
        </motion.div>
      </Section>

      <Footer />
    </div>
  );
}
