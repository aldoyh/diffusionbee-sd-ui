<template>
    <div class="splash_screen">
        <!-- Animated gradient orbs -->
        <div class="orb orb--1"></div>
        <div class="orb orb--2"></div>
        <div class="orb orb--3"></div>

        <!-- Floating particles -->
        <div class="particles">
            <div v-for="i in 24" :key="i" class="particle" :style="particleStyle(i)"></div>
        </div>

        <!-- Centered content -->
        <div class="splash_content">
            <!-- Animated logo — DiffusionBee brand mark -->
            <div class="logo_container">
                <svg class="logo_svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Glow behind the mark -->
                    <circle cx="60" cy="60" r="50" class="logo-glow" fill="url(#brandGlow)" opacity="0"/>
                    <!-- DiffusionBee brand mark (adapted from logo_icon_raw.svg) -->
                    <g class="logo-brand">
                        <path d="M86.4 22.6c9.4 8.9 15.6 25.5 12.3 40.5-2.9 14.5-14.6 27-28.8 35.2-14.1 8.3-30.7 12.8-40 5.7-9.2-7.1-11-26-10.7-40.5.3-14.5 2.9-25.2 8.4-33.3 5.5-8.2 14-13.9 24.9-16 11-2.3 24.8-.7 34.2 8.4z" fill="#F63B89" filter="url(#brandShadow)"/>
                        <path d="M99.6 26.5c6.7 4.6 4.2 18-4.1 31.1-8.3 13.2-20.2 24.1-34.7 32.5-14.5 8.4-30.5 13.7-39.1 7.7-8.6-6-11-22.9-9.3-36.9 1.7-14 7-26.2 15.5-35.6 8.5-9.4 19.8-16.6 32.7-18.2 12.9-1.5 27.5 2 39.4 9.4z" fill="#00C2FF" fill-opacity="0.5"/>
                    </g>
                    <!-- Accent dots that orbit around -->
                    <circle cx="60" cy="12" r="2" class="logo-dot" fill="#F63B89" opacity="0"/>
                    <circle cx="60" cy="108" r="2" class="logo-dot" fill="#00C2FF" opacity="0"/>
                    <circle cx="12" cy="60" r="2" class="logo-dot" fill="#F63B89" opacity="0"/>
                    <circle cx="108" cy="60" r="2" class="logo-dot" fill="#00C2FF" opacity="0"/>
                    <!-- Definition for the glow gradient -->
                    <defs>
                        <radialGradient id="brandGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#F63B89" stop-opacity="0.25"/>
                            <stop offset="50%" stop-color="#00C2FF" stop-opacity="0.1"/>
                            <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                        </radialGradient>
                        <filter id="brandShadow">
                            <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="#F63B89" flood-opacity="0.35"/>
                        </filter>
                    </defs>
                </svg>
            </div>

            <!-- App title -->
            <h1 class="splash_title">DiffusionBee</h1>
            <p class="splash_subtitle">AI Image Generation</p>

            <!-- Progress section -->
            <div class="progress_section">
                <div class="progress_track">
                    <div class="progress_fill" :class="{ 'progress--indeterminate': isIndeterminate }" :style="progressStyle">
                        <div class="progress_shimmer"></div>
                    </div>
                </div>
                <div class="progress_info">
                    <span class="progress_status">{{ statusText }}</span>
                    <span v-if="showProgressValue" class="progress_value">{{ Math.round(progressPercent) }}%</span>
                </div>
            </div>

            <!-- Version footer -->
            <p class="splash_version">v{{ appVersion }}</p>
        </div>
    </div>
</template>

<script>
export default {
    name: 'SplashScreen',
    props: {
        progress: {
            type: Number,
            default: -1, // -1 means indeterminate
        },
        status: {
            type: String,
            default: '',
        },
        appVersion: {
            type: String,
            default: '2.4.0',
        },
    },
    computed: {
        isIndeterminate() {
            return this.progress < 0;
        },
        progressPercent() {
            const val = typeof this.progress === 'number' && !Number.isNaN(this.progress)
                ? this.progress
                : 0;
            return Math.min(Math.max(val, 0), 100);
        },
        progressStyle() {
            if (this.progress >= 0) {
                return { width: this.progressPercent + '%' };
            }
            return {}; // CSS animation handles indeterminate width
        },
        showProgressValue() {
            return this.progress >= 0;
        },
        statusText() {
            if (this.status) return this.status;
            if (this.progress < 0) return 'Initializing...';
            if (this.progress < 30) return 'Starting services...';
            if (this.progress < 60) return 'Loading models...';
            if (this.progress < 90) return 'Preparing UI...';
            return 'Almost ready...';
        },
    },
    methods: {
        particleStyle(i) {
            const size = 2 + (i % 3) * 1.5;
            const x = ((i * 37 + 13) % 100);
            const y = ((i * 53 + 7) % 100);
            const delay = (i * 0.4) % 8;
            const duration = 6 + (i % 4) * 2;
            const opacity = 0.15 + (i % 5) * 0.04;
            return {
                left: x + '%',
                top: y + '%',
                width: size + 'px',
                height: size + 'px',
                animationDelay: delay + 's',
                animationDuration: duration + 's',
                opacity: opacity,
            };
        },
    },
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');

/* ── Premium Splash Screen ── */

.splash_screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-user-select: none;
    -webkit-app-region: drag;
    background: #0a0a0f;
    font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}

