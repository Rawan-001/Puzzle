const draggables = document.querySelectorAll('.draggable');
const container = document.getElementById('puzzle-container');
const resetBtn = document.getElementById('resetBtn');

let selected = null;
let initialX = 0;   
let initialY = 0;   
let transformX = 0; 
let transformY = 0; 
let rafId = null;
let pendingX = null;
let pendingY = null;
let offsetX = 0;    
let offsetY = 0;
let containerRectCache = null;

// دالة ترجع الاحداث بشكل صحيح (جوال/كمبيوتر)
function getEventX(e) {
    return e.pageX || e.clientX;
}
function getEventY(e) {
    return e.pageY || e.clientY;
}

function resetPiecesPosition() {
    containerRectCache = container.getBoundingClientRect(); 

    const containerWidth = containerRectCache.width;
    const containerHeight = containerRectCache.height;

    if (window.innerWidth < 600) {
        // 📱 توزيع عامودي للجوال
        let topOffset = 20;
        draggables.forEach(img => {
            img.style.position = 'absolute';

            const imgWidth = img.offsetWidth;
            const imgHeight = img.offsetHeight;

            let finalX = (containerWidth - imgWidth) / 2; // وسّط القطعة أفقياً
            let finalY = topOffset;

            // نزّل القطعة تحت اللي قبلها
            topOffset += imgHeight + 15; 

            img.style.transform = `translate(${finalX}px, ${finalY}px)`;

            if (img.parentElement !== container) {
                container.appendChild(img);
            }
        });
    } else {
        // 💻 توزيع عشوائي للابتوب/آيباد
        const containerCenterX = containerRectCache.width / 2;
        const containerCenterY = containerRectCache.height / 2;
        const jitterRange = 150;

        draggables.forEach(img => {
            img.style.position = 'absolute';

            const imgWidth = img.offsetWidth;
            const imgHeight = img.offsetHeight;
            if (imgWidth === 0 || imgHeight === 0) return;

            const baseCenterX = containerCenterX - (imgWidth / 2);
            const baseCenterY = containerCenterY - (imgHeight / 2);

            const jitterX = (Math.random() - 0.5) * jitterRange; 
            const jitterY = (Math.random() - 0.5) * jitterRange; 

            let finalX = Math.max(0, Math.min(baseCenterX + jitterX, containerWidth - imgWidth));
            let finalY = Math.max(0, Math.min(baseCenterY + jitterY, containerHeight - imgHeight));

            img.style.transform = `translate(${finalX}px, ${finalY}px)`;

            if (img.parentElement !== container) {
                container.appendChild(img);
            }
        });
    }
}

// انتظر الصور تحمل
window.addEventListener('load', () => {
    Promise.all(Array.from(draggables).map(img => {
        return new Promise(resolve => {
            if (img.complete) resolve();
            else img.onload = resolve;
        });
    })).then(resetPiecesPosition);
});

window.addEventListener('resize', resetPiecesPosition);

window.addEventListener('load', resetPiecesPosition); 
window.addEventListener('resize', resetPiecesPosition); 

if (resetBtn) {
    resetBtn.addEventListener('click', resetPiecesPosition);
}

draggables.forEach(item => {
    item.setAttribute('draggable', 'false');
    item.addEventListener('dragstart', e => e.preventDefault());

    item.addEventListener('pointerdown', e => {
        e.preventDefault(); 
        selected = item;
        containerRectCache = container.getBoundingClientRect(); 

        const elementRect = item.getBoundingClientRect();
        offsetX = getEventX(e) - elementRect.left;
        offsetY = getEventY(e) - elementRect.top;
        
        initialX = getEventX(e);
        initialY = getEventY(e);

        const transformValue = window.getComputedStyle(selected).transform;
        const matrix = new DOMMatrixReadOnly(transformValue);
        transformX = matrix.m41; 
        transformY = matrix.m42;
        
        selected.setPointerCapture(e.pointerId); 
        selected.classList.add('dragging');
        selected.style.cursor = 'grabbing';
        selected.style.zIndex = 100;
    }, { passive: false });
});

function scheduleUpdate() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!selected || pendingX === null || pendingY === null) return;
        
        selected.style.transform = `translate(${pendingX}px, ${pendingY}px)`;
    });
}

document.addEventListener('pointermove', e => {
    if (selected) e.preventDefault();
    if (!selected) return;
    
    const deltaX = getEventX(e) - initialX;
    const deltaY = getEventY(e) - initialY;
    
    const x = transformX + deltaX;
    const y = transformY + deltaY;
    
    const dpr = window.devicePixelRatio || 1;
    pendingX = Math.round(x * dpr) / dpr;
    pendingY = Math.round(y * dpr) / dpr;
    scheduleUpdate();
}, { passive: false });

document.addEventListener('pointerup', e => {
    if (selected) {
        e.preventDefault();
        
        const transformValue = window.getComputedStyle(selected).transform;
        const matrix = new DOMMatrixReadOnly(transformValue);
        transformX = matrix.m41; 
        transformY = matrix.m42;
        
        selected.releasePointerCapture(e.pointerId);
        selected.style.cursor = 'grab';
        selected.style.zIndex = 10;
        selected.classList.remove('dragging');
        
        pendingX = null;
        pendingY = null;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        
        selected = null;
    }
}, { passive: false });
