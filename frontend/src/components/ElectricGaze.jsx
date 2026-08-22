import React, { useEffect, useRef } from 'react';

const DEFAULT_SOURCE = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1400&q=85';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function adjustRgb(r, g, b, p) {
  r += p.brightness; g += p.brightness; b += p.brightness;
  const c = p.contrast / 100;
  r = (r - 128) * c + 128; g = (g - 128) * c + 128; b = (b - 128) * c + 128;
  const gray = (r + g + b) / 3;
  const sat = p.saturation / 100;
  r = gray + (r - gray) * sat; g = gray + (g - gray) * sat; b = gray + (b - gray) * sat;
  const k = p.grayscale / 100;
  r += (gray - r) * k; g += (gray - g) * k; b += (gray - b) * k;
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}

export default function ElectricGaze({
  className = '', sourceSrc = DEFAULT_SOURCE, renderMode = 'dither', bgMode = 'none', bgBlur = 12,
  bgOpacity = 90, cellSize = 9, coverage = 100, invert = false, brightness = 0, contrast = 158,
  edgeEmphasis = 0, density = 20, tint = '#d6a73a', tintOpacity = 0, saturation = 100, grayscale = 0,
  blurType = 'off', blurAmount = 35, pfx = {}, animated = true, animStyle = 'shimmer', animSpeed = 100,
  animIntensity = 60, style = {},
}) {
  const canvasRef = useRef(null);
  const bufferRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    const buffer = document.createElement('canvas');
    const bctx = buffer.getContext('2d', { willReadFrequently: true });
    bufferRef.current = buffer;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceSrc;
    let stopped = false;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(2, Math.floor(rect.width * dpr));
      const h = Math.max(2, Math.floor(rect.height * dpr));
      canvas.width = w; canvas.height = h; canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
      buffer.width = w; buffer.height = h;
    };

    const drawCover = (target, image) => {
      const w = target.canvas.width, h = target.canvas.height;
      const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
      const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
      target.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
    };

    const draw = (time) => {
      if (stopped) return;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      if (!img.complete || !img.naturalWidth) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const t = time * 0.001 * (animSpeed / 100);
      bctx.clearRect(0, 0, w, h);
      bctx.fillStyle = '#000'; bctx.fillRect(0, 0, w, h);
      drawCover(bctx, img);
      const data = bctx.getImageData(0, 0, w, h).data;

      if (bgMode === 'image') {
        ctx.save(); ctx.globalAlpha = bgOpacity / 100; ctx.filter = `blur(${bgBlur}px)`; drawCover(ctx, img); ctx.restore();
      } else if (bgMode === 'solid') {
        ctx.fillStyle = '#050505'; ctx.globalAlpha = bgOpacity / 100; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      }

      const cols = Math.ceil(w / cellSize), rows = Math.ceil(h / cellSize);
      const [tr, tg, tb] = hexToRgb(tint);
      const chars = '@%#*+=-:. ';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        if (Math.random() * 100 > coverage) continue;
        const x0 = gx * cellSize, y0 = gy * cellSize, x1 = Math.min(w, x0 + cellSize), y1 = Math.min(h, y0 + cellSize);
        let sr = 0, sg = 0, sb = 0, count = 0;
        const step = Math.max(1, Math.floor(cellSize / 3));
        for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
          const i = (y * w + x) * 4; sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; count++;
        }
        let [r, g, b] = adjustRgb(sr / count, sg / count, sb / count, { brightness, contrast, saturation, grayscale });
        let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        if (edgeEmphasis) lum = clamp(lum + Math.abs(lum - 0.5) * 2 * edgeEmphasis / 100 * 0.25);
        if (invert) lum = 1 - lum;
        let motion = 0;
        if (animated) {
          if (animStyle === 'pulse') motion = Math.sin(t * 4) * .08;
          else if (animStyle === 'wave') motion = Math.sin(gy * .18 + t * 3) * .12;
          else if (animStyle === 'ripple') motion = Math.sin(Math.hypot(gx - cols / 2, gy - rows / 2) * .22 - t * 4) * .12;
          else if (animStyle === 'flicker') motion = (Math.random() - .5) * .18;
          else motion = Math.sin(gx * .11 + gy * .06 + t * 2.5) * .12;
        }
        lum = clamp(lum + motion * (animIntensity / 100));
        const alpha = clamp((.25 + lum * 1.1) * (density / 20));
        const rr = clamp(r + (tr - r) * (tintOpacity / 100));
        const gg = clamp(g + (tg - g) * (tintOpacity / 100));
        const bb = clamp(b + (tb - b) * (tintOpacity / 100));
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha})`;
        const cx = x0 + cellSize / 2, cy = y0 + cellSize / 2;
        const size = Math.max(1, cellSize * (.25 + lum * .8));

        if (renderMode === 'characters') {
          ctx.font = `${Math.max(5, size * 1.35)}px monospace`;
          ctx.fillText(chars[Math.min(chars.length - 1, Math.floor(lum * chars.length))], cx, cy);
        } else if (renderMode === 'mosaic' || renderMode === 'pixel' || renderMode === 'dither') {
          const s = Math.max(1, cellSize * (.25 + lum * .75));
          if (renderMode === 'dither') {
            const pattern = ((gx + gy) & 1) === 0 ? 1 : .68;
            ctx.globalAlpha = alpha * pattern;
          }
          ctx.fillRect(cx - s / 2, cy - s / 2, s, s); ctx.globalAlpha = 1;
        } else if (renderMode === 'cross') {
          ctx.lineWidth = Math.max(1, cellSize / 8); ctx.beginPath(); ctx.moveTo(cx-size/2,cy-size/2); ctx.lineTo(cx+size/2,cy+size/2); ctx.moveTo(cx+size/2,cy-size/2); ctx.lineTo(cx-size/2,cy+size/2); ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
        } else if (renderMode === 'diamond') {
          ctx.beginPath(); ctx.moveTo(cx,cy-size/2); ctx.lineTo(cx+size/2,cy); ctx.lineTo(cx,cy+size/2); ctx.lineTo(cx-size/2,cy); ctx.closePath(); ctx.fill();
        } else if (renderMode === 'rings') {
          ctx.lineWidth = Math.max(1,size/5); ctx.beginPath(); ctx.arc(cx,cy,size/2,0,Math.PI*2); ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
        } else if (renderMode === 'stars' || renderMode === 'hearts') {
          ctx.font = `${Math.max(6,size*1.15)}px serif`; ctx.fillText(renderMode === 'stars' ? '✦' : '♥',cx,cy);
        } else if (renderMode === 'hexagons' || renderMode === 'triangles') {
          ctx.beginPath();
          if (renderMode === 'triangles') { ctx.moveTo(cx,cy-size/2); ctx.lineTo(cx+size/2,cy+size/2); ctx.lineTo(cx-size/2,cy+size/2); }
          else for(let k=0;k<6;k++){const a=k*Math.PI/3;const px=cx+Math.cos(a)*size/2,py=cy+Math.sin(a)*size/2;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}
          ctx.closePath(); ctx.fill();
        } else if (renderMode === 'halfblocks') {
          ctx.fillRect(cx-size/2,cy-size/2,size,size*lum);
        } else if (renderMode === 'lines' || renderMode === 'diagonal' || renderMode === 'hatch') {
          ctx.lineWidth = Math.max(1,size/8); ctx.beginPath(); ctx.moveTo(cx-size/2,cy); ctx.lineTo(cx+size/2,cy); if(renderMode !== 'lines'){ctx.moveTo(cx-size/2,cy-size/2);ctx.lineTo(cx+size/2,cy+size/2);} ctx.strokeStyle=ctx.fillStyle;ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(cx,cy,Math.max(1,size*.38),0,Math.PI*2); ctx.fill();
        }
      }

      const bloom = pfx.bloom?.enabled ? pfx.bloom.intensity / 100 : 0;
      if (bloom) { ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=bloom*.25; ctx.filter=`blur(${2+bloom*7}px)`; ctx.drawImage(canvas,0,0); ctx.restore(); }
      if (pfx.scanLines?.enabled) { ctx.fillStyle=`rgba(255,255,255,${pfx.scanLines.intensity/100*.08})`; for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1); }
      if (pfx.filmGrain?.enabled) { ctx.fillStyle='rgba(255,255,255,.2)'; const n=Math.floor(w*h*.01*pfx.filmGrain.intensity/100); for(let i=0;i<n;i++)ctx.fillRect(Math.random()*w,Math.random()*h,1,1); }
      if (pfx.vignette?.enabled) { const v=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.15,w/2,h/2,Math.max(w,h)*.75); v.addColorStop(0,'transparent'); v.addColorStop(1,`rgba(0,0,0,${pfx.vignette.intensity/100})`); ctx.fillStyle=v;ctx.fillRect(0,0,w,h); }
      if (pfx.halftone?.enabled) { ctx.fillStyle=`rgba(0,0,0,${pfx.halftone.intensity/100*.15})`; for(let y=0;y<h;y+=6)for(let x=0;x<w;x+=6)ctx.fillRect(x,y,1,1); }
      if (pfx.glitch?.enabled && Math.random() < .04 * pfx.glitch.intensity/20) { const sh=Math.max(1,Math.floor(h*.025)), y=Math.floor(Math.random()*(h-sh)); const copy=ctx.getImageData(0,y,w,sh); ctx.putImageData(copy,(Math.random()-.5)*30*pfx.glitch.intensity/100,y); }
      if (pfx.chromatic?.enabled) { ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=pfx.chromatic.intensity/700;ctx.drawImage(canvas,2,0);ctx.drawImage(canvas,-2,0);ctx.restore(); }
      if (blurType !== 'off') { ctx.save();ctx.globalAlpha=.12;ctx.filter=`blur(${Math.min(8,blurAmount/8)}px)`;ctx.drawImage(canvas,0,0);ctx.restore(); }
      if (animated) rafRef.current=requestAnimationFrame(draw);
    };

    const loaded=()=>{resize();draw(0);};
    img.addEventListener('load',loaded);
    const ro=new ResizeObserver(resize);ro.observe(canvas.parentElement);
    resize();draw(0);
    return()=>{stopped=true;cancelAnimationFrame(rafRef.current);img.removeEventListener('load',loaded);ro.disconnect();};
  }, [sourceSrc,renderMode,bgMode,bgBlur,bgOpacity,cellSize,coverage,invert,brightness,contrast,edgeEmphasis,density,tint,tintOpacity,saturation,grayscale,blurType,blurAmount,pfx,animated,animStyle,animSpeed,animIntensity]);

  return <div className={`electric-gaze ${className}`} style={style}><canvas ref={canvasRef} aria-hidden="true" /></div>;
}
