'use client';

interface QuoteCTAButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function QuoteCTAButton({ onClick, variant = 'primary', size = 'md' }: QuoteCTAButtonProps) {
  const baseClasses = "inline-flex items-center gap-2 rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold";
  
  const variantClasses = {
    primary: "bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white",
    secondary: "border-2 border-white/30 hover:border-white/50 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white"
  };
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      Contact Us
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}


