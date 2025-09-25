const draggables = document.querySelectorAll('.draggable');
const container = document.getElementById('puzzle-container');
const resetBtn = document.getElementById('resetBtn');
const STORAGE_KEY = 'puzzle_pieces_state';

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

// =======================================================
// وظيفة حفظ موضع القطع في المتصفح
// =======================================================
function savePiecePositions() {
    const positions = {};
    draggables.forEach(img => {
        const transform = window.getComputedStyle(img).transform;
        const matrix = new DOMMatrixReadOnly(transform);
        positions[img.id] = { x: matrix.m41, y: matrix.m42 };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

// =======================================================
// وظيفة تحميل موضع القطع من المتصفح
// =======================================================
function loadPiecePositions() {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        const positions = JSON.parse(savedState);
        draggables.forEach(img => {
            const pos = positions[img.id];
            if (pos) {
                img.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
            }
        });
        return true; // تم التحميل
    }
    return false; // لم يتم العثور على حالة
}

// =======================================================
// وظيفة التوزيع الأولي للقطع (عندما لا توجد حالة محفوظة)
// =======================================================
function distributePiecesRandomly() {
    containerRectCache = container.getBoundingClientRect(); 

    const containerCenterX = containerRectCache.width / 2;
    const containerCenterY = containerRectCache.height / 2;
    
    const jitterRange = 150; 
    const containerWidth = containerRectCache.width;
    const containerHeight = containerRectCache.height;

    draggables.forEach(img => {
        // تأكد من وجود id للقطعة لحفظها (مهم جداً!)
        if (!img.id) {
            console.error("Piece must have an ID for saving state.");
            return;
        }

        img.style.position = 'absolute';

        const imgWidth = img.offsetWidth;
        const imgHeight = img.offsetHeight;

        if (imgWidth === 0 || imgHeight === 0) { return; }

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

// =======================================================
// منطق التحميل والتشغيل
// =======================================================
function initializePuzzle() {
    // 1. محاولة تحميل المواقع المحفوظة
    const loaded = loadPiecePositions();

    // 2. إذا لم يتم تحميل أي شيء، قم بالتوزيع الأولي
    if (!loaded) {
        distributePiecesRandomly();
    }
}

// تشغيل اللغز عند تحميل النافذة
window.addEventListener('load', initializePuzzle); 

// ربط زر إعادة التعيين: يحذف الجلسة ويعيد التوزيع
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        distributePiecesRandomly();
    });
}

// =======================================================
// منطق السحب والإفلات
// =======================================================
window.addEventListener('resize', initializePuzzle); // للتجاوب مع تغيير حجم الشاشة

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
        
        // حفظ الموضع الجديد عند الإفلات
        savePiecePositions(); 

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