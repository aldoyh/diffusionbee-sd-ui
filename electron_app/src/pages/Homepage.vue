
<template>
    <div class="main_container dark-theme">
        <div class="welcome-section">
            <h1 class="welcome-title" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                {{ app.app_state.isArabic ? 'ماذا ستصنع اليوم؟' : 'What will you create today?' }}
            </h1>

            <p class="carousel-heading" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                {{ app.app_state.isArabic ? 'عينات ملهمة' : 'Inspiration samples' }}
                <span class="sample-count-badge">{{ welcomeTiles.length }}</span>
            </p>
            <div class="welcome-samples" dir="ltr">
                <div
                    v-for="(img, idx) in welcomeTiles"
                    :key="img.assetKey || ('welcome-' + idx)"
                    class="welcome-sample-tile"
                    :title="img.prompt"
                    v-bind:style="{ 'background-image': 'url(' + img.src + ')' }"
                    @click="useWelcomePrompt(img.prompt)"
                >
                    <span class="welcome-sample-label">{{ sampleLabel(img, idx) }}</span>
                </div>
            </div>

            <p class="inspiration-text" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                {{ currentInspiration }}
            </p>

            <div class="chat-container">
                <div class="chat-box" :dir="app.app_state.isArabic ? 'rtl' : 'ltr'">
                    <input
                        type="text"
                        v-model="promptText"
                        @keyup.enter="submitPrompt"
                        :placeholder="app.app_state.isArabic ? 'صف ما تريد رؤيته...' : 'Describe what you want to see...'"
                        class="chat-input"
                        :class="{ 'rtl-text': app.app_state.isArabic }"

                    />
                    <button @click="randomPrompt" class="chat-submit" :title="app.app_state.isArabic ? 'توليد موجه عشوائي' : 'Generate random prompt'" style="background:rgba(255,255,255,0.08); margin-right:6px;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                            <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                            <line x1="4" y1="4" x2="9" y2="9"/>
                        </svg>
                    </button>
                    <button @click="submitPrompt" class="chat-submit" :disabled="!promptText.trim()">
                        <svg v-if="!app.app_state.isArabic" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: scaleX(-1);">
                            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="lang-toggle" @click="app.app_state.isArabic = !app.app_state.isArabic" :class="{ 'arabic-text': app.app_state.isArabic }">
                    {{ app.app_state.isArabic ? 'English' : 'العربية' }}
                </div>
                <div v-if="pendingPrompt" class="pending-generation-note" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                    {{ app.app_state.isArabic ? 'تمت إضافة الطلب. سيتم التوليد تلقائيًا عند جاهزية النموذج والمحرك.' : 'Prompt queued. We’ll generate automatically as soon as model and backend are ready.' }}
                </div>
            </div>

            <div class="gallery-section gallery-section--prominent" v-if="app.is_mounted">
                <h2 class="category-title gallery-section-title">
                    {{ app.app_state.isArabic ? 'نتائج التوليد' : 'Your generations' }}
                </h2>
                <GenerationGallery ref="homeGallery" :app="app" :n_to_keep="10" :menu_items_skip="['use_params_current_page']" :compact="true" :fixed_col_size="280"></GenerationGallery>
            </div>

        </div>

        <div class="styles-section">
            <h2 class="category-title">{{ app.app_state.isArabic ? 'استكشف الأنماط' : 'Explore Styles' }}</h2>
            <div class="styles-grid">
                <div v-for="style in displayedStyles" :key="style.name" class="style-chip" @click="applyStyle(style.name)">
                    <span class="style-icon">{{ style.icon }}</span>
                    <span class="style-name">{{ app.app_state.isArabic ? style.nameArabic : style.name }}</span>
                </div>
            </div>
        </div>

        <div v-for="category in categories" :key="category[0]" class="tools-section">
            <h2 class="category-title"> {{category[1]}} </h2>
            <div class="icon_container">
                <div v-for="item in all_icons(category[0]) " 
                    :key="item.id" 
                    v-bind:style="{ 'background-image': 'url(' +( item.img_icon || default_img )+ ')' }"
                    @click="app.functions.switch_page(item.id)" 
                    class="select_app"> 
                    <div class="select_app_desc"> 
                        <h2>  {{item.text}}</h2> 
                        <p> {{item.description}} </p>
                        <div class="l_button button_colored" style="margin-top: 10px;"> Open </div>
                    </div> 
                </div>
            </div>
            <br> 
        </div>
        <div class="models-section" v-if="availableModels.length > 0">
            <h2 class="category-title">
                {{ app.app_state.isArabic ? 'النماذج المتاحة' : 'Your Models' }}
                <span class="model-count-badge">{{ availableModels.length }}</span>
            </h2>
            <div class="models-grid">
                <div v-for="model in availableModels" :key="model.id" 
                    class="model-chip" 
                    :class="{ 'model-selected': selectedModelId === model.id }"
                    @click="selectModel(model)">
                    <span class="model-icon">🧠</span>
                    <span class="model-name">{{ model.title || model.id }}</span>
                    <span class="model-type-badge" v-if="model.model_meta_data && model.model_meta_data.sd_type">
                        {{ model.model_meta_data.sd_type }}
                    </span>
                    <span v-else class="model-type-badge sd-badge">SD</span>
                </div>
            </div>
        </div>

        <hr style="border-color: rgba(255,255,255,0.1)">
    </div>
