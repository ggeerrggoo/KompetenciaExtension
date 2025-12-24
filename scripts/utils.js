import { maxImageHashSize } from './constants.js';
import { taskFieldSelectors } from './constants.js';    
//utility funcs NOT requiring DOM access:
export { dedupeByKey, hashSHA256, waitForImageLoad, waitForLoadingScreen}

function dedupeByKey(items, key) {
    const seen = new Set();
    return items.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

async function hashSHA256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function waitForImageLoad(img) {
    return new Promise(resolve => {
        if (img.complete) {
            resolve(); // already loaded
        } else {
            img.onload = img.onerror = () => resolve();
        }
    });
}

//utility funcs which DO require DOM access:

export { hashImageToID, getCurrentScale, blockUserInteraction, unblockUserInteraction, zoomOut, zoomIn }
async function hashImageToID(img) {
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const canvas = document.createElement('canvas');
  canvas.width = maxImageHashSize;
  canvas.height = maxImageHashSize;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, maxImageHashSize, maxImageHashSize);

  try {
    const dataURL = canvas.toDataURL();
    return await hashSHA256(dataURL);
  } catch (e) {
    console.error('Canvas hashing failed:', e);
    return null;
  }
}

function getCurrentScale() {
    try {
        const currentZoom = document.body.style.zoom;
        if (currentZoom && currentZoom.endsWith('%')) {
            const percent = parseFloat(currentZoom.slice(0, -1));
            if (!isNaN(percent) && percent > 0) {
                return (percent / 100);
            }
        }
        return 1; // Default scale if no zoom is applied
    } catch (e) {
        return 1;
    }
}

/**used to prevent accidental tampering with in-progress auto-fill */
function blockUserInteraction() {
    if (document.getElementById('__input-blocker')) return;

    // scroll to top to help ensure elements stay in place while we interact
    try { window.scrollTo(0, 0); } catch (e) {console.log('scrollTo failed in blockUserInteraction, not necessarily fatal', e); }
    const blocker = document.createElement('div');
    blocker.id = '__input-blocker';
    Object.assign(blocker.style, {
        position: 'fixed',
        inset: '0',
        background: 'rgba(0, 0, 0, 0.18)',
        zIndex: '2147483646',
        cursor: 'wait'
    });
    // make sure clicks are blocked but don't capture pointer events for debugging overlays
    blocker.style.pointerEvents = 'auto';
    document.body.appendChild(blocker);
}

function unblockUserInteraction() {
    const blocker = document.getElementById('__input-blocker');
    if (blocker) blocker.remove();
}

function zoomOut(zoomPercent = 25) {
    let oldZoom = document.body.style.zoom;
    document.body.style.zoom = `${zoomPercent}%`;
    let tkelo = document.querySelector("tk-elonezet");
    if (tkelo) tkelo.style.height = "3000px"; // for some reason the page doesnt extend automatically, so this is a workaround
    // scale status indicator to compensate for page zoom so it stays readable
    try {
        scaleTaskStatuses(1 / (zoomPercent / 100));
    } catch (e) {
        console.log(`error scaling out task statuses`, e);
    }
    return oldZoom;
}

function zoomIn(oldZoom) {
    document.body.style.zoom = oldZoom;
    let tkelo = document.querySelector("tk-elonezet");
    if (tkelo) tkelo.style.height = "100%"; // reset height to default
    // reset status indicator scale
    try { scaleTaskStatuses(1); } catch (e) { console.log('scaleTaskStatuses failed on zoomIn', e); }
}

async function waitForLoadingScreen() {
    while (document.querySelector(taskFieldSelectors.loadingLogo)) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
}

//taskStatuses utils

export { repositionTaskStatuses, scaleTaskStatuses }

function repositionTaskStatuses(scale = -1) {
    try {
        if (scale === -1) {
            scale = 1 / getCurrentScale();
        }
        const tasks = document.querySelectorAll('[id^="__tk_task_"]');
        tasks.forEach((task, index) => {
            if (index == 0) {
                task.style.bottom = 50 * scale + 'px';
            }
            else {
                const prevTop = tasks[index - 1].getBoundingClientRect().top;
                // Position current element 10px above the previous element's top
                task.style.bottom = (window.innerHeight - prevTop + 8) * scale + 'px';
            }
        });
    } catch (e) {
        console.log('repositionTaskStatuses failed', e);
    }
}
function scaleTaskStatuses(scale) {
    try {
        const statuses = document.querySelectorAll('[id^="__tk_task_"]');
        statuses.forEach((status) => {
            status.style.transformOrigin = 'bottom right';
            status.style.transform = `scale(${scale})`;
        });
        // Also reposition with scaled spacing
        repositionTaskStatuses(scale);
    } catch (e) {
        console.log('scaleTaskStatuses error', e);
    }
}