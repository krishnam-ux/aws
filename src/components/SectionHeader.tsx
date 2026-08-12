interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}

export default function SectionHeader({ eyebrow, title, subtitle, center = false }: SectionHeaderProps) {
  return (
    <div className={`mb-8 max-w-3xl ${center ? 'text-center mx-auto' : ''}`}>
      {eyebrow && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-aws-orange font-display block mb-1">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-navy tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