/* ── Animated Gradient Orbs ── */

.orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    will-change: transform;
    pointer-events: none;
}

.orb--1 {
    width: 500px;
    height: 500px;
    left: -150px;
    top: -100px;
    background: radial-gradient(circle, rgba(62, 123, 250, 0.12), transparent 70%);
    animation: orbFloat 12s ease-in-out infinite alternate;
}

.orb--2 {
    width: 400px;
    height: 400px;
    right: -120px;
    bottom: -80px;
    background: radial-gradient(circle, rgba(108, 92, 231, 0.10), transparent 70%);
    animation: orbFloat 15s ease-in-out infinite alternate-reverse;
}

.orb--3 {
    width: 300px;
    height: 300px;
    left: 60%;
    top: 60%;
    background: radial-gradient(circle, rgba(0, 198, 255, 0.06), transparent 70%);
    animation: orbFloat 10s ease-in-out infinite alternate;
}

@keyframes orbFloat {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -40px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(40px, -30px) scale(1.05); }
}

/* ── Floating Particles ── */

.particles {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.particle {
    position: absolute;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    animation: particleFloat linear infinite;
}

@keyframes particleFloat {
    0% {
        transform: translateY(0) scale(1);
        opacity: 0;
    }
    10% {
        opacity: 1;
    }
    90% {
        opacity: 0.8;
    }
    100% {
        transform: translateY(-120px) scale(0.3);
        opacity: 0;
    }
}

/* ── Centered Content ── */

.splash_content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: contentFadeIn 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes contentFadeIn {
    from {
        opacity: 0;
        transform: translateY(24px) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* ── Logo ── */

.logo_container {
    width: 104px;
    height: 104px;
    margin-bottom: 18px;
    position: relative;
}

.logo_container::after {
    content: '';
    position: absolute;
    inset: -12px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(246, 59, 137, 0.08), transparent 70%);
    animation: logoPulse 3s ease-in-out infinite;
}

@keyframes logoPulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 1; }
}

.logo_svg {
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 1;
}

/* Brand mark fades and scales in */
.logo-brand {
    opacity: 0;
    transform: scale(0.7);
    animation: brandAppear 1.4s cubic-bezier(0.23, 1, 0.32, 1) 0.3s forwards;
    transform-origin: center;
}

@keyframes brandAppear {
    0% { opacity: 0; transform: scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
}

/* Brand glow fades in */
.logo-glow {
    animation: glowFadeIn 1.8s ease-out 0.5s forwards;
}

@keyframes glowFadeIn {
    to { opacity: 1; }
}

/* Dots pop in around the mark */
.logo-dot {
    animation: dotPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.logo-dot:nth-child(3) { animation-delay: 1.6s; }
.logo-dot:nth-child(4) { animation-delay: 1.8s; }
.logo-dot:nth-child(5) { animation-delay: 2.0s; }
.logo-dot:nth-child(6) { animation-delay: 2.2s; }

@keyframes dotPop {
    0% { opacity: 0; r: 0; }
    60% { opacity: 1; }
    100% { opacity: 1; }
}

/* Continuous subtle pulse on the whole logo container */
.logo_container {
    animation: logoGlowPulse 4s ease-in-out 2s infinite;
}

@keyframes logoGlowPulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.12); }
}

/* ── Titles ── */

.splash_title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
    background: linear-gradient(135deg, #ffffff 0%, #a8b4ff 50%, #ffffff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
    text-align: center;
}

.splash_subtitle {
    margin: 4px 0 28px;
    font-size: 0.85rem;
    font-weight: 400;
    font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
}

/* ── Progress Section ── */

.progress_section {
    width: 240px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.progress_track {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
}

.progress_fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #3E7BFA, #6c5ce7, #3E7BFA);
    background-size: 200% 100%;
    animation: progressGradient 2s ease-in-out infinite;
    transition: width 0.5s cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
    overflow: hidden;
}

/* Indeterminate shimmer */
.progress--indeterminate {
    animation: progressGradient 2s ease-in-out infinite, indeterminateShimmer 2s ease-in-out infinite;
}

@keyframes indeterminateShimmer {
    0% { width: 30%; margin-left: -15%; }
    50% { width: 45%; margin-left: 35%; }
    100% { width: 30%; margin-left: 85%; }
}

@keyframes progressGradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

.progress_shimmer {
    position: absolute;
    top: 0;
    left: -20%;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    animation: shimmerSlide 2.5s ease-in-out infinite;
}

@keyframes shimmerSlide {
    0% { left: -40%; }
    100% { left: 120%; }
}

.progress_info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.progress_status {
    font-size: 0.72rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.3px;
    transition: opacity 0.4s ease;
}

.progress_value {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.3);
    font-variant-numeric: tabular-nums;
}

/* ── Version Footer ── */

.splash_version {
    position: fixed;
    bottom: 20px;
    font-size: 0.7rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.15);
    letter-spacing: 0.5px;
}
</style>
