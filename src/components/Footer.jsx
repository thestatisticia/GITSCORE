import { useState } from 'react';

const socials = [
  { label: 'X', href: 'https://twitter.com/', icon: 'X' },
  { label: 'Telegram', href: 'https://t.me/', icon: 'TG' },
  { label: 'Medium', href: 'https://medium.com/', icon: 'M' },
];

export default function Footer({ onThemeToggle, theme }) {
  const [currentTheme, setCurrentTheme] = useState(theme || 'dark');

  const handleToggle = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(nextTheme);
    onThemeToggle?.(nextTheme);
  };

  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <p className="section-title">GSCORE</p>
          <p className="text-white/60 text-sm">Trustless GitHub scoring on Flare</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleToggle} className="secondary-btn w-auto px-4 py-2 text-xs tracking-[0.2em]">
            {currentTheme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
          </button>
          <div className="flex items-center gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

