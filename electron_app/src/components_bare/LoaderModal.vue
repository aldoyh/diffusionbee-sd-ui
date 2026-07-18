<template>
    <transition name="loader-fade" appear>
        <div class="loader_overlay" role="dialog" aria-modal="true" :aria-label="title || 'Loading'">
            <div class="loader_card" :class="{ 'loader_card--generation': isGenerationMode }">

                <!-- Phase label -->
                <p v-if="phaseLabel" class="loader_phase">{{ phaseLabel }}</p>
                <h2 class="loader_title">{{ title }}</h2>

                <!-- Circular progress (generation mode) -->
                <div v-if="isGenerationMode" class="loader_circle_wrap">
                    <svg class="loader_circle_svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#3E7BFA" />
                                <stop offset="100%" stop-color="#6c5ce7" />
                            </linearGradient>
                        </defs>
                        <!-- Track -->
                        <circle cx="50" cy="50" r="42" class="loader_circle_track" />
                        <!-- Progress -->
                        <circle
                            cx="50" cy="50" r="42"
                            class="loader_circle_progress"
                            :class="{ 'loader_circle_progress--indeterminate': displayPercent <= 0 }"
                            :style="circleProgressStyle"
                        />
                    </svg>
                    <div class="loader_circle_center">
                        <span class="loader_percent" aria-live="polite">{{ displayPercent }}<span class="loader_percent-suffix">%</span></span>
                    </div>
                </div>

                <!-- Linear progress bar (loading mode) -->
                <div v-else class="loader_progress_track">
                    <div
                        class="loader_progress_fill"
                        :class="{ 'loader_progress_fill--loading': isIndeterminate }"
                        :style="fillStyle"
                    ></div>
                </div>

                <!-- Detail / step info -->
                <p v-if="detailLabel" class="loader_detail">{{ detailLabel }}</p>
                <p v-if="etaLabel" class="loader_eta">{{ etaLabel }}</p>

                <!-- Cancel button (generation mode only) -->
                <button
                    v-if="isGenerationMode"
                    class="loader_cancel_btn"
                    @click="$emit('cancel')"
                    :title="isArabic ? 'إلغاء' : 'Cancel'"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    {{ isArabic ? 'إلغاء' : 'Cancel' }}
                </button>
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    name: 'LoaderModal',
    props: {
        mode: {
            type: String,
            default: 'loading',
        },
        loading_percentage: {
            type: Number,
            default: -1,
        },
        current_step: {
            type: Number,
            default: 0,
        },
        total_steps: {
            type: Number,
            default: 0,
        },
        loading_desc: {
            type: String,
            default: '',
        },
        loading_title: {
            type: String,
            default: '',
        },
        remaining_times: {
            type: String,
            default: '',
        },
        appState: {
            type: Object,
            default: () => ({ isArabic: false }),
        },
    },
    computed: {
        isGenerationMode() {
            return this.mode === 'generation';
        },
        isArabic() {
            return !!(this.appState && this.appState.isArabic);
        },
        isIndeterminate() {
            return this.loading_percentage < 0;
        },
        clampedPercent() {
            const val = typeof this.loading_percentage === 'number' && !Number.isNaN(this.loading_percentage)
                ? this.loading_percentage
                : 0;
            return Math.min(Math.max(val, 0), 100);
        },
        displayPercent() {
            return Math.round(this.clampedPercent);
        },
        title() {
            if (this.loading_title) return this.loading_title;
            if (this.isGenerationMode) {
                return this.isArabic ? 'جارٍ توليد الصورة' : 'Generating image';
            }
            return this.isArabic ? 'جارٍ التحميل' : 'Loading';
        },
        phaseLabel() {
            if (!this.isGenerationMode) return '';

            if (this.displayPercent <= 0) {
                return this.isArabic ? 'التحضير' : 'Preparing';
            }
            if (this.displayPercent >= 100) {
                return this.isArabic ? 'الإنهاء' : 'Finishing up';
            }
            return this.isArabic ? 'التوليد' : 'Generating';
        },
        detailLabel() {
            if (this.isGenerationMode) {
                const step = Number(this.current_step) || 0;
                const total = Number(this.total_steps) || 0;

                if (step > 0 && total > 0) {
                    return this.isArabic
                        ? `الخطوة ${step} من ${total}`
                        : `Step ${step} of ${total}`;
                }

                if (this.displayPercent > 0) {
                    return this.isArabic
                        ? `${this.displayPercent}% مكتمل`
                        : `${this.displayPercent}% complete`;
                }

                return this.isArabic
                    ? 'جارٍ تهيئة المحرك...'
                    : 'Starting the diffusion process...';
            }

            if (this.loading_desc) return this.loading_desc;
            if (!this.isIndeterminate) {
                return this.isArabic
                    ? `${this.displayPercent}% مكتمل`
                    : `${this.displayPercent}% complete`;
            }
            return this.isArabic ? 'يرجى الانتظار...' : 'Please wait...';
        },
        etaLabel() {
            const eta = (this.remaining_times || '').trim();
            if (!eta) return '';

            const cleaned = eta.replace(/^\(|\)$/g, '').trim();
            if (!cleaned) return '';

            if (this.isArabic) {
                return `الوقت المتبقي: ${cleaned}`;
            }
            return `About ${cleaned} remaining`;
        },
        fillStyle() {
            if (this.isIndeterminate) {
                return { width: '40%' };
            }
            return { width: `${this.displayPercent}%` };
        },
        circleProgressStyle() {
            const circumference = 2 * Math.PI * 42; // r=42
            const pct = Math.min(Math.max(this.displayPercent, 0), 100);

            if (this.displayPercent <= 0) {
                // Indeterminate: spinning partial ring
                return {
                    strokeDasharray: `${circumference * 0.4} ${circumference * 0.6}`,
                    strokeDashoffset: '0',
                };
            }

            const offset = circumference - (pct / 100) * circumference;
            return {
                strokeDasharray: `${circumference}`,
                strokeDashoffset: `${offset}`,
            };
        },
    },
};
</script>

