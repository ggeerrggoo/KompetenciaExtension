
import { repositionTaskStatuses} from './utils.js';

export class taskStatus {
    static taskStatusIndex = 0;

    constructor(text, state = 'processing') {
        this.text = text + (text.endsWith(".") ? "" : "...");
        this.state = state;
        this.id = `__tk_task_${++taskStatus.taskStatusIndex}`;
        this.element = this.createElement();
        document.body.appendChild(this.element);
        repositionTaskStatuses();
        if (this.state === 'error') {
            this.error();
        }
        else if (this.state === 'failed') {
            this.fail();
        }
        else if (this.state === 'done') {
            this.succeed();
        }
    }

    createElement() {
        const el = document.createElement('div');
        el.id = this.id;
        el.textContent = `${this.text}`;
        Object.assign(el.style, {
            position: 'fixed',
            right: '12px',
            bottom: '50px',
            padding: '6px 8px',
            background: 'rgba(70,130,180,0.9)', // Steel blue for "in progress"
            color: 'white',
            fontSize: '11px',
            borderRadius: '4px',
            zIndex: '2147483647',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            maxWidth: '280px',
            lineHeight: '1.2',
            pointerEvents: 'none',
            opacity: '1',
            transition: 'opacity 1s ease'
        });
        return el;
    }

    set_text(text) {
        this.text = text;
        this.element.textContent = `${text}`;
    }


    /**
     * Show success status
     * @param {string} [text] - Optional text to display
     * @param {string} [color] - Optional background color (default: 'rgba(34, 170, 34, 0.9)')
     * @param {number} [stayTime] - Time in ms before fading (default: 500)
     * @param {number} [fadeTime] - Time in ms for fade out (default: 500)
     */
    succeed({text = this.text, color = 'rgba(34, 170, 34, 0.9)', stayTime = 500, fadeTime = 500} = {}) {
        this.state = 'done';
        this.element.textContent = `${text}`;
        this.element.style.background = color;
        if (stayTime !== -1 && fadeTime !== -1) {
            setTimeout(() => {
                this.element.style.transition = `opacity ${fadeTime/1000}s ease`;
                this.element.style.opacity = '0';
                setTimeout(() => {
                    this.destroy();
                }, fadeTime);
            }, stayTime);
        }
    }

    /**
     * Show error status
     * @param {string} [text] - Optional text to display
     * @param {string} [color] - Optional background color (default: 'rgba(170,34,34,0.9)')
     * @param {number} [stayTime] - Time in ms before fading (default: 4000)
     * @param {number} [fadeTime] - Time in ms for fade out (default: 2000)
     */
    error({text = this.text, color = 'rgba(170,34,34,0.9)', stayTime = 4000, fadeTime = 2000} = {}) {
        this.state = 'error';
        this.element.textContent = `${text}`;
        this.element.style.background = color;
        if (stayTime !== -1 && fadeTime !== -1) {
            setTimeout(() => {
                this.element.style.transition = `opacity ${fadeTime/1000}s ease`;
                this.element.style.opacity = '0';
                setTimeout(() => {
                    this.destroy();
                }, fadeTime);
            }, stayTime);
        }
    }

    /**
     * Show fail status
     * @param {string} [text] - Optional text to display
     * @param {string} [color] - Optional background color (default: 'rgba(255,165,0,0.9)')
     * @param {number} [stayTime] - Time in ms before fading (default: 3000)
     * @param {number} [fadeTime] - Time in ms for fade out (default: 1500)
     */
    fail({text = this.text, color = 'rgba(255,165,0,0.9)', stayTime = 3000, fadeTime = 1500} = {}) {
        this.state = 'failed';
        this.element.textContent = `${text}`;
        this.element.style.background = color;
        if (stayTime !== -1 && fadeTime !== -1) {
            setTimeout(() => {
                this.element.style.transition = `opacity ${fadeTime/1000}s ease`;
                this.element.style.opacity = '0';
                setTimeout(() => {
                    this.destroy();
                }, fadeTime);
            }, stayTime);
        }
    }
    
    destroy() {
        try {
            // Remove DOM element
            if (this.element && this.element.parentNode) {
                this.element.remove();
            }
            
            // Clear object references
            this.element = null;
            this.text = null;
            this.state = null;
            this.id = null;
            
            // Reposition remaining statuses
            repositionTaskStatuses();
        } catch (e) {
            console.log('taskStatus destroy failed', e);
        }
    }
}