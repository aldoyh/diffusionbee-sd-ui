<template>
    <div class="loader_overlay">
        <div class="loader_card">

            <!-- Animated orbs -->
            <div class="loader_orb loader_orb--1"></div>
            <div class="loader_orb loader_orb--2"></div>

            <!-- Icon / spinner area -->
            <div class="loader_icon_area">
                <svg class="loader_svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Outer track -->
                    <circle cx="40" cy="40" r="35" stroke="rgba(255,255,255,0.06)" stroke-width="3" fill="none"/>
                    <!-- Animated ring -->
                    <circle 
                        cx="40" cy="40" r="35" 
                        :class="['loader_ring', { 'loader_ring--determinate': loading_percentage >= 0 }]"
                        :style="ringStyle"
                        stroke="#3E7BFA" stroke-width="3" fill="none" stroke-linecap="round"
                    />
                    <!-- Sparkle center -->
                    <path d="M40 18l3.8 11.5 12.1 0.9-9.3 7.9 3 11.7L40 43.5l-9.6 7.5 3-11.7-9.3-7.9 12.1-0.9L40 18z" 
                        fill="#3E7BFA" opacity="0.8">
                        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
                    </path>
                </svg>
            </div>

            <!-- Title -->
            <h2 class="loader_title">{{ loading_title || (appState.isArabic ? 'جارٍ التوليد' : 'Generating') }}</h2>

            <!-- Progress bar -->
            <div class="loader_progress_track">
                <div 
                    class="loader_progress_fill" 
                    :class="{ 'loader_progress_fill--indeterminate': loading_percentage < 0 }"
                    :style="progressStyle"
                >
                    <div class="loader_shimmer"></div>
                </div>
            </div>

            <!-- Status & ETA -->
            <p class="loader_desc" v-if="loading_desc">
                {{ loading_desc }}
                <span v-if="remaining_times" class="loader_eta">{{ remaining_times }}</span>
            </p>
            <p class="loader_desc" v-else-if="loading_percentage >= 0">
                {{ Math.round(loading_percentage) }}% {{ appState.isArabic ? 'مكتمل' : 'complete' }}
            </p>
        </div>
    </div>
</template>

<script>
export default {
    name: 'LoaderModal',
    props: {
        loading_percentage: { type: Number, default: -1 },
        loading_desc: { type: String, default: '' },
        loading_title: { type: String, default: '' },
        remaining_times: { type: String, default: '' },
        appState: { type: Object, default: () => ({ isArabic: false }) },
    },
    computed: {
        isIndeterminate() {
            return this.loading_percentage < 0;
        },
        clampedPercent() {
            return Math.min(Math.max(this.loading_percentage || 0, 0), 100);
        },
        ringStyle() {
            if (this.loading_percentage < 0) return {};
            const r = 35;
            const circ = 2 * Math.PI * r;
            const offset = circ - (this.clampedPercent / 100) * circ;
            return {
                strokeDasharray: `${circ}`,
                strokeDashoffset: `${offset}`,
                transition: 'stroke-dashoffset 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
            };
        },
        progressStyle() {
            if (this.loading_percentage < 0) return {};
            return { width: this.clampedPercent + '%' };
        },
    },
};
</script>

<style scoped>
.loader_overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9990;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    animation: fadeIn 0.35s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.loader_card {
    position: relative;
    overflow: hidden;
    background: rgba(20, 20, 30, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 24px;
    padding: 40px 44px 36px;
    max-width: 380px;
    width: 90%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6);
    animation: cardIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes cardIn {
    from { opacity: 0; transform: translateY(24px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.loader_orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
}

.loader_orb--1 {
    width: 300px;
    height: 300px;
    top: -100px;
    left: -120px;
    background: radial-gradient(circle, rgba(62, 123, 250, 0.08), transparent 70%);
    animation: orbDrift 8s ease-in-out infinite alternate;
}

.loader_orb--2 {
    width: 250px;
    height: 250px;
    bottom: -80px;
    right: -100px;
    background: radial-gradient(circle, rgba(108, 92, 231, 0.06), transparent 70%);
    animation: orbDrift 10s ease-in-out infinite alternate-reverse;
}

@keyframes orbDrift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(20px, -20px); }
}

/* ── Icon Area ── */

.loader_icon_area {
    width: 72px;
    height: 72px;
    margin-bottom: 16px;
    position: relative;
}

.loader_svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.loader_ring {
    stroke-dasharray: 220;
    stroke-dashoffset: 80;
    filter: drop-shadow(0 0 4px rgba(62, 123, 250, 0.3));
}

.loader_ring--determinate {
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
}

.loader_ring:not(.loader_ring--determinate) {
    animation: ringSpin 2s linear infinite;
    transform-origin: center;
    stroke-dasharray: 100 200;
}

@keyframes ringSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* ── Title ── */

.loader_title {
    margin: 0 0 16px;
    font-size: 1.05rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: -0.2px;
}

/* ── Progress Bar ── */

.loader_progress_track {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
    position: relative;
}

.loader_progress_fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #3E7BFA, #6c5ce7, #3E7BFA);
    background-size: 200% 100%;
    animation: gradientSlide 2s ease-in-out infinite;
    transition: width 0.5s cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
    overflow: hidden;
}

.loader_progress_fill--indeterminate {
    width: 35%;
    animation: gradientSlide 2s ease-in-out infinite, indeterminateSweep 2.5s ease-in-out infinite;
}

@keyframes gradientSlide {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

@keyframes indeterminateSweep {
    0% { margin-left: -15%; }
    100% { margin-left: 80%; }
}

.loader_shimmer {
    position: absolute;
    top: 0;
    left: -30%;
    width: 30%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
    animation: shimmerSlide 2s ease-in-out infinite;
}

@keyframes shimmerSlide {
    0% { left: -30%; }
    100% { left: 110%; }
}

/* ── Description ── */

.loader_desc {
    margin: 0;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.5;
}

.loader_eta {
    display: block;
    margin-top: 4px;
    font-size: 0.78rem;
    color: rgba(62, 123, 250, 0.6);
    font-variant-numeric: tabular-nums;
}
</style>
