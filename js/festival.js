/*
 * Loy Krathong festival theme  (js/festival.js)
 *  1) Night scene background drawn as ASCII art + twinkling stars + floating embers (every page that loads this file)
 *  2) Hanging garland and lanterns that swing when the mouse touches them (profile.html only)
 *  3) Temple-fair fireworks when the quiz result appears (quiz.html only)
 *  4) Small krathongs drifting along the bottom of the page [ADDED]
 * Self-contained: it does not touch app.js. Remove the <script> and <link> tags to turn it all off.
 */
(function () {
    "use strict";

    var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function makeRng(seed) {            /* small seeded random so the scene looks the same after resize */
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function pick(str, r) { return str.charAt(Math.floor(r * str.length) % str.length); }

    /* =====================================================================
     * 1) NIGHT BACKGROUND
     * ===================================================================== */
    var Night = (function () {
        var bg, bgCtx, fx, fxCtx, W, H, L;
        var stars = [], embers = [], glowSprite = null;
        var lastFrame = 0, resizeTimer = 0, started = false;

        function layout(w, h) {
            var m = Math.min(w, h);
            return {
                horizon: h * 0.60,
                moon: { x: w * 0.80, y: h * 0.20, r: clamp(m * 0.075, 26, 80) },
                krathong: { x: w * 0.5, y: h * 0.80, rx: clamp(w * 0.08, 46, 150) }
            };
        }

        function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

        /* paints the whole scene as colours; each pixel of the small canvas later becomes one character */
        function drawScene(g, w, h, rnd) {
            var y0 = L.horizon, grad, i, k;

            grad = g.createLinearGradient(0, 0, 0, y0);
            grad.addColorStop(0, "#02020a");
            grad.addColorStop(0.65, "#0b0714");
            grad.addColorStop(1, "#3a1b08");
            g.fillStyle = grad;
            g.fillRect(0, 0, w, y0 + 2);

            /* moon */
            var mo = L.moon;
            grad = g.createRadialGradient(mo.x, mo.y, mo.r * 0.9, mo.x, mo.y, mo.r * 2.4);
            grad.addColorStop(0, "rgba(255,240,200,0.20)");
            grad.addColorStop(1, "rgba(255,240,200,0)");
            g.fillStyle = grad;
            circle(g, mo.x, mo.y, mo.r * 2.4);
            grad = g.createRadialGradient(mo.x - mo.r * 0.3, mo.y - mo.r * 0.3, mo.r * 0.1, mo.x, mo.y, mo.r);
            grad.addColorStop(0, "#ffffff");
            grad.addColorStop(1, "#f0d49c");
            g.fillStyle = grad;
            circle(g, mo.x, mo.y, mo.r);
            g.fillStyle = "rgba(190,150,90,0.35)";
            circle(g, mo.x - mo.r * 0.35, mo.y + mo.r * 0.1, mo.r * 0.22);
            circle(g, mo.x + mo.r * 0.3, mo.y - mo.r * 0.25, mo.r * 0.15);
            circle(g, mo.x + mo.r * 0.15, mo.y + mo.r * 0.45, mo.r * 0.18);

            /* warm light behind the temple */
            var cx = w * 0.5, th = clamp(h * 0.30, 110, 330);
            grad = g.createRadialGradient(cx, y0 - th * 0.35, 10, cx, y0 - th * 0.35, th * 1.4);
            grad.addColorStop(0, "rgba(255,150,50,0.38)");
            grad.addColorStop(1, "rgba(255,150,50,0)");
            g.fillStyle = grad;
            circle(g, cx, y0 - th * 0.35, th * 1.4);

            /* side domes with lit windows */
            function dome(x, rx, ry) {
                g.save();
                g.beginPath();
                g.ellipse(x, y0 + 4, rx, ry, 0, Math.PI, 0);
                g.closePath();
                g.fillStyle = "#33190b";
                g.fill();
                g.clip();
                g.fillStyle = "#ff9a3c";
                for (var yy = y0 - ry * 0.7; yy < y0 - 8; yy += 15) {
                    for (var xx = x - rx; xx < x + rx; xx += 28) { g.fillRect(xx, yy, 7, 9); }
                }
                g.restore();
            }
            dome(w * 0.10, clamp(w * 0.16, 90, 330), clamp(h * 0.16, 70, 190));
            dome(w * 0.92, clamp(w * 0.13, 80, 280), clamp(h * 0.14, 60, 170));

            /* pagodas */
            function pagoda(x, baseW, hgt) {
                var tiers = 5, ty = y0, tierH = hgt / tiers, t, bw;
                for (t = 0; t < tiers; t++) {
                    bw = baseW * (1 - t * 0.17);
                    g.fillStyle = "#2c150a";
                    g.beginPath();
                    g.moveTo(x - bw / 2, ty);
                    g.lineTo(x - bw * 0.30, ty - tierH * 0.72);
                    g.lineTo(x + bw * 0.30, ty - tierH * 0.72);
                    g.lineTo(x + bw / 2, ty);
                    g.closePath();
                    g.fill();
                    g.strokeStyle = "rgba(255,175,85,0.85)";
                    g.lineWidth = 1.6;
                    g.beginPath();
                    g.moveTo(x - bw / 2, ty);
                    g.lineTo(x - bw * 0.30, ty - tierH * 0.72);
                    g.lineTo(x + bw * 0.30, ty - tierH * 0.72);
                    g.lineTo(x + bw / 2, ty);
                    g.stroke();
                    g.fillStyle = "#2a1409";
                    g.fillRect(x - bw * 0.22, ty - tierH, bw * 0.44, tierH * 0.3);
                    ty -= tierH;
                }
                g.fillStyle = "#e9a24d";
                g.fillRect(x - 1.5, ty - hgt * 0.28, 3, hgt * 0.28);
            }
            pagoda(cx, clamp(w * 0.12, 80, 230), th);
            pagoda(w * 0.36, clamp(w * 0.07, 50, 130), th * 0.62);
            pagoda(w * 0.64, clamp(w * 0.07, 50, 130), th * 0.62);

            /* water */
            grad = g.createLinearGradient(0, y0, 0, h);
            grad.addColorStop(0, "#08141a");
            grad.addColorStop(1, "#010204");
            g.fillStyle = grad;
            g.fillRect(0, y0, w, h - y0);
            g.fillStyle = "rgba(130,170,180,0.10)";
            for (i = 0; i < w * (h - y0) / 2600; i++) {
                g.fillRect(rnd() * w, y0 + rnd() * (h - y0), 20 + rnd() * 60, 1.5);
            }

            /* shimmering reflection under the temple and krathong */
            var kr = L.krathong;
            var steps = 46;
            for (i = 0; i < steps; i++) {
                var f = i / steps;
                g.fillStyle = "rgba(255,185,90," + (0.38 * (1 - f)).toFixed(3) + ")";
                var rw = clamp(w * 0.07, 50, 140) * (0.45 + rnd() * 0.75) * (1 - f * 0.5);
                g.fillRect(cx + (rnd() - 0.5) * rw * 0.7 - rw / 2, y0 + 6 + f * (h - y0) * 0.9, rw, 2.5);
            }

            /* krathong: glow, leaf base, lotus petals, flame */
            g.globalCompositeOperation = "lighter";
            grad = g.createRadialGradient(kr.x, kr.y, 0, kr.x, kr.y, kr.rx * 3);
            grad.addColorStop(0, "rgba(255,200,90,0.80)");
            grad.addColorStop(0.4, "rgba(255,140,40,0.30)");
            grad.addColorStop(1, "rgba(255,120,30,0)");
            g.fillStyle = grad;
            circle(g, kr.x, kr.y, kr.rx * 3);
            g.globalCompositeOperation = "source-over";

            g.fillStyle = "#3b4514";
            g.beginPath();
            g.ellipse(kr.x, kr.y + kr.rx * 0.14, kr.rx, kr.rx * 0.30, 0, 0, Math.PI * 2);
            g.fill();
            for (k = -3; k <= 3; k++) {
                var ang = k * 0.40;
                g.save();
                g.translate(kr.x + Math.sin(ang) * kr.rx * 0.72, kr.y - Math.cos(ang) * kr.rx * 0.10);
                g.rotate(ang);
                g.fillStyle = k % 2 === 0 ? "#ffd877" : "#fff2c2";
                g.beginPath();
                g.ellipse(0, -kr.rx * 0.22, kr.rx * 0.15, kr.rx * 0.34, 0, 0, Math.PI * 2);
                g.fill();
                g.restore();
            }
            grad = g.createRadialGradient(kr.x, kr.y - kr.rx * 0.38, 0, kr.x, kr.y - kr.rx * 0.38, kr.rx * 0.38);
            grad.addColorStop(0, "#ffffff");
            grad.addColorStop(0.5, "rgba(255,230,140,0.95)");
            grad.addColorStop(1, "rgba(255,160,40,0)");
            g.fillStyle = grad;
            circle(g, kr.x, kr.y - kr.rx * 0.38, kr.rx * 0.38);
        }

        var HI = "@&Q0#%8", MID = "*+=1I|tL", LOW = ".:-,'`;";

        function renderAscii() {
            var fontPx = W < 700 ? 10 : 12;
            var cw = fontPx * 0.6, ch = fontPx;
            var cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
            var sc = document.createElement("canvas");
            sc.width = cols; sc.height = rows;
            var g = sc.getContext("2d", { willReadFrequently: true });
            g.setTransform(1 / cw, 0, 0, 1 / ch, 0, 0);
            drawScene(g, W, H, makeRng(11));
            var data = g.getImageData(0, 0, cols, rows).data;

            bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            bgCtx.fillStyle = "#02030a";
            bgCtx.fillRect(0, 0, W, H);
            bgCtx.font = fontPx + 'px "Courier New", Menlo, Consolas, monospace';
            bgCtx.textBaseline = "top";

            var r2 = makeRng(5), x, y, i, lum, ch2, k;
            for (y = 0; y < rows; y++) {
                for (x = 0; x < cols; x++) {
                    i = (y * cols + x) * 4;
                    lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
                    var rr = r2();
                    if (lum < 0.04) {
                        if (y * ch > L.horizon && rr < 0.10) {
                            bgCtx.fillStyle = "rgba(70,115,115,0.22)";
                            bgCtx.fillText(rr < 0.05 ? "." : ",", x * cw, y * ch);
                        }
                        continue;
                    }
                    ch2 = lum > 0.55 ? pick(HI, rr) : lum > 0.22 ? pick(MID, rr) : pick(LOW, rr);
                    k = clamp(0.55 + lum * 1.4, 0.6, 1.4);
                    bgCtx.fillStyle = "rgb(" + Math.min(255, data[i] * k | 0) + "," +
                        Math.min(255, data[i + 1] * k | 0) + "," + Math.min(255, data[i + 2] * k | 0) + ")";
                    bgCtx.fillText(ch2, x * cw, y * ch);
                }
            }
        }

        function buildActors() {
            var r = makeRng(7), i, n = clamp(Math.round(W * H / 9500), 50, 240);
            stars = [];
            for (i = 0; i < n; i++) {
                stars.push({
                    x: r() * W, y: r() * L.horizon * 0.95,
                    ch: pick("+..*'.+", r()), a: 0.35 + r() * 0.6,
                    ph: r() * 6.28, sp: 0.6 + r() * 2.2
                });
            }
            embers = [];
            var m = clamp(Math.round(W / 38), 14, 46);
            for (i = 0; i < m; i++) { embers.push(newEmber(r, true)); }

            glowSprite = document.createElement("canvas");
            glowSprite.width = glowSprite.height = 32;
            var g = glowSprite.getContext("2d");
            var grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, "rgba(255,235,170,1)");
            grad.addColorStop(0.35, "rgba(255,170,60,0.55)");
            grad.addColorStop(1, "rgba(255,140,30,0)");
            g.fillStyle = grad;
            g.fillRect(0, 0, 32, 32);
        }

        function newEmber(r, anywhere) {
            return {
                x: r() * W, y: anywhere ? L.horizon * 0.7 + r() * (H - L.horizon * 0.7) : H + 10,
                vy: 9 + r() * 26, sway: 8 + r() * 22, fr: 0.4 + r() * 1.2,
                ph: r() * 6.28, size: 6 + r() * 12, a: 0.4 + r() * 0.6
            };
        }

        function drawFx(t, dt) {
            fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            fxCtx.clearRect(0, 0, W, H);
            fxCtx.font = (W < 700 ? 10 : 12) + 'px "Courier New", Menlo, Consolas, monospace';
            fxCtx.textBaseline = "middle";
            fxCtx.textAlign = "center";
            var i, s, e, a;
            for (i = 0; i < stars.length; i++) {
                s = stars[i];
                a = s.a * (0.45 + 0.55 * Math.sin(t * s.sp + s.ph));
                if (a < 0.05) { continue; }
                fxCtx.fillStyle = "rgba(255,246,225," + a.toFixed(3) + ")";
                fxCtx.fillText(s.ch, s.x, s.y);
            }
            fxCtx.globalCompositeOperation = "lighter";
            var kr = L.krathong, mo = L.moon;
            a = 0.14 + 0.08 * Math.sin(t * 7) * Math.sin(t * 2.3);
            var grad = fxCtx.createRadialGradient(kr.x, kr.y - kr.rx * 0.3, 0, kr.x, kr.y - kr.rx * 0.3, kr.rx * 2.4);
            grad.addColorStop(0, "rgba(255,190,80," + a.toFixed(3) + ")");
            grad.addColorStop(1, "rgba(255,150,40,0)");
            fxCtx.fillStyle = grad;
            fxCtx.fillRect(kr.x - kr.rx * 2.4, kr.y - kr.rx * 2.7, kr.rx * 4.8, kr.rx * 4.8);
            a = 0.06 + 0.04 * Math.sin(t * 0.8);
            grad = fxCtx.createRadialGradient(mo.x, mo.y, 0, mo.x, mo.y, mo.r * 2.6);
            grad.addColorStop(0, "rgba(255,240,200," + a.toFixed(3) + ")");
            grad.addColorStop(1, "rgba(255,240,200,0)");
            fxCtx.fillStyle = grad;
            fxCtx.fillRect(mo.x - mo.r * 2.6, mo.y - mo.r * 2.6, mo.r * 5.2, mo.r * 5.2);

            var r = Math.random;
            for (i = 0; i < embers.length; i++) {
                e = embers[i];
                e.y -= e.vy * dt;
                if (e.y < -20) { embers[i] = e = newEmber(r, false); }
                var x = e.x + Math.sin(t * e.fr + e.ph) * e.sway;
                fxCtx.globalAlpha = e.a * (0.55 + 0.45 * Math.sin(t * 3 + e.ph));
                fxCtx.drawImage(glowSprite, x - e.size / 2, e.y - e.size / 2, e.size, e.size);
            }
            fxCtx.globalAlpha = 1;
            fxCtx.globalCompositeOperation = "source-over";
        }

        function loop(ts) {
            requestAnimationFrame(loop);
            if (ts - lastFrame < 33) { return; }
            var dt = lastFrame ? Math.min((ts - lastFrame) / 1000, 0.1) : 0.033;
            lastFrame = ts;
            drawFx(ts / 1000, dt);
        }

        function build() {
            W = document.documentElement.clientWidth;
            H = window.innerHeight;
            L = layout(W, H);
            [bg, fx].forEach(function (c) {
                c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
            });
            renderAscii();
            buildActors();
            if (reduceMotion) { drawFx(2, 0); }
        }

        function start() {
            if (started) { return; }
            started = true;
            bg = document.createElement("canvas"); bg.className = "festival-bg";
            fx = document.createElement("canvas"); fx.className = "festival-fx";
            bg.setAttribute("aria-hidden", "true"); fx.setAttribute("aria-hidden", "true");
            document.body.insertBefore(fx, document.body.firstChild);
            document.body.insertBefore(bg, document.body.firstChild);
            bgCtx = bg.getContext("2d"); fxCtx = fx.getContext("2d");
            build();
            if (!reduceMotion) { requestAnimationFrame(loop); }
            window.addEventListener("resize", function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(build, 200);
            });
        }
        return { start: start };
    })();

    /* =====================================================================
     * 2) HANGING DECORATIONS (rope physics, pushed by the mouse)
     * ===================================================================== */
    var Hanging = (function () {
        var cv, ctx, W, CH = 640, chains = [], garland = null, resizeTimer = 0;
        var mouse = { x: -999, y: -999, vx: 0, vy: 0 };
        var acc = 0, lastT = 0, started = false;
        var PALETTES = [
            ["#fff1a8", "#ff9f1c", "#c1121f"],
            ["#fff6c9", "#ffc233", "#e85d04"],
            ["#ffe3ec", "#ff6f9c", "#b5179e"],
            ["#e8ffd8", "#ffd166", "#d65108"]
        ];
        var FLAGS = ["#ff4d6d", "#ffb703", "#fb8500", "#ff8fab", "#ffd166", "#e63946", "#f9844a"];

        function Pt(x, y) { this.x = x; this.y = y; this.px = x; this.py = y; this.pin = false; }

        function makeChain(pts, rest) { return { pts: pts, rest: rest }; }

        function build() {
            W = document.documentElement.clientWidth;
            var nav = document.querySelector(".navbar-inner") || document.querySelector("nav");
            var navBottom = nav ? nav.getBoundingClientRect().bottom + window.scrollY : 70;
            var anchorY = navBottom + 2;
            chains = [];

            /* garland of flags across the top */
            var n = clamp(Math.round(W / 58), 10, 38);
            var ax = 8, bx = W - 8, span = bx - ax, pts = [], i, t;
            var sag = clamp(span * 0.04, 30, 64);
            for (i = 0; i < n; i++) {
                t = i / (n - 1);
                pts.push(new Pt(ax + span * t, anchorY + sag * 4 * t * (1 - t)));
            }
            pts[0].pin = true; pts[n - 1].pin = true;
            garland = makeChain(pts, (span + 8 * sag * sag / (3 * span)) / (n - 1));
            garland.isGarland = true;
            chains.push(garland);

            /* long hanging lanterns in the free space beside the content */
            var main = document.querySelector("main");
            var margin = main ? main.getBoundingClientRect().left : 0;
            var defs = [];
            if (margin >= 170) {
                defs = [
                    { x: margin * 0.28, len: 270, size: 1.0 }, { x: margin * 0.70, len: 190, size: 0.9 },
                    { x: W - margin * 0.28, len: 300, size: 1.0 }, { x: W - margin * 0.70, len: 210, size: 0.9 }
                ];
            } else if (margin >= 60) {
                defs = [{ x: margin / 2, len: 200, size: 0.75 }, { x: W - margin / 2, len: 230, size: 0.75 }];
            }
            defs.forEach(function (d, idx) {
                var segs = Math.round(d.len / 12), p = [], j;
                for (j = 0; j <= segs; j++) { p.push(new Pt(d.x, anchorY + 40 + j * 12)); }
                p[0].pin = true;
                var c = makeChain(p, 12);
                c.lantern = { size: d.size, pal: PALETTES[idx % PALETTES.length], ph: idx * 1.7 };
                chains.push(c);
            });

            cv.width = Math.round(W * dpr); cv.height = Math.round(CH * dpr);
            cv.style.width = W + "px"; cv.style.height = CH + "px";
            if (reduceMotion) {
                for (i = 0; i < 240; i++) { simulate(); }
                draw(0);
            }
        }

        function simulate() {
            var R = 95, c, i, p, k, a, b, dx, dy, d, diff, f, sp;
            for (c = 0; c < chains.length; c++) {
                var pts = chains[c].pts, last = pts.length - 1;
                for (i = 0; i < pts.length; i++) {
                    p = pts[i];
                    if (p.pin) { continue; }
                    var vx = (p.x - p.px) * 0.98, vy = (p.y - p.py) * 0.98;
                    p.px = p.x; p.py = p.y;
                    p.x += vx;
                    p.y += vy + (chains[c].lantern && i === last ? 0.75 : 0.42);
                    dx = p.x - mouse.x; dy = p.y - mouse.y;
                    d = Math.sqrt(dx * dx + dy * dy);
                    if (d < R) {
                        f = 1 - d / R; f *= f;
                        sp = Math.min(Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy), 40);
                        d = d || 1;
                        p.x += dx / d * f * (1.6 + sp * 0.12) + mouse.vx * f * 0.18;
                        p.y += dy / d * f * (1.6 + sp * 0.12) + mouse.vy * f * 0.18;
                    }
                }
                for (k = 0; k < 6; k++) {
                    for (i = 0; i < last; i++) {
                        a = pts[i]; b = pts[i + 1];
                        dx = b.x - a.x; dy = b.y - a.y;
                        d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                        diff = (d - chains[c].rest) / d;
                        if (a.pin && b.pin) { continue; }
                        if (a.pin) { b.x -= dx * diff; b.y -= dy * diff; }
                        else if (b.pin) { a.x += dx * diff; a.y += dy * diff; }
                        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
                    }
                }
            }
            mouse.vx *= 0.8; mouse.vy *= 0.8;
        }

        function drawRope(pts, width, color) {
            ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var i = 1; i < pts.length - 1; i++) {
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
        }

        function drawGarland(c) {
            var pts = c.pts, i, a, b, tx, ty, len, nx, ny, mx, my, size;
            drawRope(pts, 2, "rgba(255,214,150,0.9)");
            for (i = 0; i < pts.length - 1; i++) {
                a = pts[i]; b = pts[i + 1];
                tx = b.x - a.x; ty = b.y - a.y; len = Math.sqrt(tx * tx + ty * ty) || 1;
                nx = -ty / len; ny = tx / len;
                if (ny < 0) { nx = -nx; ny = -ny; }
                size = len * 0.72;
                mx = (a.x + b.x) / 2 + nx * size * 0.85; my = (a.y + b.y) / 2 + ny * size * 0.85;
                ctx.fillStyle = FLAGS[i % FLAGS.length];
                ctx.beginPath();
                ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(mx, my); ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.stroke();
            }
            ctx.fillStyle = "rgba(255,230,160,0.95)";
            for (i = 0; i < pts.length; i++) {
                ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 2.4, 0, 6.2832); ctx.fill();
            }
        }

        function drawLantern(c, t) {
            var pts = c.pts, n = pts.length, p = pts[n - 1], q = pts[n - 2], L0 = c.lantern;
            drawRope(pts, 1.6, "rgba(255,226,170,0.85)");
            var rot = Math.atan2(-(p.x - q.x), p.y - q.y);
            var s = L0.size, w = 40 * s, h = 54 * s, pal = L0.pal;
            var flick = 0.85 + 0.15 * Math.sin(t * 6 + L0.ph) * Math.sin(t * 2.1 + L0.ph);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(rot);
            ctx.globalCompositeOperation = "lighter";
            var gl = ctx.createRadialGradient(0, 8 * s + h / 2, 0, 0, 8 * s + h / 2, h * 1.15);
            gl.addColorStop(0, "rgba(255,190,90," + (0.5 * flick).toFixed(3) + ")");
            gl.addColorStop(1, "rgba(255,150,40,0)");
            ctx.fillStyle = gl;
            ctx.fillRect(-h * 1.15, 8 * s + h / 2 - h * 1.15, h * 2.3, h * 2.3);
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "#7a1f0c";                       /* top cap */
            ctx.fillRect(-w * 0.22, 0, w * 0.44, 8 * s);
            var body = ctx.createRadialGradient(0, 8 * s + h * 0.5, 2, 0, 8 * s + h * 0.5, w * 0.62);
            body.addColorStop(0, pal[0]); body.addColorStop(0.55, pal[1]); body.addColorStop(1, pal[2]);
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.ellipse(0, 8 * s + h / 2, w / 2, h / 2, 0, 0, 6.2832);
            ctx.fill();
            ctx.strokeStyle = "rgba(120,30,10,0.45)"; ctx.lineWidth = 1.2 * s;
            [-0.55, 0, 0.55].forEach(function (k) {
                ctx.beginPath();
                ctx.ellipse(0, 8 * s + h / 2, Math.abs(k) * w / 2 + 0.01, h / 2, 0, -Math.PI / 2, Math.PI / 2);
                ctx.stroke();
            });
            ctx.fillStyle = "#7a1f0c";                       /* bottom cap + tassel */
            ctx.fillRect(-w * 0.2, 8 * s + h - 2, w * 0.4, 6 * s);
            ctx.strokeStyle = pal[1]; ctx.lineWidth = 1.6 * s;
            var ty0 = 8 * s + h + 4 * s, k;
            for (k = -2; k <= 2; k++) {
                ctx.beginPath(); ctx.moveTo(k * 2 * s, ty0); ctx.lineTo(k * 3.2 * s, ty0 + 16 * s); ctx.stroke();
            }
            ctx.restore();
        }

        function draw(t) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, CH);
            for (var i = 0; i < chains.length; i++) {
                if (chains[i].isGarland) { drawGarland(chains[i]); } else { drawLantern(chains[i], t); }
            }
        }

        function loop(ts) {
            requestAnimationFrame(loop);
            var dt = lastT ? Math.min(ts - lastT, 50) : 16;
            lastT = ts;
            acc += dt;
            var guard = 0;
            while (acc >= 16.67 && guard < 4) { simulate(); acc -= 16.67; guard++; }
            if (guard === 4) { acc = 0; }
            draw(ts / 1000);
        }

        function start() {
            if (started) { return; }
            started = true;
            cv = document.createElement("canvas");
            cv.className = "festival-hanging";
            cv.setAttribute("aria-hidden", "true");
            document.body.appendChild(cv);
            ctx = cv.getContext("2d");
            build();
            window.addEventListener("resize", function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(build, 200);
            });
            window.addEventListener("load", function () { setTimeout(build, 250); });
            if (!reduceMotion) {
                window.addEventListener("pointermove", function (e) {
                    mouse.vx = e.pageX - (mouse.x < -900 ? e.pageX : mouse.x);
                    mouse.vy = e.pageY - (mouse.y < -900 ? e.pageY : mouse.y);
                    mouse.x = e.pageX; mouse.y = e.pageY;
                }, { passive: true });
                window.addEventListener("pointerleave", function () { mouse.x = mouse.y = -999; });
                requestAnimationFrame(loop);
            }
        }
        return { start: start };
    })();

    /* =====================================================================
     * 3) TEMPLE-FAIR FIREWORKS (quiz result)
     * ===================================================================== */
    var Fireworks = (function () {
        var cv, ctx, W, H, rockets = [], bursts = [], running = false, lastT = 0;
        var COLORS = ["#4f9dff", "#ffd23f", "#ff4d4d", "#ff8c42", "#ffffff", "#ff7ab6", "#6be0b0"];

        function ensure() {
            if (cv) { return; }
            cv = document.createElement("canvas");
            cv.className = "festival-fireworks";
            cv.setAttribute("aria-hidden", "true");
            document.body.appendChild(cv);
            ctx = cv.getContext("2d");
            resize();
            window.addEventListener("resize", resize);
        }
        function resize() {
            W = window.innerWidth; H = window.innerHeight;
            cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
            cv.style.width = W + "px"; cv.style.height = H + "px";
        }

        function burst(x, y) {
            var n = 22 + Math.floor(Math.random() * 12), i, base = Math.random() * 6.28;
            var c1 = COLORS[Math.floor(Math.random() * COLORS.length)];
            var c2 = COLORS[Math.floor(Math.random() * COLORS.length)];
            var scale = clamp(Math.min(W, H) / 700, 0.7, 1.4);
            for (i = 0; i < n; i++) {
                bursts.push({
                    x: x, y: y, a: base + i * 6.2832 / n + (Math.random() - 0.5) * 0.18,
                    R: (90 + Math.random() * 90) * scale, age: 0, life: 1.1 + Math.random() * 0.5,
                    color: i % 3 === 0 ? c2 : c1, w: 3 + Math.random() * 2
                });
            }
            bursts.push({ flash: true, x: x, y: y, age: 0, life: 0.25, R: 40 * scale });
        }

        function launch(n) {
            if (reduceMotion) { return; }
            ensure();
            for (var i = 0; i < n; i++) {
                (function (delay) {
                    setTimeout(function () {
                        var tx = W * (0.1 + Math.random() * 0.8);
                        rockets.push({ x: tx + (Math.random() - 0.5) * 60, y: H + 10, tx: tx, ty: H * (0.12 + Math.random() * 0.4) });
                        if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); }
                    }, delay);
                })(i * 380 + Math.random() * 200);
            }
        }

        function loop(ts) {
            var dt = lastT ? Math.min((ts - lastT) / 1000, 0.05) : 0.016;
            lastT = ts;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            ctx.lineCap = "round";
            var i, r, b, t, e, d;
            for (i = rockets.length - 1; i >= 0; i--) {
                r = rockets[i];
                r.y -= 780 * dt;
                r.x += (r.tx - r.x) * Math.min(1, dt * 4);
                ctx.strokeStyle = "rgba(255,230,170,0.9)"; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(r.x, r.y + 22); ctx.lineTo(r.x, r.y); ctx.stroke();
                if (r.y <= r.ty) { burst(r.x, r.y); rockets.splice(i, 1); }
            }
            for (i = bursts.length - 1; i >= 0; i--) {
                b = bursts[i];
                b.age += dt;
                t = b.age / b.life;
                if (t >= 1) { bursts.splice(i, 1); continue; }
                if (b.flash) {
                    ctx.fillStyle = "rgba(255,255,255," + (0.8 * (1 - t)).toFixed(3) + ")";
                    ctx.beginPath(); ctx.arc(b.x, b.y, b.R * (0.4 + t), 0, 6.2832); ctx.fill();
                    continue;
                }
                e = 1 - Math.pow(1 - t, 2.2);
                d = b.R * e;
                var droop = 46 * t * t;
                ctx.globalAlpha = 1 - t * t;
                ctx.strokeStyle = b.color; ctx.lineWidth = b.w * (1 - t * 0.5);
                ctx.beginPath();
                ctx.moveTo(b.x + Math.cos(b.a) * d * 0.58, b.y + Math.sin(b.a) * d * 0.58 + droop * 0.6);
                ctx.lineTo(b.x + Math.cos(b.a) * d, b.y + Math.sin(b.a) * d + droop);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            if (rockets.length || bursts.length) { requestAnimationFrame(loop); }
            else { running = false; ctx.clearRect(0, 0, W, H); }
        }

        function watch() {
            var result = document.getElementById("result");
            if (!result) { return; }
            var wasActive = result.classList.contains("active");
            new MutationObserver(function () {
                var now = result.classList.contains("active");
                if (now && !wasActive) { setTimeout(function () { launch(6); }, 350); }
                wasActive = now;
            }).observe(result, { attributes: true, attributeFilter: ["class"] });
            var emoji = document.getElementById("resultEmoji");
            if (emoji) { emoji.style.cursor = "pointer"; emoji.title = "Click for fireworks"; emoji.addEventListener("click", function () { launch(4); }); }
        }
        return { watch: watch, launch: launch };
    })();

    /* =====================================================================
     * 4) FLOATING KRATHONGS  [ADDED - new module, independent of 1-3]
     *    3-5 small krathongs drift slowly along the bottom of the page.
     *    Drawn with canvas only. Sits behind the cards (z-index -1).
     * ===================================================================== */
    var Krathongs = (function () {
        var KR_Z_INDEX = "-1";   /* [ADDED] use "1" if you want them to float OVER the cards */
        var cv, ctx, W, CH, items = [], started = false, lastT = 0, resizeTimer = 0;
        var DEPTHS = [0.5, 0.1, 0.9, 0.3, 0.7];   /* 0 = far/small/dim, 1 = near/big/bright */

        function build() {
            W = window.innerWidth;
            CH = Math.round(clamp(window.innerHeight * 0.22, 120, 220));
            cv.width = Math.round(W * dpr); cv.height = Math.round(CH * dpr);
            cv.style.width = W + "px"; cv.style.height = CH + "px";
            var n = W < 600 ? 3 : (W < 1000 ? 4 : 5);
            var rnd = makeRng(2569), i, d;
            items = [];
            for (i = 0; i < n; i++) {
                d = DEPTHS[i];
                items.push({
                    depth: d,
                    x: (i + rnd() * 0.7) * (W / n),
                    y: CH * (0.30 + 0.48 * d),
                    s: 0.65 + 0.45 * d,               /* size */
                    speed: 7 + 9 * d,                 /* px per second, drifting to the right */
                    phase: rnd() * 6.28,
                    freq: 0.6 + rnd() * 0.5,
                    bob: 1.5 + 2.5 * d
                });
            }
            items.sort(function (a, b) { return a.y - b.y; });   /* far ones are drawn first */
            draw(lastT / 1000);
        }

        function drawOne(k, t) {
            var bob = Math.sin(t * k.freq + k.phase) * k.bob;
            var tilt = Math.sin(t * k.freq * 0.8 + k.phase + 1) * 0.035;
            var R = 30 * k.s, x = k.x, y = k.y + bob, i, a;
            var flick = reduceMotion ? 1 : 0.88 + 0.12 * Math.sin(t * 9 + k.phase * 3) + 0.05 * Math.sin(t * 23 + k.phase);

            ctx.save();
            ctx.globalAlpha = 0.55 + 0.45 * k.depth;

            /* shimmering reflection on the water */
            for (i = 0; i < 5; i++) {
                a = (0.26 * (1 - i / 5) * flick).toFixed(3);
                ctx.fillStyle = "rgba(255,185,90," + a + ")";
                var rw = R * (0.9 - i * 0.12) * (1 + 0.12 * Math.sin(t * 1.3 + i + k.phase));
                ctx.fillRect(x - rw / 2, y + R * 0.38 + i * R * 0.34, rw, 2);
            }

            /* warm candle glow */
            ctx.globalCompositeOperation = "lighter";
            var gy = y - R * 0.55;
            var g = ctx.createRadialGradient(x, gy, 0, x, gy, R * 2.6);
            g.addColorStop(0, "rgba(255,200,90," + (0.55 * flick).toFixed(3) + ")");
            g.addColorStop(0.4, "rgba(255,140,40," + (0.20 * flick).toFixed(3) + ")");
            g.addColorStop(1, "rgba(255,120,30,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, gy, R * 2.6, 0, 6.2832); ctx.fill();
            ctx.globalCompositeOperation = "source-over";

            /* body of the krathong */
            ctx.translate(x, y); ctx.rotate(tilt);
            ctx.fillStyle = "#3b4514";                                   /* banana-leaf base */
            ctx.beginPath(); ctx.ellipse(0, R * 0.14, R, R * 0.30, 0, 0, 6.2832); ctx.fill();
            ctx.fillStyle = "#4f5c1a";
            ctx.beginPath(); ctx.ellipse(0, R * 0.08, R * 0.82, R * 0.20, 0, 0, 6.2832); ctx.fill();
            for (i = -3; i <= 3; i++) {                                  /* lotus petals */
                a = i * 0.40;
                ctx.save();
                ctx.translate(Math.sin(a) * R * 0.72, -Math.cos(a) * R * 0.10);
                ctx.rotate(a);
                ctx.fillStyle = i % 2 === 0 ? "#ff9fba" : "#ffe6ee";
                ctx.beginPath(); ctx.ellipse(0, -R * 0.22, R * 0.15, R * 0.34, 0, 0, 6.2832); ctx.fill();
                ctx.restore();
            }
            ctx.fillStyle = "#fff4d6";                                   /* candle */
            ctx.fillRect(-R * 0.05, -R * 0.60, R * 0.10, R * 0.42);
            ctx.fillStyle = "#ffcf5a";                                   /* flame */
            ctx.beginPath(); ctx.ellipse(0, -R * 0.74, R * 0.075, R * 0.15 * flick, 0, 0, 6.2832); ctx.fill();
            ctx.fillStyle = "#fffbe8";
            ctx.beginPath(); ctx.ellipse(0, -R * 0.71, R * 0.035, R * 0.075 * flick, 0, 0, 6.2832); ctx.fill();
            ctx.restore();
        }

        function draw(t) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, CH);
            for (var i = 0; i < items.length; i++) { drawOne(items[i], t); }
        }

        function loop(ts) {
            requestAnimationFrame(loop);
            var dt = lastT ? Math.min((ts - lastT) / 1000, 0.05) : 0.016;
            lastT = ts;
            for (var i = 0; i < items.length; i++) {
                items[i].x += items[i].speed * dt;
                if (items[i].x > W + 60) { items[i].x = -60; }   /* wrap around */
            }
            draw(ts / 1000);
        }

        function start() {
            if (started) { return; }
            started = true;
            cv = document.createElement("canvas");
            cv.className = "festival-krathongs";
            cv.setAttribute("aria-hidden", "true");
            /* styled here (no festival.css change needed) */
            cv.style.cssText = "position:fixed;left:0;bottom:0;pointer-events:none;z-index:" + KR_Z_INDEX + ";";
            document.body.appendChild(cv);
            ctx = cv.getContext("2d");
            build();
            window.addEventListener("resize", function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(build, 200);
            });
            if (!reduceMotion) { requestAnimationFrame(loop); }   /* reduced motion: one still frame only */
        }
        return { start: start };
    })();

    window.Festival = { fireworks: function (n) { Fireworks.launch(n || 6); } };

    function boot() {
        document.body.classList.add("festival");
        Night.start();
        Krathongs.start();   /* [ADDED] floating krathongs */
        if (document.body.classList.contains("profile-page")) { Hanging.start(); }
        Fireworks.watch();
    }
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", boot); } else { boot(); }
})();