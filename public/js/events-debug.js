// Debug overlay: every row of the event store (emt_messages), drawn in the garage's pixel font.
// Toggle with the EVENTS button or key E. Wheel scrolls, click CLEAR to hide what is already there, X to close.
import { drawText, textWidth, FONT_HEIGHT } from './font.js';

const W = 480, H = 270;
const POLL_MS = 2000;
const LINE = FONT_HEIGHT + 2;
const PAD = 6;
const HEADER = 16;
const COLS = Math.floor((W - PAD * 2) / 4); // glyphs are ~4px wide incl. gap
const GREEN = '#7cff5b', DIM = '#2f7a2a', YELLOW = '#ffe14a', CYAN = '#4ff0ff';

const canvas = document.createElement('canvas');
canvas.id = 'events-debug';
canvas.width = W;
canvas.height = H;
canvas.hidden = true;
(document.getElementById('frame') ?? document.body).appendChild(canvas);
const ctx = canvas.getContext('2d');

let events = [];
let error = null;
let scroll = 0;
let clearedAt = 0n;
let timer = null;
let clearBox = null;
let closeBox = null;

function wrap(text) {
    const lines = [];
    for (let i = 0; i < text.length; i += COLS) lines.push(text.slice(i, i + COLS));
    return lines.length ? lines : [''];
}

function layout() {
    const rows = [];
    for (const e of events) {
        if (BigInt(e.globalPosition) <= clearedAt) continue;
        const kind = e.kind === 'E' ? '' : ` (${e.kind})`;
        rows.push({ text: `#${e.globalPosition} ${e.type}${kind}`, color: YELLOW });
        rows.push({ text: `${e.streamId} V${e.streamPosition}`, color: CYAN });
        for (const line of wrap(JSON.stringify(e.data ?? {}))) rows.push({ text: line, color: GREEN });
        rows.push({ text: '', color: GREEN });
    }
    return rows;
}

function frame() {
    ctx.fillStyle = '#050805';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = DIM;
    ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2);
    ctx.fillRect(0, 0, 2, H); ctx.fillRect(W - 2, 0, 2, H);

    const rows = layout();
    const shown = Math.floor((H - HEADER - PAD) / LINE);
    scroll = Math.max(0, Math.min(scroll, Math.max(0, rows.length - shown)));

    drawText(ctx, `EVENTS ${events.filter(e => BigInt(e.globalPosition) > clearedAt).length}`, PAD, 5, YELLOW, 1);
    const close = 'X';
    const xx = W - PAD - textWidth(close);
    drawText(ctx, close, xx, 5, '#ff6060', 1);
    closeBox = { x: xx - 3, y: 2, w: textWidth(close) + 6, h: 11 };
    const clear = 'CLEAR';
    const cx = xx - 10 - textWidth(clear);
    drawText(ctx, clear, cx, 5, GREEN, 1);
    clearBox = { x: cx - 2, y: 2, w: textWidth(clear) + 4, h: 11 };
    ctx.fillStyle = DIM;
    ctx.fillRect(PAD, HEADER - 4, W - PAD * 2, 1);

    if (error) drawText(ctx, `UNAVAILABLE: ${error}`, PAD, HEADER + 2, '#ff6060', 1);
    else if (!rows.length) drawText(ctx, 'NO EVENTS', PAD, HEADER + 2, DIM, 1);
    rows.slice(scroll, scroll + shown).forEach((r, i) =>
        drawText(ctx, r.text, PAD, HEADER + i * LINE, r.color, 1));
}

async function refresh() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error(response.status);
        events = (await response.json()).events;
        error = null;
    } catch (e) {
        error = String(e.message);
    }
    frame();
}

export function toggleEventsDebug(show = canvas.hidden) {
    canvas.hidden = !show;
    clearInterval(timer);
    if (show) {
        refresh();
        timer = setInterval(refresh, POLL_MS);
    }
}

canvas.addEventListener('wheel', e => {
    scroll += Math.sign(e.deltaY) * 3;
    frame();
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('click', e => {
    const box = canvas.getBoundingClientRect();
    const x = (e.clientX - box.left) * W / box.width;
    const y = (e.clientY - box.top) * H / box.height;
    const hit = b => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    if (hit(closeBox)) {
        toggleEventsDebug(false);
        return;
    }
    if (clearBox && x >= clearBox.x && x <= clearBox.x + clearBox.w && y >= clearBox.y && y <= clearBox.y + clearBox.h) {
        if (events.length) clearedAt = BigInt(events[0].globalPosition);
        scroll = 0;
        frame();
    }
});

const button = document.createElement('button');
button.type = 'button';
button.textContent = 'EVENTS';
button.title = 'Show the event store (key E)';
button.addEventListener('click', () => toggleEventsDebug());
document.getElementById('controls')?.appendChild(button);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !canvas.hidden) toggleEventsDebug(false);
    if (e.key.toLowerCase() === 'e' && !e.metaKey && !e.ctrlKey && !e.altKey) toggleEventsDebug();
});
