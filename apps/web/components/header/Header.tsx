'use client';

import Link from 'next/link';
import { MegaMenu } from './MegaMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/lib/i18n';

export function Header() {
  const { t } = useI18n();

  const menus = [
    {
      label: t('nav_platform'),
      items: [
        { title: 'Consent Management', desc: 'Collect, log, and evidence consent across surfaces.', href: '/platform/consent' },
        { title: 'Data Rights', desc: 'Fulfill DSARs with SLA tracking and audit trails.', href: '/platform/data-rights' },
        { title: 'Residency Attestation', desc: 'Verifiable in-region storage proof for GCC.', href: '/platform/residency' },
        { title: 'Audit Exports', desc: 'Regulator-ready evidence bundles.', href: '/platform/audit' },
      ],
    },
    {
      label: t('nav_resources'),
      items: [
        { title: 'PDPL Readiness Guide', desc: 'Practical steps to operationalize PDPL.', href: '/resources/pdpl-guide' },
        { title: 'Implementation Docs', desc: 'SDK & API reference for engineering teams.', href: '/docs' },
        { title: 'Case Studies', desc: 'How teams reduce audit risk with ConsentVault.', href: '/resources/cases' },
        { title: 'Blog', desc: 'Compliance engineering insights.', href: '/blog' },
      ],
    },
    {
      label: t('nav_partners'),
      items: [
        { title: 'Consulting Partners', desc: 'Advisories & GRC partners in GCC.', href: '/partners/consulting' },
        { title: 'Technology Partners', desc: 'Cloud & integration partners.', href: '/partners/technology' },
      ],
    },
    {
      label: t('nav_company'),
      items: [
        { title: 'About Us', desc: 'Our mission and operating principles.', href: '/company/about' },
        { title: 'Security', desc: 'Practices, standards, and architecture.', href: '/company/security' },
        { title: 'Careers', desc: 'Join us.', href: '/company/careers' },
        { title: 'Contact', desc: 'Speak with our team.', href: '/contact' },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200/60 shadow-header">
      <div className="mx-auto max-w-7xl h-16 flex items-center justify-between">
        {/* Left: Logo flush left */}
        <div className="flex items-center pl-6 lg:pl-8">
          <Link
            href="/"
            className="text-[#0F172A] font-display font-semibold text-lg tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 rounded transition-colors hover:text-[#1E3A8A]"
          >
            ConsentVault
          </Link>
        </div>

        {/* Center: Navigation with equal spacing */}
        <div className="flex items-center gap-0">
          <MegaMenu menus={menus} />
        </div>

        {/* Right: Login → Consultation → Globe */}
        <div className="flex items-center gap-0 pr-6 lg:pr-8">
          <Link
            href="/login"
            className="hidden md:inline-flex h-9 items-center rounded-md border border-[#1E3A8A] px-4 text-[#1E3A8A] text-sm font-medium hover:bg-[#E0E7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 transition-all duration-[120ms] ease-in-out"
          >
            Login
          </Link>
          <div className="hidden md:block h-6 w-px bg-slate-200/60 mx-3" />
          <Link
            href="/contact"
            className="hidden md:inline-flex h-9 items-center rounded-md bg-[#1E3A8A] px-4 text-white text-sm font-medium shadow-sm hover:bg-[#102A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 transition-all duration-[120ms] ease-in-out"
          >
            {t('cta_consult')}
          </Link>
          <div className="hidden md:block h-6 w-px bg-slate-200/60 mx-3" />
          <LanguageSwitcher />
        </div>
      </div>
      {/* subtle gradient divider */}
      <div className="h-px w-full bg-gradient-to-r from-slate-200/50 via-slate-200/30 to-transparent" />
    </header>
  );
}

