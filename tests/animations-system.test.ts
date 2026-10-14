import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Website Animations & Accessibility Test Suite', async (t) => {
  const globalsCssPath = path.join(process.cwd(), 'src/app/globals.css');
  const scrollRevealPath = path.join(process.cwd(), 'src/components/ScrollRevealProvider.tsx');
  const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
  const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
  const heroSliderPath = path.join(process.cwd(), 'src/components/HeroSlider.tsx');

  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
  const scrollReveal = fs.readFileSync(scrollRevealPath, 'utf8');
  const layout = fs.readFileSync(layoutPath, 'utf8');
  const navbar = fs.readFileSync(navbarPath, 'utf8');
  const heroSlider = fs.readFileSync(heroSliderPath, 'utf8');

  await t.test('1. Global CSS contains keyframe animation definitions', () => {
    assert.ok(globalsCss.includes('@keyframes fadeIn'), 'Must define fadeIn keyframes');
    assert.ok(globalsCss.includes('@keyframes fadeInUp'), 'Must define fadeInUp keyframes');
    assert.ok(globalsCss.includes('@keyframes fadeInScale'), 'Must define fadeInScale keyframes');
    assert.ok(globalsCss.includes('@keyframes floatGentle'), 'Must define floatGentle keyframes');
    assert.ok(globalsCss.includes('@keyframes pulseSubtle'), 'Must define pulseSubtle keyframes');
  });

  await t.test('2. Global CSS contains scroll-reveal classes and staggered timing', () => {
    assert.ok(globalsCss.includes('.reveal'), 'Must define .reveal class');
    assert.ok(globalsCss.includes('.reveal.is-revealed'), 'Must define .reveal.is-revealed state');
    assert.ok(globalsCss.includes('.stagger-1'), 'Must define .stagger-1 delay');
    assert.ok(globalsCss.includes('.stagger-4'), 'Must define .stagger-4 delay');
    assert.ok(globalsCss.includes('.stagger-8'), 'Must define .stagger-8 delay');
    assert.ok(globalsCss.includes('.hover-lift'), 'Must define .hover-lift utility');
  });

  await t.test('3. Strict Accessibility: prefers-reduced-motion is completely respected', () => {
    assert.ok(
      globalsCss.includes('@media (prefers-reduced-motion: reduce)'),
      'Must include @media (prefers-reduced-motion: reduce) block'
    );
    assert.ok(
      globalsCss.includes('animation-duration: 0.01ms !important'),
      'Must nullify animation-duration when reduced motion is preferred'
    );
    assert.ok(
      globalsCss.includes('opacity: 1 !important'),
      'Must force opacity: 1 on reveal elements for reduced motion'
    );
    assert.ok(
      scrollReveal.includes("matchMedia('(prefers-reduced-motion: reduce)')"),
      'ScrollRevealProvider must check window matchMedia for prefers-reduced-motion'
    );
  });

  await t.test('4. ScrollRevealProvider is integrated in RootLayout', () => {
    assert.ok(
      layout.includes('import ScrollRevealProvider from "@/components/ScrollRevealProvider"'),
      'RootLayout must import ScrollRevealProvider'
    );
    assert.ok(
      layout.includes('<ScrollRevealProvider>'),
      'RootLayout must wrap main content in ScrollRevealProvider'
    );
  });

  await t.test('5. ScrollRevealProvider safeguards admin and proctored exam sessions', () => {
    assert.ok(
      scrollReveal.includes("pathname?.startsWith('/admin')"),
      'ScrollRevealProvider must protect /admin routes'
    );
    assert.ok(
      scrollReveal.includes("pathname?.startsWith('/exam/')"),
      'ScrollRevealProvider must protect proctored /exam/ routes'
    );
  });

  await t.test('6. Interactive component enhancements', () => {
    // Navbar scroll detection & backdrop blur
    assert.ok(navbar.includes('const [scrolled, setScrolled] = useState(false);'), 'Navbar must track scroll position');
    assert.ok(navbar.includes('backdrop-blur-md'), 'Navbar must apply backdrop blur when scrolled');

    // HeroSlider crossfade keying
    assert.ok(heroSlider.includes('animate-fade-in'), 'HeroSlider must crossfade slide content with animate-fade-in');
  });
});
