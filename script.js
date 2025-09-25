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

function resetPiecesPosition() {
    containerRectCache = container.getBoundingClientRect(); 

    const containerCenterX = containerRectCache.width / 2;
    const containerCenterY = containerRectCache.height / 2;
    
    // مدى التباعد العشوائي (يضمن توزيعها حول المنتصف)
    const jitterRange = 150; 
    const containerWidth = containerRectCache.width;
    const containerHeight = containerRectCache.height;

    draggables.forEach(img => {
        img.style.position = 'absolute';

        const imgWidth = img.offsetWidth;
        const imgHeight = img.offsetHeight;

        if (imgWidth === 0 || imgHeight === 0) {
             return; 
        }

        const baseCenterX = containerCenterX - (imgWidth / 2);
        const baseCenterY = containerCenterY - (imgHeight / 2);

        const jitterX = (Math.random() - 0.5) * jitterRange; 
        const jitterY = (Math.random() - 0.5) * jitterRange; 

        let finalX = baseCenterX + jitterX;
        let finalY = baseCenterY + jitterY;

        // التقييد الذكي داخل الحدود (يمنع الاختفاء عند التحميل)
        finalX = Math.max(0, finalX);
        finalY = Math.max(0, finalY);

        finalX = Math.min(finalX, containerWidth - imgWidth);
        finalY = Math.min(finalY, containerHeight - imgHeight);

        img.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
        
        if (img.parentElement !== container) {
            container.appendChild(img);
        }
    });
}

// إعادة ضبط الموضع عند التحميل وعند تغيير حجم الشاشة (للتجاوب)
window.addEventListener('load', resetPiecesPosition); 
window.addEventListener('resize', resetPiecesPosition); 

// ربط زر إعادة التعيين
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
        offsetX = e.clientX - elementRect.left;
        offsetY = e.clientY - elementRect.top;
        
        initialX = e.clientX;
        initialY = e.clientY;

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
        
        // الحركة الحرة التامة
        selected.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
    });
}

document.addEventListener('pointermove', e => {
    if (selected) e.preventDefault();
    if (!selected) return;
    
    const deltaX = e.clientX - initialX;
    const deltaY = e.clientY - initialY;
    
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