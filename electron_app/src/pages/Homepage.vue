
<template>
    <div class="main_container dark-theme">
        <div class="welcome-section" ref="composerSection">
            <h1 class="welcome-title" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                {{ app.app_state.isArabic ? 'ماذا ستصنع اليوم؟' : 'What will you create today?' }}
            </h1>

            <div class="mode-switcher" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                <button
                    v-for="mode in homeModes"
                    :key="mode.id"
                    class="mode-pill"
                    :class="{ 'mode-pill--active': activeHomeMode === mode.id }"
                    @click="focusHomeSection(mode.target, mode.id)"
                >
                    <span class="mode-pill-icon">{{ mode.icon }}</span>
                    <span class="mode-pill-copy">
                        <span class="mode-pill-title">{{ homeModeLabel(mode) }}</span>
                        <span class="mode-pill-desc">{{ homeModeDescription(mode) }}</span>
                    </span>
                </button>
            </div>

            <p class="carousel-heading" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                {{ app.app_state.isArabic ? 'عينات ملهمة' : 'Inspiration samples' }}
                <span class="sample-count-badge">{{ welcomeTiles.length }}</span>
            </p>

            <div class="carousel-shell">
                <button
                    class="carousel-nav"
                    type="button"
                    @click="scrollSamples(-1)"
                    :title="app.app_state.isArabic ? 'تمرير العينات لليسار' : 'Scroll samples left'"
                    :aria-label="app.app_state.isArabic ? 'تمرير العينات لليسار' : 'Scroll samples left'"
                >
                    ‹
                </button>

                <div class="welcome-samples" ref="welcomeSamples" dir="ltr" @wheel.prevent="onWelcomeSamplesWheel">
                    <div
                        v-for="(img, idx) in welcomeTiles"
                        :key="img.assetKey || ('welcome-' + idx)"
                        class="welcome-sample-tile"
                        :title="img.prompt"
                        v-bind:style="{ 'background-image': 'url(' + img.src + ')' }"
                        @click="useWelcomePrompt(img.prompt)"
                    >
                        <span class="welcome-sample-label" :class="{ 'arabic-text': app.app_state.isArabic }">{{ sampleLabel(img, idx) }}</span>
                    </div>
                </div>

                <button
                    class="carousel-nav"
                    type="button"
                    @click="scrollSamples(1)"
                    :title="app.app_state.isArabic ? 'تمرير العينات لليمين' : 'Scroll samples right'"
                    :aria-label="app.app_state.isArabic ? 'تمرير العينات لليمين' : 'Scroll samples right'"
                >
                    ›
                </button>
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
                    <button @click="randomPrompt" class="chat-submit" :disabled="is_random_prompt_generating" :title="is_random_prompt_generating ? (app.app_state.isArabic ? 'جارٍ إنشاء موجه...' : 'Generating prompt...') : (app.app_state.isArabic ? 'توليد موجه عشوائي' : 'Generate random prompt')" style="background:rgba(255,255,255,0.08); margin-right:6px;">
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

            <div class="quick-controls-card" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                <div class="quick-controls-head">
                    <div>
                        <p class="quick-controls-kicker">{{ app.app_state.isArabic ? 'إعدادات سريعة' : 'Quick settings' }}</p>
                        <h2 class="quick-controls-title">{{ app.app_state.isArabic ? 'غيّر النموذج والإعدادات هنا' : 'Change the model and generation options here' }}</h2>
                    </div>
                    <button class="quick-controls-link" type="button" @click="focusHomeSection('modelsSection', 'models')">
                        {{ app.app_state.isArabic ? 'جميع النماذج' : 'All models' }}
                    </button>
                </div>

                <div class="quick-model-summary" v-if="selectedModelLabel">
                    <div>
                        <span class="quick-controls-label">{{ app.app_state.isArabic ? 'النموذج الحالي' : 'Current model' }}</span>
                        <strong>{{ selectedModelLabel }}</strong>
                        <span class="quick-controls-muted">{{ selectedModelMetaLabel }}</span>
                    </div>
                    <button class="quick-controls-link quick-controls-link--ghost" type="button" @click="focusHomeSection('modelsSection', 'models')">
                        {{ app.app_state.isArabic ? 'تبديل' : 'Change' }}
                    </button>
                </div>

                <div class="quick-options-grid">
                    <div class="quick-option-group">
                        <span class="quick-controls-label">{{ app.app_state.isArabic ? 'الحجم' : 'Canvas' }}</span>
                        <button
                            v-for="preset in resolutionPresets"
                            :key="preset.id"
                            class="quick-chip"
                            :class="{ 'quick-chip--active': selectedResolutionPresetId === preset.id }"
                            type="button"
                            @click="selectedResolutionPresetId = preset.id"
                        >
                            {{ resolutionPresetLabel(preset) }}
                        </button>
                    </div>
                    <div class="quick-option-group">
                        <span class="quick-controls-label">{{ app.app_state.isArabic ? 'الجودة' : 'Quality' }}</span>
                        <button
                            v-for="preset in qualityPresets"
                            :key="preset.id"
                            class="quick-chip"
                            :class="{ 'quick-chip--active': selectedQualityPresetId === preset.id }"
                            type="button"
                            @click="selectedQualityPresetId = preset.id"
                        >
                            {{ qualityPresetLabel(preset) }}
                        </button>
                    </div>
                    <div class="quick-option-group">
                        <span class="quick-controls-label">{{ app.app_state.isArabic ? 'الدفعة' : 'Batch' }}</span>
                        <button
                            v-for="count in batchPresetOptions"
                            :key="count"
                            class="quick-chip"
                            :class="{ 'quick-chip--active': selectedBatchCount === count }"
                            type="button"
                            @click="selectedBatchCount = count"
                        >
                            {{ count }}×
                        </button>
                    </div>
                </div>
            </div>

            <div class="gallery-section gallery-section--prominent" v-if="app.is_mounted" ref="latestSection">
                <div class="gallery-section-header">
                    <h2 class="category-title gallery-section-title">
                        {{ app.app_state.isArabic ? 'نتائج التوليد' : 'Your generations' }}
                    </h2>
                    <div class="gallery-section-actions">
                        <button class="gallery-nav-button" type="button" @click="scrollHomeGallery(-1)">
                            ‹
                        </button>
                        <button class="gallery-nav-button" type="button" @click="scrollHomeGallery(1)">
                            ›
                        </button>
                        <button class="gallery-nav-button gallery-nav-button--ghost" type="button" @click="scrollHomeGalleryToTop">
                            ↑
                        </button>
                    </div>
                </div>
                <GenerationGallery ref="homeGallery" :app="app" :n_to_keep="10" :menu_items_skip="['use_params_current_page']" :compact="true" :fixed_col_size="280"></GenerationGallery>
            </div>

        </div>

        <div class="styles-section" ref="stylesSection">
            <div class="prompt-library-strip" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                <div>
                    <p class="quick-controls-kicker">{{ app.app_state.isArabic ? 'مكتبة الموجهات' : 'Prompt Library' }}</p>
                    <h2 class="prompt-library-title">{{ app.app_state.isArabic ? 'استعرض، عدّل، واستخدم الموجهات من هنا' : 'Browse, tweak, and use prompts from here' }}</h2>
                    <p class="prompt-library-copy">{{ app.app_state.isArabic ? 'ابدأ من مكتبة الموجهات، ثم ارجع مباشرة إلى التوليد دون مغادرة الشاشة الرئيسية.' : 'Start from the prompt library and jump back into generation without leaving the home screen.' }}</p>
                </div>
                <div class="prompt-library-actions">
                    <button class="quick-controls-link" type="button" @click="openPage('PromptLibrary')">
                        {{ app.app_state.isArabic ? 'فتح المكتبة' : 'Open library' }}
                    </button>
                    <button class="quick-controls-link quick-controls-link--ghost" type="button" @click="scrollToHomeSection('toolsSection')">
                        {{ app.app_state.isArabic ? 'الأوضاع' : 'Modes' }}
                    </button>
                </div>
            </div>

            <h2 class="category-title">{{ app.app_state.isArabic ? 'استكشف الأنماط' : 'Explore Styles' }}</h2>
            <div class="styles-grid">
                <div v-for="style in displayedStyles" :key="style.name" class="style-chip" @click="applyStyle(style.name)">
                    <span class="style-icon">{{ style.icon }}</span>
                    <span class="style-name">{{ app.app_state.isArabic ? style.nameArabic : style.name }}</span>
                </div>
            </div>
        </div>

        <div class="tools-sections" ref="toolsSection">
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
        </div>
        <div class="models-section" v-if="availableModels.length > 0" ref="modelsSection">
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
import { getRandomPrompt, getInspireLines, rememberPrompt } from "../prompt_library.js"
import GenerationGallery from "../components/GenerationGallery.vue"
import { syncGalleryGroup } from "../generation_broadcast.js"
import { preparePromptForSd, validatePromptLength } from "../prompt_utils.js"
const { getFallbackDefaultStableDiffusionAsset, sortStableDiffusionModelsBestFirst } = require("../utils/model_selection.js")
const { generatePromptWithOllama, normalizeGeneratedPrompt } = require("../utils/ollama_prompt_service.js")

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
            activeHomeMode: 'create',
            selectedResolutionPresetId: 'square',
            selectedQualityPresetId: 'balanced',
            selectedBatchCount: 1,
            is_random_prompt_generating: false,
            homeModes: [
                {
                    id: 'create',
                    icon: '✨',
                    label: 'Create',
                    labelArabic: 'إنشاء',
                    description: 'Prompt, model, and options',
                    descriptionArabic: 'الموجه والنموذج والإعدادات',
                    target: 'composerSection',
                },
                {
                    id: 'library',
                    icon: '📚',
                    label: 'Prompt Library',
                    labelArabic: 'مكتبة الموجهات',
                    description: 'Browse and remix prompts',
                    descriptionArabic: 'استعرض وامزج الموجهات',
                    target: 'stylesSection',
                },
                {
                    id: 'models',
                    icon: '🧠',
                    label: 'Models',
                    labelArabic: 'النماذج',
                    description: 'Change the active model',
                    descriptionArabic: 'غيّر النموذج الحالي',
                    target: 'modelsSection',
                },
                {
                    id: 'latest',
                    icon: '🖼️',
                    label: 'Latest',
                    labelArabic: 'الأحدث',
                    description: 'Latest generated images',
                    descriptionArabic: 'آخر الصور المولدة',
                    target: 'latestSection',
                },
                {
                    id: 'tools',
                    icon: '🕹️',
                    label: 'Modes',
                    labelArabic: 'الأوضاع',
                    description: 'Open any tool quickly',
                    descriptionArabic: 'افتح أي أداة بسرعة',
                    target: 'toolsSection',
                },
            ],
            resolutionPresets: [
                {
                    id: 'square',
                    label: '1:1',
                    labelArabic: 'مربع',
                },
                {
                    id: 'portrait',
                    label: '4:5',
                    labelArabic: 'عمودي',
                },
                {
                    id: 'landscape',
                    label: '16:9',
                    labelArabic: 'عريض',
                },
            ],
            qualityPresets: [
                {
                    id: 'fast',
                    label: 'Fast',
                    labelArabic: 'سريع',
                    num_steps: 20,
                    guidance_scale: 6.5,
                    scheduler: 'ddim',
                },
                {
                    id: 'balanced',
                    label: 'Balanced',
                    labelArabic: 'متوازن',
                    num_steps: 25,
                    guidance_scale: 7.5,
                    scheduler: 'karras',
                },
                {
                    id: 'detail',
                    label: 'Detailed',
                    labelArabic: 'تفصيلي',
                    num_steps: 35,
                    guidance_scale: 8.5,
                    scheduler: 'karras',
                },
            ],
            batchPresetOptions: [1, 2, 4],
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
            if (this.selectedModelId && models.find(m => m.id === this.selectedModelId)) {
                if (this.selectedModelId === 'Default_SD1.5' && models[0] && models[0].id !== 'Default_SD1.5') {
                    this.selectedModelId = models[0].id;
                }
                return;
            }
            this.selectedModelId = models[0].id;
        },
        getSectionElement(refName) {
            const ref = this.$refs[refName];
            if (!ref) return null;
            return Array.isArray(ref) ? ref[0] : ref;
        },
        scrollToHomeSection(refName) {
            const el = this.getSectionElement(refName);
            if (!el || !el.scrollIntoView) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        focusHomeSection(refName, modeId) {
            if (modeId) {
                this.activeHomeMode = modeId;
            }
            this.scrollToHomeSection(refName);
        },
        openPage(pageId) {
            if (this.app && this.app.functions && this.app.functions.switch_page) {
                this.app.functions.switch_page(pageId);
            }
        },
        homeModeLabel(mode) {
            return this.app.app_state.isArabic ? (mode.labelArabic || mode.label) : mode.label;
        },
        homeModeDescription(mode) {
            return this.app.app_state.isArabic ? (mode.descriptionArabic || mode.description) : mode.description;
        },
        resolutionPresetLabel(preset) {
            return this.app.app_state.isArabic ? (preset.labelArabic || preset.label) : preset.label;
        },
        qualityPresetLabel(preset) {
            return this.app.app_state.isArabic ? (preset.labelArabic || preset.label) : preset.label;
        },
        getSelectedModelAsset() {
            return this.availableModels.find((model) => model.id === this.selectedModelId) || this.availableModels[0] || getFallbackDefaultStableDiffusionAsset();
        },
        isXLModelAsset(model) {
            const sdType = String((model && model.model_meta_data && model.model_meta_data.sd_type) || '').toLowerCase();
            return sdType.includes('xl');
        },
        getSelectedQualityPreset() {
            return this.qualityPresets.find((preset) => preset.id === this.selectedQualityPresetId) || this.qualityPresets[1];
        },
        getSelectedResolutionPreset() {
            return this.resolutionPresets.find((preset) => preset.id === this.selectedResolutionPresetId) || this.resolutionPresets[0];
        },
        getSelectedResolutionDimensions() {
            const model = this.getSelectedModelAsset();
            const isXL = this.isXLModelAsset(model);
            const preset = this.getSelectedResolutionPreset();

            if (preset.id === 'portrait') {
                return isXL ? { width: 832, height: 1216 } : { width: 512, height: 640 };
            }

            if (preset.id === 'landscape') {
                return isXL ? { width: 1216, height: 832 } : { width: 768, height: 512 };
            }

            return isXL ? { width: 1024, height: 1024 } : { width: 512, height: 512 };
        },
        buildQuickGenerationOptions() {
            const quality = this.getSelectedQualityPreset();
            const dimensions = this.getSelectedResolutionDimensions();

            return {
                img_width: dimensions.width,
                img_height: dimensions.height,
                num_imgs: this.selectedBatchCount || 1,
                num_steps: quality.num_steps,
                guidance_scale: quality.guidance_scale,
                scheduler: quality.scheduler,
            };
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
            return this.availableModels[0] || getFallbackDefaultStableDiffusionAsset();
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
            const downloading = this.app.assets_manager.downloading || {};
            if (!downloading[defaultAsset.id]) {
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

            const prepared = preparePromptForSd(prompt, this.app.app_state.isArabic);
            const validation = validatePromptLength(prepared.prompt, this.app.app_state.isArabic);
            if (!validation.valid) {
                this.app.show_toast(validation.message);
                return false;
            }

            if (prepared.wasTranslated) {
                this.app.show_toast(this.app.app_state.isArabic
                    ? 'تمت ترجمة الموجه إلى الإنجليزية لتحسين جودة التوليد.'
                    : 'Prompt translated to English for better generation quality.');
            }

            const quickOptions = this.buildQuickGenerationOptions();

            let genOptions = {
                model_tdict_path: modelPath,
                prompt: prepared.prompt,
                negative_prompt: '',
                img_width: quickOptions.img_width,
                img_height: quickOptions.img_height,
                num_imgs: quickOptions.num_imgs,
                seed: Math.floor(Math.random() * 1000000),
                guidance_scale: quickOptions.guidance_scale,
                num_steps: quickOptions.num_steps,
                scheduler: quickOptions.scheduler,
                applet_name: 'txt2img',
            };

            let rawFormOptions = {
                prompt: prepared.originalPrompt,
                seed: genOptions.seed,
                selected_sd_model: this.selectedModelId,
                selected_resolution_preset: this.selectedResolutionPresetId,
                selected_quality_preset: this.selectedQualityPresetId,
                num_imgs: genOptions.num_imgs,
            };

            this.app.stable_diffusion_manager.add_job(genOptions, rawFormOptions, this.$refs.homeGallery);
            return true;
        },
        scrollHomeToTop() {
            const root = this.$el;
            if (root) root.scrollTop = 0;
        },
        scrollToGallery() {
            this.scrollToHomeSection('latestSection');
            this.scrollHomeGalleryToTop();
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
        scrollHomeGallery(direction) {
            this.scrollToHomeSection('latestSection');
            if (!this.$refs.homeGallery) return;
            if (direction < 0 && this.$refs.homeGallery.scroll_previous) {
                this.$refs.homeGallery.scroll_previous();
                return;
            }
            if (direction > 0 && this.$refs.homeGallery.scroll_next) {
                this.$refs.homeGallery.scroll_next();
            }
        },
        scrollHomeGalleryToTop() {
            this.scrollToHomeSection('latestSection');
            if (!this.$refs.homeGallery) return;
            if (this.$refs.homeGallery.scroll_to_top) {
                this.$refs.homeGallery.scroll_to_top();
            }
        },
        scrollSamples(direction) {
            const el = this.getSectionElement('welcomeSamples');
            if (!el) return;

            const amount = Math.max(320, Math.floor((el.clientWidth || 0) * 0.72));
            el.scrollBy({ left: amount * direction, behavior: 'smooth' });
        },
        onWelcomeSamplesWheel(event) {
            const el = this.getSectionElement('welcomeSamples');
            if (!el) return;

            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            el.scrollLeft += delta;
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
        getRandomStylePreset() {
            if (!this.stylePresets.length) return '';
            return this.stylePresets[Math.floor(Math.random() * this.stylePresets.length)].name;
        },
        async randomPrompt() {
            if (this.is_random_prompt_generating) return;
            this.is_random_prompt_generating = true;

            const fallbackPrompt = getRandomPrompt();
            const styleHint = this.getRandomStylePreset();

            try {
                const generated = await generatePromptWithOllama({
                    sourcePrompt: fallbackPrompt,
                    style: styleHint,
                    locale: this.app.app_state.isArabic ? 'ar' : 'en',
                });
                const prompt = normalizeGeneratedPrompt(generated.prompt) || fallbackPrompt;
                rememberPrompt(prompt);
                this.promptText = prompt;
            } catch (error) {
                console.warn('Ollama prompt generation failed, falling back to the local library:', error);
                rememberPrompt(fallbackPrompt);
                this.promptText = fallbackPrompt;
            } finally {
                this.is_random_prompt_generating = false;
            }

            await this.$nextTick();
            this.submitPrompt();
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
        selectedModelLabel() {
            const model = this.getSelectedModelAsset();
            return model ? (model.title || model.id) : '';
        },
        selectedModelMetaLabel() {
            const model = this.getSelectedModelAsset();
            if (!model || !model.model_meta_data) return '';

            const parts = [];
            if (model.model_meta_data.sd_type) parts.push(model.model_meta_data.sd_type);
            if (model.model_meta_data.float_type) parts.push(model.model_meta_data.float_type);
            return parts.join(' · ');
        },
        availableModels() {
            if (!this.app.is_mounted || !this.app.assets_manager) return [];
            return sortStableDiffusionModelsBestFirst(
                Object.values(this.app.assets_manager.all_avail_assets || {}).filter(
                    m => m.model_meta_data && m.model_meta_data.type === 'sd_model'
                )
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

.mode-switcher {
    width: 100%;
    max-width: 1100px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin: 10px 0 18px;
}

.mode-pill {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 68px;
    padding: 12px 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
    text-align: start;
    cursor: pointer;
    transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}

.mode-pill:hover {
    transform: translateY(-2px);
    border-color: rgba(62, 123, 250, 0.35);
    background: rgba(62, 123, 250, 0.14);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.24);
}

.mode-pill--active {
    background: linear-gradient(135deg, rgba(62, 123, 250, 0.28), rgba(62, 123, 250, 0.1));
    border-color: rgba(62, 123, 250, 0.55);
    box-shadow: 0 0 0 1px rgba(62, 123, 250, 0.2) inset, 0 20px 40px rgba(0, 0, 0, 0.22);
}

.mode-pill-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
}

.mode-pill-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.mode-pill-title {
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1.2;
}

.mode-pill-desc {
    font-size: 0.74rem;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.55);
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

.gallery-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.gallery-section-title {
    margin-bottom: 12px !important;
    font-size: 1.1rem !important;
}

.gallery-section-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.gallery-nav-button {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.gallery-nav-button:hover {
    transform: translateY(-1px);
    background: rgba(62, 123, 250, 0.16);
    border-color: rgba(62, 123, 250, 0.35);
}

.gallery-nav-button--ghost {
    width: 38px;
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

.quick-controls-card {
    width: 100%;
    max-width: 900px;
    margin-bottom: 22px;
    padding: 18px 18px 16px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
}

.quick-controls-head,
.quick-model-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.quick-model-summary {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.07);
}

.quick-controls-kicker {
    margin: 0 0 4px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.45);
}

.quick-controls-title {
    margin: 0;
    font-size: 1.02rem;
    color: rgba(255, 255, 255, 0.95);
}

.quick-controls-label {
    display: inline-block;
    margin-bottom: 8px;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
}

.quick-controls-muted {
    display: block;
    margin-top: 4px;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.5);
}

.quick-controls-link {
    border: 1px solid rgba(62, 123, 250, 0.35);
    background: rgba(62, 123, 250, 0.16);
    color: #fff;
    padding: 10px 14px;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.quick-controls-link:hover {
    transform: translateY(-1px);
    background: rgba(62, 123, 250, 0.24);
    border-color: rgba(62, 123, 250, 0.55);
}

.quick-controls-link--ghost {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
}

.quick-options-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
}

.quick-option-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;
}

.quick-chip {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.88);
    padding: 8px 12px;
    border-radius: 999px;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    font-size: 0.84rem;
    font-weight: 600;
}

.quick-chip:hover {
    transform: translateY(-1px);
    border-color: rgba(62, 123, 250, 0.3);
    background: rgba(62, 123, 250, 0.08);
}

.quick-chip--active {
    border-color: rgba(62, 123, 250, 0.65);
    background: rgba(62, 123, 250, 0.2);
    color: #fff;
}

.prompt-library-strip {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 18px 16px;
    margin-bottom: 20px;
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(62, 123, 250, 0.16), rgba(255, 255, 255, 0.03));
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.prompt-library-title {
    margin: 0;
    font-size: 1.05rem;
    color: #fff;
}

.prompt-library-copy {
    margin: 8px 0 0;
    max-width: 56ch;
    color: rgba(255, 255, 255, 0.64);
}

.prompt-library-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
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
    display: flex;
    gap: 12px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 4px 6px 16px;
    margin-bottom: 8px;
    min-height: 228px;
    direction: ltr;
    -webkit-overflow-scrolling: touch;
    scrollbar-gutter: stable;
}

/* Custom scrollbar for the horizontal carousel */
.welcome-samples::-webkit-scrollbar {
    height: 4px;
}

.welcome-samples::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 4px;
}

