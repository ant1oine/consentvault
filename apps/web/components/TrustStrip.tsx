import { CheckCircle2 } from "lucide-react";

export function TrustStrip() {
  const certifications = [
    "ISO 27001",
    "SOC 2",
    "PDPL Alignment",
    "DIFC Readiness"
  ];

  return (
    <section className="bg-white border-y border-cv-slate/50" aria-label="Certifications and compliance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {certifications.map((cert, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-cv-slate bg-cv-sand/30"
            >
              <CheckCircle2 className="w-4 h-4 text-cv-teal flex-shrink-0" />
              <span className="text-sm font-medium text-cv-text">{cert}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

