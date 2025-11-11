// ==UserScript==
// @name         PuzCom Solve Time Stats
// @namespace    https://github.com/seiji-irie/PuzComExtension
// @version      1.0
// @description  解答時間統計パネルを表示し、解答時間のヒストグラムを描画します。また、解答記録にソートボタンを追加します。
// @author       seiji-irie
// @homepage     https://github.com/seiji-irie/PuzComExtension
// @match        https://puzzle.nikoli.com/*/post/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function(){
    'use strict';

    const DPR = window.devicePixelRatio || 1;
    const baseScale = Math.max(2, Math.round(DPR));

    // --- 時間文字列を秒に変換 ---
    function timeStrToSec(str){
        if(!str) return null;
        const p = str.split(':').map(Number);
        if(p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
        if(p.length === 2) return p[0]*60 + p[1];
        return null;
    }

    // --- 解答データ収集 ---
    function collectFastestTimes(){
        const out = [];
        const spans = document.querySelectorAll('span');
        for(const span of spans){
            const text = span.textContent;
            const m = text.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
            if(!m) continue;
            const timeStr = m[1];
            const sec = timeStrToSec(timeStr);
            if(sec == null) continue;

            let name = '';
            const container = span.closest('.MuiGrid-container');
            if(container){
                const nameDiv = container.querySelector('.MuiGrid-item:nth-child(1) span');
                if(nameDiv) name = nameDiv.textContent.trim();
            }
            out.push({name, sec, raw: timeStr});
        }
        return out;
    }

    // --- 統計値 ---
    function calcStats(values){
        if(!values.length) return null;
        const mean = values.reduce((a,b)=>a+b,0)/values.length;
        const sorted = [...values].sort((a,b)=>a-b);
        const mid = Math.floor(sorted.length/2);
        const median = sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
        const min = sorted[0];
        const q1 = sorted[Math.floor((sorted.length-1)/4)];
        const q3 = sorted[Math.floor(3*(sorted.length-1)/4)];
        return {mean, median, min, q1, q3, sorted};
    }

    // --- 秒を mm:ss または hh:mm:ss 形式に ---
    function formatSec(s){
        const h = Math.floor(s/3600);
        const m = Math.floor((s%3600)/60);
        const sec = Math.floor(s%60);
        return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
    }

    // --- bin数を自動選択 ---
    function chooseBins(sortedValues){
        const n = sortedValues.length;
        if (n < 5) return 1;

        const q1 = sortedValues[Math.floor((n-1)/4)];
        const q3 = sortedValues[Math.floor(3*(n-1)/4)];
        const iqr = q3 - q1;
        const fd = iqr > 0 ? 2 * iqr / Math.cbrt(n) : null;
        const range = sortedValues[n-1] - sortedValues[0] || 1;
        const fdBins = fd ? Math.max(1, Math.round(range / fd)) : Math.ceil(Math.log2(n) + 1);

        // 少し細かめ（1bin 8〜10人）
        const targetBins = Math.round(n / 10);
        const idealBins = Math.min(n, Math.max(6, targetBins));
        const nbins = Math.round((fdBins * 0.7 + idealBins * 1.3) / 2);
        return nbins;
    }

    // --- 自分のユーザ名検出 ---
    function detectMyUsername(){
        const els = document.querySelectorAll('h6.MuiTypography-h6');
        for(const el of els){
            const next = el.nextElementSibling;
            if(next && /さん/.test(next.textContent)) {
                const name = el.textContent.trim();
                if(name) return name;
            }
        }
        return null;
    }

    // --- パネル生成 ---
    function makePanel(){
        let p = document.getElementById('puzzle-solve-panel');
        if(p) return p;
        p = document.createElement('div');
        p.id = 'puzzle-solve-panel';
        Object.assign(p.style, {
            position: 'fixed',
            right: '16px',
            bottom: '16px',
            width: `${480*baseScale}px`,
            background: 'rgb(253, 247, 234)',
            color: '#222',
            padding: `${12*baseScale}px`,
            fontSize: `${14*baseScale}px`,
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            zIndex: 999999
        });
        p.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${8*baseScale}px">
        <b style="font-size:${16*baseScale}px;color:#111">解答時間統計</b>
        <button id="solve-refresh" style="padding:${4*baseScale}px ${8*baseScale}px;font-size:${13*baseScale}px;background:#2d7cff;color:#fff;border:none;border-radius:4px;cursor:pointer">更新</button>
      </div>
      <div id="solve-stats" style="margin-bottom:${8*baseScale}px;line-height:1.6"></div>
      <canvas id="solve-canvas" width="${440*baseScale}" height="${220*baseScale}" style="width:100%;background:#fff;border-radius:6px"></canvas>
    `;
      document.body.appendChild(p);
      p.querySelector('#solve-refresh').addEventListener('click', render);
      return p;
  }

    // --- キャンバス初期化 ---
    function prepareCanvas(canvas){
        const ctx = canvas.getContext('2d');
        const w = canvas.clientWidth, h = canvas.clientHeight;
        canvas.width = w * DPR;
        canvas.height = h * DPR;
        ctx.setTransform(DPR,0,0,DPR,0,0);
        return ctx;
    }

    // --- ヒストグラム描画 ---
    function drawHistogram(canvas, values, nbins, mySec, stats){
        const ctx = prepareCanvas(canvas);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        ctx.clearRect(0,0,w,h);
        if(!values.length) return;

        const {q1,q3} = stats;
        const cutoff = q3 + 1.5*(q3-q1);
        const filtered = values.map(v => Math.min(v, cutoff));
        const min = Math.min(...filtered), max = Math.max(...filtered);
        const range = max - min || 1;
        const bins = new Array(nbins).fill(0);
        filtered.forEach(v=>{
            let idx = Math.floor((v-min)/range*nbins);
            if(idx >= nbins) idx = nbins-1;
            bins[idx]++;
        });

        const maxC = Math.max(...bins);
        const left = 50*baseScale, top = 20*baseScale, bottom = 40*baseScale, right = 10*baseScale;
        const plotW = w - left - right, plotH = h - top - bottom;

        const roughStep = range / nbins;
        const steps = [1,2,5,10,20,30,60,120,300,600];
        const step = steps.find(s => roughStep <= s) || 600;
        const niceStart = Math.floor(min / step) * step;
        const niceEnd = Math.ceil(max / step) * step;

        // グリッド・軸
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.6;
        const yTicks = 5;
        for(let i=0;i<=yTicks;i++){
            const y = top + (i*plotH/yTicks);
            ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(left+plotW,y); ctx.stroke();
            const val = Math.round(maxC*(1 - i/yTicks));
            ctx.fillStyle = '#444';
            ctx.font = `${11*baseScale}px sans-serif`;
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(val, left - 6, y);
        }

        // X軸縦ラベル
        const approxLabelSpacing = 60;
        const nLabels = Math.floor((niceEnd - niceStart) / step);
        const maxLabels = Math.floor(plotW / approxLabelSpacing);
        const labelEvery = Math.max(1, Math.ceil(nLabels / maxLabels));
        for(let i=0;i<=nLabels;i++){
            const val = niceStart + i*step;
            const x = left + ((val - min)/range)*plotW;
            ctx.strokeStyle = '#eee';
            ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top+plotH); ctx.stroke();
            if(i % labelEvery === 0){
                ctx.save();
                ctx.translate(x, top + plotH + 4);
                ctx.rotate(-Math.PI/2);
                ctx.fillStyle = '#333';
                ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
                ctx.font = `${11*baseScale}px sans-serif`;
                ctx.fillText(formatSec(val), 0, 0);
                ctx.restore();
            }
        }

        // 棒
        bins.forEach((c,i)=>{
            const x = left + i*(plotW/nbins);
            const bw = plotW/nbins - 1;
            const bh = (c/maxC)*plotH;
            const binMin = min + i*(range/nbins);
            const binMax = binMin + (range/nbins);
            const isMine = mySec != null && mySec >= binMin && mySec < binMax;
            ctx.fillStyle = isMine ? '#ff4d4d' : '#2d7cff';
            ctx.fillRect(x, top + plotH - bh, bw, bh);
            if(i === nbins-1 && c>0){
                ctx.fillStyle = '#555';
                ctx.font = `${11*baseScale}px sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`≥${formatSec(Math.round(cutoff))}`, left + plotW - 4, top + plotH - bh - 2);
            }
        });
    }

    // --- メイン処理 ---
    function render(){
        const panel = makePanel();
        const statsDiv = panel.querySelector('#solve-stats');
        const canvas = panel.querySelector('#solve-canvas');

        const data = collectFastestTimes();
        const secs = data.map(d=>d.sec);
        const stats = calcStats(secs);

        if(!stats){
            statsDiv.textContent = 'データが見つかりません';
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgb(253, 247, 234)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const fastest = data.find(d=>d.sec===stats.min);
        const nbins = chooseBins(stats.sorted);

        const myName = detectMyUsername();
        let mySec = null, rankText = '';
        if(myName){
            const myEntry = data.find(d=>d.name === myName);
            if(myEntry){
                mySec = myEntry.sec;
                const rank = stats.sorted.indexOf(mySec) + 1;
                rankText = `<br>あなたのタイム(順位) : <b>${formatSec(mySec)} (${rank}/${secs.length})</b>`;
            }
        }

        statsDiv.innerHTML = `
      件数: ${secs.length}<br>
      平均: <b>${formatSec(Math.round(stats.mean))}</b><br>
      中央: <b>${formatSec(Math.round(stats.median))}</b><br>
      最速: <b>${formatSec(fastest.sec)} (${fastest.name})</b>
      ${rankText}
    `;
      drawHistogram(canvas, secs, nbins, mySec, stats);
  }

    // --- 「解答記録者」ボタン監視 ---
    function watchToggleButton(){
        const observer = new MutationObserver(() => {
            const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.includes('解答記録者'));
            if (btn) {
                console.log('[SolveStats] attach listener to 解答記録者 button');
                btn.addEventListener('click', () => setTimeout(render, 800));
                observer.disconnect();
            }
        });
        observer.observe(document.body, {childList:true, subtree:true});
    }

    // --- 初期化 ---
    function init(){
        watchToggleButton();
        waitForRecordsAndAddButtons();
        render();
    }

    // --- SPA対応: URL変化を監視し再初期化 ---
    let currentUrl = location.href;

    function onUrlChange() {
        console.log('[SolveStats] URL change detected');
        document.getElementById('puzzle-solve-panel')?.remove();
        document.getElementById('sort-buttons')?.remove();
        setTimeout(init, 900);
    }

    // popstate（戻る/進む）は確実に検知できる
    window.addEventListener('popstate', () => {
        currentUrl = location.href;
        onUrlChange();
    });

    // DOM変更時にURL変更をチェック（SPAのpushState対応）
    const urlObserver = new MutationObserver(() => {
        if (location.href !== currentUrl) {
            currentUrl = location.href;
            onUrlChange();
        }
    });

    // bodyの直下の子要素の変更のみ監視（軽量化）
    urlObserver.observe(document.body, {
        childList: true,
        subtree: false
    });
    function waitForRecordsAndAddButtons(){
        const observer = new MutationObserver(() => {
            const firstCard = document.querySelector('.MuiCard-root');
            if (firstCard) {
                observer.disconnect();
                addSortButtonsAboveRecords();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function addSortButtonsAboveRecords(){
        // 既存のボタンを全て削除
        document.querySelectorAll('#sort-buttons').forEach(el => el.remove());

        const firstCard = document.querySelector('.MuiCard-root');
        if (!firstCard) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sort-buttons';
        wrapper.style.cssText = `
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    margin: 6px 12px;
  `;
    wrapper.innerHTML = `
    <span style="font-size:14px; color:#555;">ソート：</span>
    <button id="sort-asc" style="font-size:16px;cursor:pointer;">▲</button>
    <button id="sort-desc" style="font-size:16px;cursor:pointer;">▼</button>
  `;
    firstCard.parentNode.insertBefore(wrapper, firstCard);

    document.getElementById('sort-asc').addEventListener('click', () => sortRecords(true));
    document.getElementById('sort-desc').addEventListener('click', () => sortRecords(false));

    console.log('[SolveStats] sort buttons added');
}

    function sortRecords(asc = true){
        const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
        if (!cards.length) return;

        const parseTime = card => {
            const spans = card.querySelectorAll('span');
            for(const span of spans){
                const m = span.textContent.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
                if (m) {
                    const sec = timeStrToSec(m[1]);
                    if (sec != null) return sec;
                }
            }
            return Infinity;
        };

        const sorted = cards.sort((a, b) => {
            const ta = parseTime(a);
            const tb = parseTime(b);
            return asc ? ta - tb : tb - ta;
        });

        const container = cards[0].parentNode;
        sorted.forEach(el => container.appendChild(el));

        console.log(`[SolveStats] sorted ${asc ? 'ascending' : 'descending'}`);
    }

    // --- 起動 ---
    setTimeout(init, 700);
})();