</template>

<script>
import { getRandomPrompt, saveUserPrompt, getInspireLines } from "../prompt_library.js"
import GenerationGallery from "../components/GenerationGallery.vue"
import { syncGalleryGroup } from "../generation_broadcast.js"

const PUBLIC_BASE = (typeof process !== 'undefined' && process.env && process.env.BASE_URL) || '/';

const WELCOME_ASSET_REQUIRES = {
    'welcome_anime_tokyo_alley.png': require('../assets/welcome/welcome_anime_tokyo_alley.png'),
    'welcome_glass_pavilion.png': require('../assets/welcome/welcome_glass_pavilion.png'),
    'welcome_oil_still_life.png': require('../assets/welcome/welcome_oil_still_life.png'),
    'welcome_street_food.png': require('../assets/welcome/welcome_street_food.png'),
    'welcome_pixel_ramen.png': require('../assets/welcome/welcome_pixel_ramen.png'),
    'welcome_underwater_kelp.png': require('../assets/welcome/welcome_underwater_kelp.png'),
    'welcome_samurai_peak.png': require('../assets/welcome/welcome_samurai_peak.png'),
    'welcome_desert_highway.png': require('../assets/welcome/welcome_desert_highway.png'),
    'welcome_northern_lights.png': require('../assets/welcome/welcome_northern_lights.png'),
    'welcome_lavender_fields.png': require('../assets/welcome/welcome_lavender_fields.png'),
    'welcome_cyberpunk_city.png': require('../assets/welcome/welcome_cyberpunk_city.png'),
    'welcome_coastal_lighthouse.png': require('../assets/welcome/welcome_coastal_lighthouse.png'),
};

function getPublicWelcomePath(assetKey) {
    const prefix = PUBLIC_BASE.endsWith('/') ? PUBLIC_BASE : `${PUBLIC_BASE}/`;
    return `${prefix}welcome/${assetKey}`;
}

function resolveWelcomeAssetUrl(assetKey) {
    if (!assetKey) return '';
    return WELCOME_ASSET_REQUIRES[assetKey] || getPublicWelcomePath(assetKey);
}

