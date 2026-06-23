<template>
    <div class="gen_progress">
        <!-- Background glow -->
        <div class="gen_progress_glow"></div>

        <!-- SVG ring -->
        <svg class="gen_progress_svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Track ring -->
            <circle cx="50" cy="50" r="42" class="gen_track" />
            <!-- Progress ring -->
            <circle
                cx="50" cy="50" r="42"
                class="gen_progress_ring"
                :class="{ 'gen_progress_ring--indeterminate': isIndeterminate }"
                :style="progressRingStyle"
            />
        </svg>

        <!-- Central icon -->
        <div class="gen_center_icon">
            <!-- Sparkle AI icon -->
            <svg class="gen_sparkle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="gen_sparkle_path" d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
                    fill="none" stroke="#3E7BFA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        <!-- Percentage text (determinate only) -->
        <span v-if="!isIndeterminate" class="gen_percent_text">{{ clampedPercent }}%</span>
    </div>
</template>

<script>
export default {
    name: 'GenerationProgress',
    props: {
        done_percentage: {
            type: Number,
            default: -1,
        },
    },
    computed: {
        isIndeterminate() {
            return this.done_percentage < 0;
        },
        clampedPercent() {
            return Math.min(Math.max(this.done_percentage || 0, 0), 100);
        },
        progressRingStyle() {
            if (this.isIndeterminate) return {};
            const circumference = 2 * Math.PI * 42; // r=42
            const offset = circumference - (this.clampedPercent / 100) * circumference;
            return {
                strokeDasharray: `${circumference}`,
                strokeDashoffset: `${offset}`,
            };
        },
    },
};
</script>

<style scoped>
.gen_progress {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.gen_progress_glow {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(62, 123, 250, 0.15), transparent 70%);
    animation: glowPulse 2s ease-in-out infinite;
    pointer-events: none;
}

@keyframes glowPulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.08); opacity: 1; }
}

.gen_progress_svg {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
}

.gen_track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.06);
    stroke-width: 4;
}

.gen_progress_ring {
    fill: none;
    stroke: url(#genGradient);
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.35s cubic-bezier(0.23, 1, 0.32, 1);
    filter: drop-shadow(0 0 6px rgba(62, 123, 250, 0.4));
}

/* Determinate: static gradient */
.gen_progress_ring:not(.gen_progress_ring--indeterminate) {
    stroke: #3E7BFA;
}

/* Indeterminate: spinning gradient ring */
.gen_progress_ring--indeterminate {
    stroke: #3E7BFA;
    stroke-dasharray: 150 250;
    stroke-dashoffset: 0;
    animation: ringSpin 1.8s linear infinite;
    transform-origin: center;
}

@keyframes ringSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.gen_center_icon {
    position: absolute;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: iconFloat 2.5s ease-in-out infinite;
}

@keyframes iconFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}

.gen_sparkle {
    width: 100%;
    height: 100%;
}

.gen_sparkle_path {
    animation: sparklePulse 2s ease-in-out infinite;
}

@keyframes sparklePulse {
    0%, 100% { opacity: 0.5; stroke-width: 1.5; }
    50% { opacity: 1; stroke-width: 2; }
}

.gen_percent_text {
    position: absolute;
    bottom: -4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(62, 123, 250, 0.7);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.3px;
}
</style>
