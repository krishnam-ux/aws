import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Hero Slider: Local video assets exist and are non-empty files', () => {
  const videoFiles = [
    'community-highlights.mp4',
    'workshops-overview.mp4',
    'learning-projects.mp4',
    'community-moments.mp4',
  ];

  for (const file of videoFiles) {
    const filePath = path.join(process.cwd(), 'public', 'videos', file);
    assert.ok(fs.existsSync(filePath), `Video file ${file} must exist in public/videos/`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 10000, `Video file ${file} should have valid size (got ${stat.size} bytes)`);
  }
});

test('Hero Slider: Slide data structure contains valid metadata and local sources', () => {
  const componentPath = path.join(process.cwd(), 'src', 'components', 'HeroSlider.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');

  // Verify slide structure
  assert.ok(content.includes('community-highlights.mp4'), 'Should reference community video');
  assert.ok(content.includes('workshops-overview.mp4'), 'Should reference workshops video');
  assert.ok(content.includes('learning-projects.mp4'), 'Should reference learning video');
  assert.ok(content.includes('community-moments.mp4'), 'Should reference moments video');

  // Verify accessibility and reduced motion handling
  assert.ok(content.includes('prefers-reduced-motion'), 'Should respect prefers-reduced-motion');
  assert.ok(content.includes('aria-roledescription="carousel"'), 'Should have proper carousel ARIA role');
  assert.ok(content.includes('role="region"'), 'Should have region role');
  assert.ok(content.includes('visibilitychange'), 'Should pause when tab is hidden');

  // Verify custom controls
  assert.ok(content.includes('togglePlay'), 'Should support play/pause');
  assert.ok(content.includes('toggleMute'), 'Should support mute/unmute');
  assert.ok(content.includes('toggleFullscreen'), 'Should support fullscreen');
  assert.ok(content.includes('handleSeek'), 'Should support seeking');
});

test('Hero Slider: Video modal and keyboard shortcuts are properly wired', () => {
  const componentPath = path.join(process.cwd(), 'src', 'components', 'HeroSlider.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');

  assert.ok(content.includes('HeroVideoModal'), 'Should have HeroVideoModal component');
  assert.ok(content.includes("e.key === 'Escape'"), 'Should close modal on Escape');
  assert.ok(content.includes("e.key === ' ' || e.code === 'Space'"), 'Should toggle play on Space');
  assert.ok(content.includes("e.key === 'm' || e.key === 'M'"), 'Should toggle mute on M');
  assert.ok(content.includes('overflow = \'hidden\''), 'Should lock body scroll when modal open');
});
