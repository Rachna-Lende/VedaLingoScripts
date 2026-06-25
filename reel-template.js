// Generates a single-reel HTML page (4 screens) for Puppeteer to screenshot.
// All visual settings match the approved design from Days 1-3.

function reelHTML(content) {
  const { devanagari, translit, screenText,
          hook, voice2, voice3, voice4 } = content;

  // Multi-line Devanagari (some entries use \n for line breaks)
  const devaLines = devanagari.split('\n');
  const fontSize  = devaLines.length >= 3 ? '76px'
                  : devaLines.length === 2 ? '110px'
                  : '136px';

  const devaHTML = devaLines.join('<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0a0202; display: flex; flex-direction: column; align-items: center; }

.reel {
  width: 763px; height: 1600px;
  position: relative; overflow: hidden; flex-shrink: 0;
  background: url('${__dirname.replace(/\\/g, '/')}/bg.png') center top / cover no-repeat;
}
.reel::before {
  content: ''; position: absolute; inset: 0;
  background: rgba(6, 2, 1, 0.30); z-index: 0; pointer-events: none;
}
.reel > * { position: relative; z-index: 1; }

.deva-word {
  position: absolute; top: 40%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Tiro Devanagari Hindi', serif;
  font-size: ${fontSize}; font-weight: 400;
  color: #F5E4B0; text-align: center; line-height: 1.15; width: 88%;
  text-shadow:
    0 0 28px rgba(255, 215, 80, 0.50),
    0 0 65px rgba(220, 155, 20, 0.22),
    2px 3px 12px rgba(0, 0, 0, 0.85);
  letter-spacing: 3px;
}
.translit {
  position: absolute; top: 57%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 28px; color: rgba(212, 175, 55, 0.78);
  letter-spacing: 2px; text-align: center; width: 80%;
}
.screen-text {
  position: absolute; top: 67%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif;
  font-size: 42px; color: #E8D8A0;
  text-align: center; line-height: 1.4; width: 80%;
  text-shadow: 0 2px 14px rgba(0,0,0,0.60);
}
.divider {
  position: absolute; top: 59%; left: 50%; transform: translateX(-50%);
  width: 160px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,0.50), transparent);
}
.hook-text {
  position: absolute; top: 47%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif;
  font-size: 58px; font-weight: 500; color: #F0E2BA;
  text-align: center; line-height: 1.38; width: 82%;
  text-shadow: 0 2px 18px rgba(0,0,0,0.65);
}
.tagline {
  position: absolute; top: 74%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif;
  font-size: 40px; font-style: italic;
  color: rgba(212, 175, 55, 0.82); text-align: center;
}
</style>
</head>
<body>

<!-- Screen 1: Hook -->
<div class="reel" id="s1">
  <div class="hook-text">${hook}</div>
</div>

<!-- Screen 2: Sanskrit word (visual hero — not spoken) -->
<div class="reel" id="s2">
  <div class="deva-word">${devaHTML}</div>
  <div class="divider"></div>
  <div class="translit">(${translit})</div>
  <div class="screen-text">${screenText}</div>
</div>

<!-- Screen 3: Meaning / Explanation -->
<div class="reel" id="s3">
  <div class="hook-text" style="font-size:54px">${voice3}</div>
</div>

<!-- Screen 4: Takeaway + Veda Lingo -->
<div class="reel" id="s4">
  <div class="hook-text" style="top:42%;font-size:54px">${voice4}</div>
  <div class="tagline">— Veda Lingo</div>
</div>

</body>
</html>`;
}

module.exports = { reelHTML };