const WELCOME_CAROUSEL_META = [
    {
        assetKey: 'welcome_anime_tokyo_alley.png',
        prompt: 'Anime key visual of a Tokyo alley at sunset, cherry petals in the wind, cel shading, vibrant sky gradient, detailed background',
    },
    {
        assetKey: 'welcome_glass_pavilion.png',
        prompt: 'Contemporary glass pavilion in a snowy birch forest, warm interior glow against blue twilight, architectural photography, clean lines',
    },
    {
        assetKey: 'welcome_oil_still_life.png',
        prompt: 'Oil painting still life: copper kettle, sliced citrus, linen tablecloth, Rembrandt chiaroscuro, visible brushstrokes, classical composition',
    },
    {
        assetKey: 'welcome_street_food.png',
        prompt: 'Street food stall at night, sizzling wok, neon menu signs, steam and chili oil, vibrant night market atmosphere, editorial food photography',
    },
    {
        assetKey: 'welcome_pixel_ramen.png',
        prompt: 'Isometric pixel art of a cozy ramen shop in the rain, tiny neon sign, steam from bowls, retro game aesthetic, charming details',
    },
    {
        assetKey: 'welcome_underwater_kelp.png',
        prompt: 'Underwater kelp forest with sun rays piercing the surface, sea turtle gliding through, crystal clear water, serene marine scene',
    },
    {
        assetKey: 'welcome_samurai_peak.png',
        prompt: 'Epic cinematic wide landscape, lone samurai on a misty mountain peak at dawn, golden sunlight piercing clouds, dramatic volumetric light, award-winning photography, ultra detailed, 8k',
    },
    {
        assetKey: 'welcome_desert_highway.png',
        prompt: 'Cinematic wide landscape, empty desert highway at sunset, long straight road vanishing into red rock canyons, dramatic clouds, golden hour, road-trip photography, ultra sharp, 8k',
    },
    {
        assetKey: 'welcome_northern_lights.png',
        prompt: 'Cinematic wide landscape, aurora borealis over a Norwegian fjord, snow-covered pines, mirror-still water reflection, astrophotography, vivid green curtains of light, 8k',
    },
    {
        assetKey: 'welcome_lavender_fields.png',
        prompt: 'Cinematic wide landscape, endless lavender fields in Provence at golden hour, lone tree on the horizon, soft purple rows, dreamy atmosphere, fine art landscape photography, 8k',
    },
    {
        assetKey: 'welcome_cyberpunk_city.png',
        prompt: 'Cinematic wide landscape, cyberpunk megacity at night, neon kanji signs, rain-slick streets, flying cars in distance, blade runner atmosphere, moody teal and magenta, ultra detailed, 8k',
    },
    {
        assetKey: 'welcome_coastal_lighthouse.png',
        prompt: 'Cinematic wide landscape, dramatic coastal lighthouse during a storm, crashing waves, beam cutting through rain, moody seascape, long exposure photography, powerful atmosphere, 8k',
    },
];