.welcome-samples::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    transition: background 0.3s ease;
}

.welcome-samples::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

.welcome-sample-tile {
    flex: 0 0 clamp(190px, 22vw, 280px);
    height: 200px;
    min-height: 200px;
    border-radius: 20px;
    background-color: rgba(255, 255, 255, 0.06);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 
        0 16px 32px rgba(0, 0, 0, 0.45),
        0 0 0 0 rgba(246, 59, 137, 0);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.35s ease, border-color 0.35s ease;
    scroll-snap-align: start;
    animation: tileFadeIn 0.6s cubic-bezier(0.23, 1, 0.32, 1) both;
}

/* Staggered fade-in for each tile */
.welcome-sample-tile:nth-child(1) { animation-delay: 0.05s; }
.welcome-sample-tile:nth-child(2) { animation-delay: 0.10s; }
.welcome-sample-tile:nth-child(3) { animation-delay: 0.15s; }
.welcome-sample-tile:nth-child(4) { animation-delay: 0.20s; }
.welcome-sample-tile:nth-child(5) { animation-delay: 0.25s; }
.welcome-sample-tile:nth-child(6) { animation-delay: 0.30s; }
.welcome-sample-tile:nth-child(7) { animation-delay: 0.35s; }
.welcome-sample-tile:nth-child(8) { animation-delay: 0.40s; }
.welcome-sample-tile:nth-child(9) { animation-delay: 0.45s; }
.welcome-sample-tile:nth-child(10) { animation-delay: 0.50s; }
.welcome-sample-tile:nth-child(11) { animation-delay: 0.55s; }
.welcome-sample-tile:nth-child(12) { animation-delay: 0.60s; }

