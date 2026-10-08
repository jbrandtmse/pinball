// PLEASURE PALACE — dot-matrix display (DMD) emulation.
// Draws into a low-res offscreen canvas, then upscales with nearest-neighbour
// and overlays an LED lattice for the authentic Williams DMD look.

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.PP_DMD = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CW = 140, CH = 26;            // cell resolution (upscaled 3x on screen)
  var SCALE = 3;

  function create() {
    var off = document.createElement('canvas');
    off.width = CW; off.height = CH;
    var o = off.getContext('2d');
    var queue = [];                  // {text, hold, prio}
    var current = null, currentT = 0;
    var lattice = null;
    var persistent = null;           // band shown instead of idle (hs entry)

    function setPrompt(text) { persistent = text || null; }

    function show(text, hold, prio) {
      queue.push({ text: text, hold: hold || 2.2, prio: prio || 0 });
      // keep queue short; higher-priority messages preempt lower ones
      if (queue.length > 12) queue.splice(0, queue.length - 12);
    }

    function setLatticePattern(ctx) {
      if (lattice) return lattice;
      var lc = document.createElement('canvas');
      lc.width = SCALE; lc.height = SCALE;
      var g = lc.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0.35)';
      // dark gap lines forming LED grid
      g.fillRect(SCALE - 1, 0, 1, SCALE);
      g.fillRect(0, SCALE - 1, SCALE, 1);
      lattice = ctx.createPattern(lc, 'repeat');
      return lattice;
    }

    function tick(dt) {
      if (current) {
        currentT += dt;
        // a fresh high-priority message preempts immediately; otherwise wait out the hold
        if (currentT >= current.hold) current = null;
      }
      if (current && queue.length > 0) {
        // find a message that should preempt (prio 1+ replaces a short/idle display)
        for (var i = 0; i < queue.length; i++) {
          if (queue[i].prio >= 1 && currentT >= Math.min(current.hold, 0.9)) {
            current = queue.splice(i, 1)[0];
            currentT = 0;
            break;
          }
        }
      }
      if (!current && queue.length > 0) {
        current = queue.shift();
        currentT = 0;
      }
    }

    // draw text (possibly scrolling) into the message band
    function drawText(ctx, text, y, size, color, scroll) {
      ctx.font = 'bold ' + size + 'px monospace';
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      if (scroll) {
        var tw = ctx.measureText(text).width;
        var x = CW - (scroll % (tw + CW));
        ctx.fillText(text, x, y);
      } else {
        var w = ctx.measureText(text).width;
        ctx.fillText(text, (CW - w) / 2, y);
      }
    }

    function render(ctx, bx, by, bw, bh, score, ball, mult, tiltWarn, tNow) {
      o.clearRect(0, 0, CW, CH);
      // background
      o.fillStyle = '#100800';
      o.fillRect(0, 0, CW, CH);

      // score line: shrink font until score+tail both fit side by side
      var sc = 'P1 ' + String(Math.floor(score)).padStart(9, '0');
      var tail = 'BALL ' + ball + (mult > 1 ? '  X' + mult : '');
      var fs = 13;
      o.font = 'bold ' + fs + 'px monospace';
      while (fs > 8 &&
             o.measureText(sc).width + o.measureText(tail).width + 6 > CW) {
        fs--;
        o.font = 'bold ' + fs + 'px monospace';
      }
      o.fillStyle = '#ffcf70';
      o.textBaseline = 'top';
      o.fillText(sc, 2, 1);
      var tw = o.measureText(tail).width;
      o.fillText(tail, CW - tw - 2, 1);

      // main band
      if (current) {
        var msg = current.text;
        var isLong = false;
        o.font = 'bold 16px monospace';
        isLong = o.measureText(msg).width > CW;
        if (isLong) {
          // scroll right-to-left, ~45 px/s in cell space
          drawText(o, msg, 8, 16, '#ffd27a', currentT * 45);
        } else {
          drawText(o, msg, 9, 16, '#ffe39a', false);
        }
      } else if (persistent) {
        // standing prompt (high-score entry): shown until cleared
        var pr = persistent;
        o.font = 'bold 16px monospace';
        if (o.measureText(pr).width > CW) {
          drawText(o, pr, 9, 16, '#ffe39a', tNow * 45);
        } else {
          drawText(o, pr, 9, 16, '#ffe39a', false);
        }
      } else {
        // idle cycle
        var cyc = Math.floor(tNow / 4) % 4;
        var idles = ['PLEASURE PALACE', 'PULL TO WIN', 'MLM \\/', 'ASK ME ABOUT MY BUMPERS'];
        drawText(o, idles[cyc], 9, 16, '#ffd27a', false);
      }

      // upscale to screen with glow + lattice
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = 'rgba(255,180,60,0.55)';
      ctx.shadowBlur = 18;
      ctx.drawImage(off, bx, by, bw, bh);
      ctx.shadowBlur = 0;
      ctx.fillStyle = setLatticePattern(ctx);
      ctx.fillRect(bx, by, bw, bh);
      ctx.restore();
    }

    function drainInto(dmd) {}
    return { show: show, tick: tick, render: render, setPrompt: setPrompt, SCALE: SCALE };
  }

  return { create: create };
});