const Home = {
    name: 'Home',
    props: {app:Object, },
    components: { GenerationGallery },
    mounted() {
        this.startInspirationRotation();
        if (this.app.functions.subscribe_generation) {
            this.app.functions.subscribe_generation((group) => this.onGenerationComplete(group));
        }
        this.$nextTick(() => {
            this.autoSelectModel();
            this.scrollHomeToTop();
            this.hydrateGalleryFromLastGeneration();
        });
        setTimeout(() => this.scrollHomeToTop(), 250);
    },
    beforeDestroy() {
        if (this.inspirationInterval) {
            clearInterval(this.inspirationInterval);
        }
        this.clearPendingGenerationTimer();
    },
    data() {
        return {
            promptText: '',
            selectedModelId: null,
            inspirationIndex: 0,
            inspirationInterval: null,
            stylePresets: [
                { name: "Cinematic", nameArabic: "سينمائي", icon: "🎬" },
                { name: "Cyberpunk", nameArabic: "سايبربانك", icon: "🌃" },
                { name: "Oil Painting", nameArabic: "رسم زيتي", icon: "🎨" },
                { name: "Anime", nameArabic: "أنمي", icon: "🍱" },
                { name: "Photography", nameArabic: "تصوير فوتوغرافي", icon: "📷" },
                { name: "3D Render", nameArabic: "رسم ثلاثي الأبعاد", icon: "🧊" },
                { name: "Sketch", nameArabic: "رسم يدوي", icon: "✏️" },
                { name: "Fantasy", nameArabic: "خيالي", icon: "🐉" }
            ],
            welcomeTiles: WELCOME_CAROUSEL_META.map((sample) => ({
                assetKey: sample.assetKey,
                src: resolveWelcomeAssetUrl(sample.assetKey),
                prompt: sample.prompt,
            })),
            pendingPrompt: '',
            pendingGenerationReason: '',
            pendingGenerationTimer: null,
            categories: [
                ["main" , "All AI Tools"],
                ["pages" , "Pages"],
                ["misc" , "Miscellaneous"],
                ["tools" , "Tools"],
            ]
        };
    },
    methods: {
        autoSelectModel() {
            let models = this.availableModels;
            if (models.length === 0) return;
            if (this.selectedModelId && models.find(m => m.id === this.selectedModelId)) return;
            // Prefer Default_SD1.5, otherwise use first available
            let preferred = models.find(m => m.id === 'Default_SD1.5');
            this.selectedModelId = preferred ? preferred.id : models[0].id;
        },
        clearPendingGenerationTimer() {
            if (this.pendingGenerationTimer) {
                clearInterval(this.pendingGenerationTimer);
                this.pendingGenerationTimer = null;
            }
        },
        isBackendReady() {
            if (!this.app || !this.app.stable_diffusion_manager) return false;
            if (!this.app.stable_diffusion_manager.stable_diffusion) return false;
            return this.app.stable_diffusion_manager.is_ready;
        },
        getDefaultModelAsset() {
            return {
                id: 'Default_SD1.5',
                filename: 'sd-v1-5_fp16.tdict',
                md5: 'a36c79b8edb4b21b75e50d5834d1f4ae',
                is_stock_model: true,
                url: 'https://huggingface.co/divamgupta/stable_diffusion_mps/resolve/main/sd-v1-5_fp16.tdict',
                title: 'Stable Diffusion 1.5 (Default)',
                model_meta_data: { type: 'sd_model', float_type: 'float16', sd_type: 'SD_1x' }
            };
        },
        ensureModelReadyForGeneration() {
            if (!this.app || !this.app.assets_manager) return false;

            this.autoSelectModel();
            if (this.selectedModelId) {
                let selectedModelPath = this.app.assets_manager.get_downloaded_asset_path(this.selectedModelId);
                if (selectedModelPath) return true;
            }

            // If first-run setup dialog is active, trigger its download flow automatically.
            if (this.app.show_model_setup) {
                if (this.app.model_to_download && !this.app.is_downloading_model && !this.app.model_download_completed) {
                    this.app.start_model_download();
                }
                return false;
            }

            // Fallback: bootstrap default model download so the queued prompt can run.
            let defaultAsset = this.getDefaultModelAsset();
            if (this.app.assets_manager.get_downloaded_asset_path(defaultAsset.id)) {
                this.selectedModelId = defaultAsset.id;
                return true;
            }

            this.selectedModelId = defaultAsset.id;
            if (!this.app.assets_manager.downloading[defaultAsset.id]) {
                this.app.assets_manager.download_asset(defaultAsset);
            }
            return false;
        },
        queuePromptForAutoGeneration(prompt, reason) {
            let normalizedPrompt = (prompt || '').trim();
            if (!normalizedPrompt) return;

            let isNewPrompt = this.pendingPrompt !== normalizedPrompt;
            this.pendingPrompt = normalizedPrompt;
            this.pendingGenerationReason = reason || '';
            this.promptText = '';

            this.ensureModelReadyForGeneration();
            this.tryRunPendingPrompt();

            if (!this.pendingGenerationTimer) {
                this.pendingGenerationTimer = setInterval(() => {
                    this.tryRunPendingPrompt();
                }, 700);
            }

            if (isNewPrompt) {
                this.app.show_toast(this.app.app_state.isArabic
                    ? 'تمت إضافة الطلب وسيبدأ التوليد تلقائيًا.'
                    : 'Prompt queued — generation will start automatically.');
            }
        },
        tryRunPendingPrompt() {
            if (!this.pendingPrompt) {
                this.clearPendingGenerationTimer();
                return;
            }

            if (!this.ensureModelReadyForGeneration()) return;
            if (!this.isBackendReady()) return;
            if (!this.$refs.homeGallery) return;

            let prompt = this.pendingPrompt;
            this.pendingPrompt = '';
            this.pendingGenerationReason = '';
            this.clearPendingGenerationTimer();
            this.generatePrompt(prompt);
        },
        generatePrompt(prompt) {
            let modelPath = this.app.assets_manager.get_downloaded_asset_path(this.selectedModelId);
            if (!modelPath) return false;
            if (!this.$refs.homeGallery) return false;

            let genOptions = {
                model_tdict_path: modelPath,
                prompt: prompt,
                negative_prompt: '',
                img_width: 512,
                img_height: 512,
                num_imgs: 1,
                seed: Math.floor(Math.random() * 1000000),
                guidance_scale: 7.5,
                num_steps: 25,
                scheduler: 'ddim',
                applet_name: 'txt2img',
            };

            let rawFormOptions = {
                prompt: prompt,
                seed: genOptions.seed,
                selected_sd_model: this.selectedModelId,
            };

            this.app.stable_diffusion_manager.add_job(genOptions, rawFormOptions, this.$refs.homeGallery);
            return true;
        },
        scrollHomeToTop() {
            const root = this.$el;
            if (root) root.scrollTop = 0;
        },
        scrollToGallery() {
            const galleryEl = this.$refs.homeGallery && this.$refs.homeGallery.$el;
            if (galleryEl) {
                galleryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        hydrateGalleryFromLastGeneration() {
            const last = this.app.app_state.last_gallery_group;
            if (!last || !this.$refs.homeGallery) return;
            if (this.$refs.homeGallery.groups_with_non_zero_imgs.length > 0) return;
            syncGalleryGroup(this.$refs.homeGallery, last, null);
        },
        onGenerationComplete() {
            this.$nextTick(() => {
                if (this.app.current_selected_tab === 'Homepage') {
                    this.scrollToGallery();
                }
            });
        },
        sampleLabel(img, idx) {
            const labels = this.app.app_state.isArabic
                ? ['أنمي', 'عمارة', 'رسم زيتي', 'طعام', 'بكسل', 'تحت الماء', 'ساموراي', 'صحراء', 'شفق', 'لافندر', 'سايبربانك', 'منارة']
                : ['Anime', 'Architecture', 'Oil painting', 'Street food', 'Pixel art', 'Underwater', 'Samurai', 'Desert', 'Aurora', 'Lavender', 'Cyberpunk', 'Lighthouse'];
            return labels[idx] || img.assetKey;
        },
        useWelcomePrompt(prompt) {
            if (!prompt) return;
            this.promptText = prompt;
            this.submitPrompt();
        },
        // ── DIRECT GENERATION FROM HOMEPAGE ──
        submitPrompt() {

            let prompt = this.promptText.trim();
            if (!prompt) return;

            if (!this.ensureModelReadyForGeneration() || !this.isBackendReady() || !this.$refs.homeGallery) {
                this.queuePromptForAutoGeneration(prompt, this.isBackendReady() ? 'model' : 'backend');
                return;
            }
            this.promptText = '';
            if (!this.generatePrompt(prompt)) {
                this.queuePromptForAutoGeneration(prompt, 'retry');
            }
        },

        applyStyle(styleName) {
            if (!this.promptText.includes(styleName)) {
                this.promptText = this.promptText.trim() ? `${this.promptText}, ${styleName}` : styleName;
            }
        },
        randomPrompt() {
            let prompt = getRandomPrompt();
            this.promptText = prompt;
            saveUserPrompt(prompt);
            setTimeout(() => {
                this.submitPrompt();
            }, 600);
        },
        selectModel(model) {
            this.selectedModelId = model.id;
        },
        all_icons(category){
            let ret = []
            let items = (this.app.all_pages_ready ) ?  this.app.$refs.router.all_applet_items : [];
            for(let item of items){
                if(item.home_category == category)
                    ret.push(item)
            }
            return ret;
        },
        startInspirationRotation() {
            this.inspirationInterval = setInterval(() => {
                this.inspirationIndex = (this.inspirationIndex + 1) % this.inspirationLineCount;
            }, 5000);
        }
    },
    watch: {
        availableModels() {
            this.autoSelectModel();
            this.tryRunPendingPrompt();
        },
        selectedModelId() {
            this.tryRunPendingPrompt();
        },
        'app.is_mounted': {
            handler: function(newValue) {
                if (newValue) {
                    this.autoSelectModel();
                    this.tryRunPendingPrompt();
                }
            }
        },
        'app.stable_diffusion_manager.is_ready': {
            handler: function() {
                this.tryRunPendingPrompt();
            }
        },
        'app.assets_manager.downloading': {
            handler: function() {
                this.tryRunPendingPrompt();
            },
            deep: true
        },
    },
    computed: {
        inspirationLineCount() {
            return getInspireLines(this.app.app_state.isArabic ? 'ar' : 'en').length;
        },
        currentInspiration() {
            const lines = getInspireLines(this.app.app_state.isArabic ? 'ar' : 'en');
            return lines[this.inspirationIndex % lines.length];
        },
        displayedStyles() {
            return this.stylePresets;
        },
        availableModels() {
            if (!this.app.is_mounted || !this.app.assets_manager) return [];
            return Object.values(this.app.assets_manager.all_avail_assets).filter(
                m => m.model_meta_data && m.model_meta_data.type === 'sd_model'
            );
        },
        default_img(){
            return require("../assets/imgs/page_icon_imgs/default1.png")
        }
    }
}

export default Home;
Home.title = "Home"
Home.icon = "home"
Home.home_category = undefined
Home.sidebar_show = "always"

</script>

<style scoped>

.main_container {
    padding: 0;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--sidebar-color); /* Fallback */
    color: var(--text-color-solid);
}

.dark-theme {
    background-color: #000000;
    background-image: radial-gradient(circle at 50% 0%, #1a1a2e 0%, #000000 70%);
    color: #ffffff;
    animation: bg-pulse 10s infinite alternate ease-in-out;
}

@keyframes bg-pulse {
    0% { background-position: 50% 0%; }
    100% { background-position: 50% 10%; }
}

.welcome-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 20px 16px;
    min-height: auto;
}

.welcome-title {
    font-size: 2.2rem;
    font-weight: 800;
    margin-bottom: 6px;
    text-align: center;
    background: linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 10px 40px rgba(255,255,255,0.05);
    letter-spacing: -1px;
}

.carousel-heading {
    font-size: 0.82rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.42);
    margin: 0 0 10px;
    text-align: center;
}