@keyframes tileFadeIn {
    from {
        opacity: 0;
        transform: translateY(16px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Gradient overlay at tile bottom for label readability */
.welcome-sample-tile::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, 
        rgba(0, 0, 0, 0.65) 0%, 
        rgba(0, 0, 0, 0.3) 40%, 
        transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
}

.welcome-sample-tile:hover::before {
    opacity: 1;
}

/* Subtle inner border glow on the tile */
.welcome-sample-tile::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 21px;
    background: linear-gradient(135deg, rgba(246, 59, 137, 0.3), rgba(0, 194, 255, 0.3));
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
    z-index: 0;
}

.welcome-sample-tile:hover {
    transform: translateY(-8px) scale(1.03);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 
        0 28px 56px rgba(0, 0, 0, 0.6),
        0 0 40px rgba(246, 59, 137, 0.15);
}

/* Press effect on click */
.welcome-sample-tile:active {
    transform: translateY(-2px) scale(0.98);
    transition-duration: 0.1s;
}

.welcome-sample-tile:hover::after {
    opacity: 1;
}

.welcome-sample-label {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 14px;
    padding: 8px 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 0.82rem;
    font-weight: 600;
    text-align: center;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 1;
    transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), background 0.3s ease, box-shadow 0.3s ease;
    letter-spacing: 0.02em;
}