<style scoped>
/* ── Overlay ── */
.loader_overlay {
    position: fixed;
    inset: 0;
    z-index: 9990;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

/* ── Card ── */
.loader_card {
    width: min(420px, 92vw);
    padding: 36px 34px 28px;
    border-radius: 20px;
    background: #16161d;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55);
    text-align: center;
}

.loader_card--generation {
    padding-top: 28px;
}

/* ── Phase ── */
.loader_phase {
    margin: 0 0 6px;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(62, 123, 250, 0.75);
    font-weight: 600;
}

/* ── Title ── */
.loader_title {
    margin: 0 0 18px;
    font-size: 1.05rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.94);
    letter-spacing: -0.2px;
}

/* ── Circular progress ── */
.loader_circle_wrap {
    position: relative;
    width: 130px;
    height: 130px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loader_circle_svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.loader_circle_track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.06);
    stroke-width: 4;
}

.loader_circle_progress {
    fill: none;
    stroke: url(#loader-grad);
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    filter: drop-shadow(0 0 8px rgba(62, 123, 250, 0.4));
}

.loader_circle_progress--indeterminate {
    animation: circleSpin 1.8s linear infinite;
    transform-origin: center;
}

@keyframes circleSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.loader_circle_center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ── Percent ── */
.loader_percent {
    font-size: 2.6rem;
    line-height: 1;
    font-weight: 700;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
}

.loader_percent-suffix {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.45);
    margin-left: 2px;
}

/* ── Linear progress track (loading mode) ── */
.loader_progress_track {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
    margin-bottom: 14px;
}

.loader_progress_fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #3E7BFA, #6c5ce7);
    transition: width 0.45s cubic-bezier(0.23, 1, 0.32, 1);
    will-change: width;
}

.loader_progress_fill--loading {
    animation: loadingPulse 1.6s ease-in-out infinite;
    width: 40%;
}

@keyframes loadingPulse {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
}

/* ── Detail ── */
.loader_detail {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.45;
}

/* ── ETA ── */
.loader_eta {
    margin: 8px 0 0;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.42);
    font-variant-numeric: tabular-nums;
}

/* ── Cancel button ── */
.loader_cancel_btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 20px;
    padding: 8px 18px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.loader_cancel_btn:hover {
    background: rgba(255, 69, 58, 0.12);
    border-color: rgba(255, 69, 58, 0.3);
    color: #ff453a;
}

.loader_cancel_btn:active {
    transform: scale(0.96);
}

/* ── Transition ── */
.loader-fade-enter-active {
    animation: fadeIn 0.25s ease;
}

.loader-fade-leave-active {
    animation: fadeIn 0.2s ease reverse;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.loader-fade-enter-active .loader_card {
    animation: cardIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.loader-fade-leave-active .loader_card {
    animation: cardIn 0.2s ease reverse;
}

@keyframes cardIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