.sample-count-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(62, 123, 250, 0.25);
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
}

.inspiration-text {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 12px 0 18px;
    font-style: italic;
    transition: opacity 0.5s ease;
    height: 1.5rem;
}

.chat-container {
    width: 100%;
    max-width: 800px;
    margin-bottom: 28px;
    position: relative;
    z-index: 10;
}

.chat-box {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(30px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 32px;
    padding: 10px 12px;
    box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.chat-box:focus-within {
    transform: scale(1.02);
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 
        0 30px 60px -12px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset,
        0 0 30px rgba(62, 123, 250, 0.15);
}

.chat-input {
    flex-grow: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.2rem;
    padding: 12px 20px;
    outline: none;
    font-family: var(--main-font-text);
}

.chat-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.rtl-text {
    font-family: 'Tajawal', sans-serif !important;
    direction: rtl;
    line-height: 1.4;
}

.lang-toggle {
    margin-top: 20px;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: all 0.3s ease;
    text-align: center;
}

.lang-toggle:hover {
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 3px;
}
.gallery-section {
    width: 100%;
    max-width: 900px;
    margin-top: 8px;
}

.gallery-section--prominent {
    margin-top: 24px;
    padding: 18px 14px 10px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.gallery-section-title {
    margin-bottom: 12px !important;
    font-size: 1.1rem !important;
}

.pending-generation-note {
    margin-top: 14px;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 0.86rem;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(62, 123, 250, 0.16);
    border: 1px solid rgba(62, 123, 250, 0.35);
    text-align: center;
}

.chat-submit {
    background: #ffffff;
    color: #000000;
    border: none;
    border-radius: 50%;
    width: 52px;
    height: 52px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    flex-shrink: 0;
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.chat-submit:hover:not(:disabled) {
    transform: rotate(15deg) scale(1.1);
    background: #f0f0f0;
    box-shadow: 0 15px 30px rgba(0,0,0,0.3);
}

.chat-submit:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.1);
    cursor: not-allowed;
    box-shadow: none;
}

.welcome-samples {
    width: 100%;
    max-width: 1100px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(3, 108px);
    gap: 10px;
    padding: 4px 8px 16px;
    margin-bottom: 8px;
    min-height: 354px;
    direction: ltr;
}

.welcome-sample-tile {
    width: 100%;
    height: 108px;
    min-height: 108px;
    border-radius: 20px;
    background-color: rgba(255, 255, 255, 0.08);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.45);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.welcome-sample-tile:hover {
    transform: translateY(-6px) scale(1.02);
    border-color: rgba(255, 255, 255, 0.28);
    box-shadow: 0 22px 44px rgba(0, 0, 0, 0.55);
}

.welcome-sample-label {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    padding: 6px 10px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.62);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    text-align: center;
    backdrop-filter: blur(6px);
}

@media (max-width: 900px) {
    .welcome-samples {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

.models-section {
    padding: 0 60px;
    margin-bottom: 50px;
}

.models-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.model-chip {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(99, 102, 241, 0.25);
    border-radius: 12px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.85rem;
    font-weight: 500;
    max-width: 320px;
}

.model-chip:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
}

.model-selected {
    background: rgba(99, 102, 241, 0.2) !important;
    border-color: #6366f1 !important;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
}

.model-icon {
    font-size: 1rem;
    flex-shrink: 0;
}

.model-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: rgba(255,255,255,0.9);
}

.model-type-badge {
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(99, 102, 241, 0.2);
    color: rgba(255,255,255,0.6);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    margin-left: auto;
}

.sd-badge {
    background: rgba(34, 197, 94, 0.2);
    color: rgba(34, 197, 94, 0.8);
}

.model-count-badge {
    font-size: 0.75rem;
    padding: 2px 10px;
    border-radius: 10px;
    background: rgba(99, 102, 241, 0.2);
    color: rgba(255,255,255,0.6);
    font-weight: 600;
}

.styles-section {
    padding: 0 60px;
    margin-bottom: 50px;
}

.styles-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.style-chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    font-weight: 500;
}