.welcome-sample-tile:hover .welcome-sample-label {
    background: rgba(0, 0, 0, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.carousel-shell {
    width: 100%;
    max-width: 1140px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.carousel-nav {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.94);
    width: 44px;
    height: 44px;
    border-radius: 999px;
    flex-shrink: 0;
    cursor: pointer;
    font-size: 1.6rem;
    line-height: 1;
    transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.carousel-nav:hover {
    transform: translateY(-2px) scale(1.08);
    background: rgba(62, 123, 250, 0.18);
    border-color: rgba(62, 123, 250, 0.5);
    box-shadow: 0 8px 24px rgba(62, 123, 250, 0.2);
}

.carousel-nav:active {
    transform: translateY(0) scale(0.95);
    transition-duration: 0.1s;
}

@media (max-width: 900px) {
    .welcome-samples {
        min-height: 240px;
    }

    .welcome-sample-tile {
        flex-basis: 72vw;
        height: 220px;
    }

    .quick-options-grid {
        grid-template-columns: 1fr;
    }

    .prompt-library-strip {
        flex-direction: column;
    }

    .prompt-library-actions {
        justify-content: flex-start;
    }
}

.models-section {
    padding: 0 60px;
    margin-bottom: 50px;
}

.quick-controls-card .quick-option-group {
    min-width: 0;
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

.tools-sections {
    width: 100%;
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
