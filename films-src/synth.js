// Bộ tổng hợp nhạc nhỏ cho score.js của bộ khung (S.program/note/chord/drum/fx/master), dựng bằng Web Audio.
window.FilmSynth = (function () {
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const hz = (p) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(p); if (!m) return 440; let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12; return 440 * Math.pow(2, (n - 69) / 12); };
  const db = (x) => Math.pow(10, (x || 0) / 20);
  function collect(code) {
    const ev = { prog: {}, notes: [], drums: [], fx: [], master: { gain: 0, fadeOut: 0 } };
    const S = {
      tempo() {}, program(ch, kind, o) { ev.prog[ch] = Object.assign({ kind }, o || {}); },
      note(ch, p, o) { ev.notes.push({ ch, f: hz(p), t: o.t, dur: o.dur || 0.5, vel: o.vel || 64 }); },
      chord(ch, ps, o) { ps.forEach((p) => S.note(ch, p, o)); },
      drum(n, o) { ev.drums.push({ n, t: o.t, vel: o.vel || 80 }); },
      fx(n, t, o) { ev.fx.push({ n, t, vel: (o && o.vel) || 90 }); },
      master(o) { Object.assign(ev.master, o || {}); },
    };
    new Function('kit', code)({ score(fn) { fn(S, {}); } });
    return ev;
  }
  async function render(code, dur, sr) {
    sr = sr || 44100;
    const ev = collect(code);
    const ctx = new OfflineAudioContext(2, Math.ceil((dur + 1.5) * sr), sr);
    const master = ctx.createGain(); master.gain.value = db(ev.master.gain); master.connect(ctx.destination);
    if (ev.master.fadeOut) { master.gain.setValueAtTime(db(ev.master.gain), Math.max(0, dur - ev.master.fadeOut)); master.gain.linearRampToValueAtTime(0.0001, dur + 0.3); }
    // hồi âm: xung tiếng ồn tắt dần
    const conv = ctx.createConvolver(), L = Math.floor(sr * 1.8), ir = ctx.createBuffer(2, L, sr);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < L; i++) d[i] = rnd() * Math.pow(1 - i / L, 3); }
    conv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.35; conv.connect(wet); wet.connect(master);
    const noise = ctx.createBuffer(1, sr, sr); { const d = noise.getChannelData(0); for (let i = 0; i < sr; i++) d[i] = rnd(); }
    const bus = {};
    const chBus = (ch) => {
      if (bus[ch]) return bus[ch];
      const p = ev.prog[ch] || { kind: 'ep' }, g = ctx.createGain(); g.gain.value = db(p.gain) * 0.22;
      const pan = ctx.createStereoPanner(); pan.pan.value = p.pan || 0; g.connect(pan); pan.connect(master);
      if (p.rev) { const s = ctx.createGain(); s.gain.value = p.rev; pan.connect(s); s.connect(conv); }
      return (bus[ch] = { g, p });
    };
    const env = (gain, t, a, peak, d, sus, r, end) => {
      gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(peak, t + a);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
      gain.gain.setValueAtTime(Math.max(0.0001, peak * sus), end); gain.gain.exponentialRampToValueAtTime(0.0001, end + r);
    };
    const osc = (type, f, t, stop, out, det) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.connect(out); o.start(t); o.stop(stop); return o; };
    for (const n of ev.notes) {
      if (n.t > dur + 0.5) continue;
      const B = chBus(n.ch), k = B.p.kind, v = n.vel / 127, br = B.p.bright || 1, end = n.t + n.dur;
      const g = ctx.createGain(); g.connect(B.g);
      if (k === 'pad') {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 * br; lp.connect(g);
        osc('sawtooth', n.f, n.t, end + 0.8, lp, -7); osc('sawtooth', n.f, n.t, end + 0.8, lp, 7);
        env(g, n.t, 0.35, v * 0.35, 0.3, 0.8, 0.6, end);
      } else if (k === 'bass') {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500 * br; lp.connect(g);
        osc('triangle', n.f, n.t, end + 0.3, lp); osc('sine', n.f, n.t, end + 0.3, lp);
        env(g, n.t, 0.01, v * 0.9, 0.2, 0.6, 0.12, end);
      } else if (k === 'ep') {
        osc('sine', n.f, n.t, end + 0.6, g); const g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g); osc('sine', n.f * 2, n.t, end + 0.6, g2);
        env(g, n.t, 0.005, v * 0.6, 0.5, 0.35, 0.4, end);
      } else { // vibes, glock
        const hi = k === 'glock'; osc('sine', n.f, n.t, end + 1.2, g); const g2 = ctx.createGain(); g2.gain.value = hi ? 0.35 : 0.15; g2.connect(g); osc('sine', n.f * (hi ? 2.76 : 4), n.t, end + 1.2, g2);
        env(g, n.t, 0.004, v * (hi ? 0.35 : 0.5), hi ? 0.6 : 0.9, 0.05, 0.3, end);
      }
    }
    const dbus = ctx.createGain(); dbus.gain.value = 0.5; dbus.connect(master);
    const hit = (kind, t, vel) => {
      const v = vel / 127, g = ctx.createGain(); g.connect(dbus);
      const nz = (type, f, d, q) => { const s = ctx.createBufferSource(); s.buffer = noise; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; s.connect(fl); fl.connect(g); s.start(t); s.stop(t + d + 0.05); };
      const tone = (f0, f1, d, type) => { const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); o.connect(g); o.start(t); o.stop(t + d + 0.05); };
      const dec = (peak, d) => { g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
      switch (kind) {
        case 'kick': tone(140, 42, 0.3); dec(v * 1.1, 0.35); break;
        case 'snare': nz('bandpass', 1900, 0.18, 0.8); tone(200, 160, 0.1, 'triangle'); dec(v * 0.6, 0.2); break;
        case 'hat': nz('highpass', 7500, 0.05); dec(v * 0.35, 0.05); break;
        case 'sidestick': nz('bandpass', 2600, 0.03, 3); dec(v * 0.6, 0.04); break;
        case 'crash': nz('highpass', 4500, 1.3); dec(v * 0.35, 1.3); break;
        case 'click': case 'tick': nz('highpass', 3000, 0.02); tone(2200, 1800, 0.02); dec(v * 0.5, 0.025); break;
        case 'pop': tone(700, 280, 0.09); dec(v * 0.6, 0.12); break;
        case 'chime': tone(1318, 1318, 1.2); tone(1975, 1975, 1.2); dec(v * 0.3, 1.4); break;
        case 'thud': tone(95, 40, 0.3); dec(v * 0.9, 0.35); break;
        default: tone(800, 600, 0.05); dec(v * 0.3, 0.08);
      }
    };
    ev.drums.forEach((d) => d.t <= dur && hit(d.n, d.t, d.vel));
    ev.fx.forEach((d) => d.t <= dur && hit(d.n, d.t, d.vel));
    return ctx.startRendering();
  }
  // Xuất WAV (dùng khi xuất MP4)
  function wav(buf) {
    const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const d = [...Array(ch)].map((_, c) => buf.getChannelData(c)); let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, d[c][i])); out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return out.buffer;
  }
  return { render, wav };
})();
