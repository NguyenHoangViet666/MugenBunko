import type { CSSProperties } from 'react';

const glyphs = [
    { char: '物', left: '3%', top: '12%', size: 25, rotation: '-12deg' },
    { char: '語', left: '43%', top: '7%', size: 31, rotation: '9deg' },
    { char: '夢', left: '91%', top: '18%', size: 24, rotation: '-7deg' },
    { char: '書', left: '49%', top: '42%', size: 22, rotation: '6deg' },
    { char: '文', left: '6%', top: '72%', size: 32, rotation: '8deg' },
    { char: '庫', left: '40%', top: '82%', size: 24, rotation: '-8deg' },
    { char: '無', left: '87%', top: '78%', size: 29, rotation: '-10deg' },
    { char: '限', left: '19%', top: '32%', size: 19, rotation: '12deg' },
    { char: '墨', left: '69%', top: '13%', size: 23, rotation: '20deg' },
    { char: '道', left: '28%', top: '62%', size: 21, rotation: '-14deg' },
    { char: '心', left: '55%', top: '74%', size: 20, rotation: '-18deg' },
    { char: '魂', left: '79%', top: '47%', size: 24, rotation: '16deg' },
    { char: '創', left: '14%', top: '87%', size: 22, rotation: '-9deg' },
    { char: '風', left: '72%', top: '89%', size: 26, rotation: '11deg' },
];

export default function AboutKanjiBackground() {
    return <div className="about-hero-canvas about-story__kanji-field" data-about-parallax="0.055" aria-hidden="true" lang="ja">
        {glyphs.map((glyph, index) => <span key={glyph.char} style={{
            left: glyph.left,
            top: glyph.top,
            fontSize: glyph.size,
            '--glyph-rotation': glyph.rotation,
            '--glyph-duration': `${22 + (index % 5) * 3}s`,
            '--glyph-delay': `${-index * 3.7}s`,
        } as CSSProperties}>{glyph.char}</span>)}
    </div>;
}