.style-chip:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-3px);
}

.style-icon {
    font-size: 1.1rem;
}

.tools-section {
    padding: 40px 60px;
    margin-bottom: 40px;
}

.category-title {
    color: rgba(255,255,255,0.9);
    font-size: 1.4rem;
    font-weight: 700;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    gap: 15px;
}

.category-title::after {
    content: '';
    flex-grow: 1;
    height: 1px;
    background: linear-gradient(to right, rgba(255,255,255,0.15), transparent);
}

.icon_container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 30px;
}

.select_app {
    height: 260px;
    background-size: cover;
    background-position: center;
    background-color: rgba(255, 255, 255, 0.03);
    border-radius: 24px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(255,255,255,0.08);
}

.select_app:hover {
    transform: translateY(-8px);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    border-color: rgba(255, 255, 255, 0.2);
}

.select_app_desc {
    background: linear-gradient(to top, 
        rgba(0,0,0,0.98) 0%, 
        rgba(0,0,0,0.8) 50%, 
        rgba(0,0,0,0.4) 80%,
        transparent 100%);
    padding: 30px 25px 25px;
    position: absolute;
    bottom: 0;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.4s ease;
}

.select_app_desc h2 {
    color: white;
    margin-bottom: 8px;
    font-size: 1.4rem;
    font-weight: 700;
}

.select_app_desc p {
    color: rgba(255,255,255,0.6);
    margin-bottom: 20px;
    font-size: 0.95rem;
    line-height: 1.5;
    height: 2.8rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.button_colored {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 25px;
    padding: 10px 24px;
    font-weight: 600;
    font-size: 0.9rem;
    display: inline-block;
    transition: all 0.3s ease;
}

.select_app:hover .button_colored {
    background: #ffffff;
    color: #000000;
    transform: scale(1.05);
}
</style>
