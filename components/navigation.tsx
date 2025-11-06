'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      // For contact section, scroll to bottom of page
      if (sectionId === 'contact') {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl md:text-3xl font-bold text-white hover:text-[var(--color-accent)] transition cursor-pointer">
            Monaghan&apos;s
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 text-base">
            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              className="hover:text-[var(--color-accent)] transition text-white/90 cursor-pointer"
            >
              About
            </a>
            <a
              href="#gallery"
              onClick={(e) => scrollToSection(e, 'gallery')}
              className="hover:text-[var(--color-accent)] transition text-white/90 cursor-pointer"
            >
              Gallery
            </a>
            <Link href="/menu" className="hover:text-[var(--color-accent)] transition text-white/90 cursor-pointer">
              Menu
            </Link>
            <Link href="/events" className="hover:text-[var(--color-accent)] transition text-white/90 cursor-pointer">
              Events
            </Link>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, 'contact')}
              className="hover:text-[var(--color-accent)] transition text-white/90 cursor-pointer"
            >
              Contact
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3">
            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              className="block hover:text-[var(--color-accent)] transition text-white/90 py-2 cursor-pointer"
            >
              About
            </a>
            <a
              href="#gallery"
              onClick={(e) => scrollToSection(e, 'gallery')}
              className="block hover:text-[var(--color-accent)] transition text-white/90 py-2 cursor-pointer"
            >
              Gallery
            </a>
            <Link href="/menu" className="block hover:text-[var(--color-accent)] transition text-white/90 py-2 cursor-pointer">
              Menu
            </Link>
            <Link href="/events" className="block hover:text-[var(--color-accent)] transition text-white/90 py-2 cursor-pointer">
              Events
            </Link>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, 'contact')}
              className="block hover:text-[var(--color-accent)] transition text-white/90 py-2 cursor-pointer"
            >
              Contact
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
