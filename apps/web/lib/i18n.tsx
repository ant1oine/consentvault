'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Lang = 'en' | 'ar';
type Dict = Record<string, string>;

const en: Dict = {
  nav_platform: 'Platform',
  nav_resources: 'Resources',
  nav_partners: 'Partners',
  nav_company: 'Company',
  cta_consult: 'Schedule a Consultation',
  lang_en: 'English',
  lang_ar: 'العربية',
  headline: 'Built for Regulatory Confidence in the GCC',
  subhead: 'ConsentVault enables organizations to demonstrate, document, and defend compliance under PDPL, DIFC, and SDAIA regulations.',
  intro_para: 'From consent collection to audit-ready evidence, we help compliance and IT teams operationalize trust across every data workflow.',
  safeguard_title: 'What We Safeguard',
  safeguard_subtitle: 'Comprehensive compliance coverage across critical data domains',
  trusted_title: 'Trusted by Teams Where Compliance Is Not Optional',
  confidence_title: 'How Confidence Is Proven',
  confidence_desc: 'Every event in ConsentVault is timestamped, region-tagged, and cryptographically signed to produce verifiable compliance evidence.',
  gcc_title: 'Built for GCC Regulation',
  gcc_hosted: 'Hosted in AWS Bahrain and Azure UAE North',
  gcc_sovereignty: 'to maintain GCC data sovereignty.',
  assurance_title: 'Assurance Beyond Software',
  engage_title: 'Speak With Our Compliance Engineers',
  engage_desc: 'Our team will review your privacy workflows and show how ConsentVault can reduce audit risk within one week.',
  request_assessment: 'Request PDPL Readiness Assessment',
};

const ar: Dict = {
  nav_platform: 'المنصة',
  nav_resources: 'الموارد',
  nav_partners: 'الشركاء',
  nav_company: 'الشركة',
  cta_consult: 'احجز استشارة',
  lang_en: 'English',
  lang_ar: 'العربية',
  headline: 'مصمم لثقة تنظيمية في دول مجلس التعاون',
  subhead: 'تُمكّن ConsentVault المؤسسات من إثبات والاحتفاظ والدفاع عن الامتثال وفق PDPL وDIFC وSDAIA.',
  intro_para: 'من جمع الموافقة إلى الأدلة الجاهزة للتدقيق، نساعد فرق الامتثال وتقنية المعلومات على تشغيل الثقة عبر كل سير عمل للبيانات.',
  safeguard_title: 'ما نحميه',
  safeguard_subtitle: 'تغطية شاملة للامتثال عبر مجالات البيانات الحرجة',
  trusted_title: 'موثوق به من قبل الفرق حيث الامتثال ليس اختياريًا',
  confidence_title: 'كيف يتم إثبات الثقة',
  confidence_desc: 'كل حدث في ConsentVault مؤرخ وموضع جغرافيًا وموقع إلكترونيًا لإنتاج أدلة امتثال قابلة للتحقق.',
  gcc_title: 'مصمم لتنظيم دول مجلس التعاون',
  gcc_hosted: 'مستضاف في AWS البحرين و Azure الإمارات الشمالية',
  gcc_sovereignty: 'للحفاظ على سيادة بيانات دول مجلس التعاون.',
  assurance_title: 'ضمان يتجاوز البرمجيات',
  engage_title: 'تحدث مع مهندسي الامتثال لدينا',
  engage_desc: 'سيراجع فريقنا سير عمل الخصوصية الخاص بك ويوضح كيف يمكن لـ ConsentVault تقليل مخاطر التدقيق في غضون أسبوع واحد.',
  request_assessment: 'طلب تقييم جاهزية PDPL',
};

const dicts: Record<Lang, Dict> = { en, ar };

const I18nCtx = createContext<{ lang: Lang; t: (k: string) => string; setLang: (l: Lang) => void; } | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const saved = (localStorage.getItem('cv_lang') as Lang) || 'en';
    setLang(saved);
    document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = saved;
  }, []);

  useEffect(() => {
    localStorage.setItem('cv_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (k: string) => dicts[lang][k] ?? dicts['en'][k] ?? k;

  const value = useMemo(() => ({ lang, t, setLang }), [lang]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}


