<template>
    <div class="main_container dark-theme">
        <div class="welcome-section" ref="composerSection">
            <h1 class="welcome-title" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                {{ app.app_state.isArabic ? 'ماذا ستصنع اليوم؟' : 'What will you create today?' }}
            </h1>

            <div v-if="needsOnboarding" class="onboarding-banner" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                <div class="onboarding-banner-copy">
                    <p class="onboarding-banner-kicker">{{ app.app_state.isArabic ? 'الإعداد الأولي' : 'First-time setup' }}</p>
                    <h2 class="onboarding-banner-title">{{ app.app_state.isArabic ? 'لنثبت نموذجًا واحدًا لتبدأ التوليد' : 'Install one model to start generating' }}</h2>
                    <p class="onboarding-banner-desc">{{ app.app_state.isArabic ? 'سنختار أفضل نموذج لجهازك — بما في ذلك FLUX.2 Klein عند توفره — ونحمّله من Hugging Face بنقرة واحدة.' : 'We will pick the best model for your machine — including FLUX.2 Klein when available — and download it from Hugging Face in one click.' }}</p>
                </div>
                <div class="onboarding-banner-actions">
                    <button type="button" class="onboarding-primary-btn" @click="downloadDefaultModel">
                        {{ app.app_state.isArabic ? 'تحميل النموذج الافتراضي' : 'Download default model' }}
                    </button>
                    <button type="button" class="onboarding-secondary-btn" @click="openPage('ModelStore')">
                        {{ app.app_state.isArabic ? 'اختيار يدوي' : 'Choose manually' }}
                    </button>
                </div>
            </div>

            <div class="mode-switcher" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                <button
                    type="button"
                    v-for="mode in homeModes"
                    :key="mode.id"
                    class="mode-pill"
                    :class="{ 'mode-pill--active': activeHomeMode === mode.id }"
                    @click="focusHomeSection(mode.target, mode.id)"
                    :title="homeModeTitle(mode)"
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
                <div class="chat-box" :class="{ 'chat-box--has-neg': showNegativePrompt }" :dir="app.app_state.isArabic ? 'rtl' : 'ltr'">
                    <div class="chat-input-wrap">
                        <textarea
                            v-model="promptText"
                            @keydown.meta.enter="submitPrompt"
                            @keydown.ctrl.enter="submitPrompt"
                            @input="onPromptInput"
                            :placeholder="app.app_state.isArabic ? 'صف ما تريد رؤيته...' : 'Describe what you want to see...'"
                            class="chat-input"
                            :class="{ 'rtl-text': app.app_state.isArabic }"
                            rows="2"
                            ref="promptTextarea"
                        ></textarea>
                        <div class="chat-input-tools">
                            <div class="prompt-token-counter" :class="tokenCounterClass" :title="app.app_state.isArabic ? 'عدد رموز CLIP' : 'CLIP token count'">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                <span>{{ clipTokenCount }}/75</span>
                            </div>
                        </div>
                    </div>

                    <div class="chat-actions">
                        <!-- Recent Prompts Dropdown -->
                        <div class="recent-prompts-dropdown" v-if="recentPrompts.length > 0">
                            <button type="button" @click="showRecentPrompts = !showRecentPrompts" class="chat-action-btn" :title="app.app_state.isArabic ? 'الموجهات الأخيرة' : 'Recent prompts'" :class="{ 'chat-action-btn--active': showRecentPrompts }">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </button>
                            <div v-if="showRecentPrompts" class="recent-prompts-menu" @mouseleave="showRecentPrompts = false">
                                <div class="recent-prompts-header">
                                    <span>{{ app.app_state.isArabic ? 'الموجهات الأخيرة' : 'Recent Prompts' }}</span>
                                    <button type="button" @click="clearRecentPrompts" class="recent-clear-btn">{{ app.app_state.isArabic ? 'مسح' : 'Clear' }}</button>
                                </div>
                                <div v-for="(rp, ri) in recentPrompts" :key="'rp-'+ri" class="recent-prompt-item" @click="useRecentPrompt(rp)">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                                    <span class="recent-prompt-text">{{ truncatePrompt(rp, 80) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Negative Prompt Toggle -->
                        <button type="button" @click="showNegativePrompt = !showNegativePrompt" class="chat-action-btn" :title="app.app_state.isArabic ? 'الموجه السلبي' : 'Negative prompt'" :class="{ 'chat-action-btn--active': showNegativePrompt }">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        </button>

                        <!-- Random Prompt -->
                        <button type="button" @click="randomPrompt" class="chat-action-btn" :disabled="is_random_prompt_generating" :title="is_random_prompt_generating ? (app.app_state.isArabic ? 'جارٍ إنشاء موجه...' : 'Generating prompt...') : (app.app_state.isArabic ? 'توليد موجه عشوائي' : 'Generate random prompt')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                                <line x1="4" y1="4" x2="9" y2="9"/>
                            </svg>
                        </button>

                        <!-- Submit -->
                        <button type="button" @click="submitPrompt" class="chat-submit" :disabled="!promptText.trim()" :title="app.app_state.isArabic ? 'إرسال للتوليد' : 'Submit for generation'">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Negative Prompt Area -->
                <transition name="neg-fade">
                    <div v-if="showNegativePrompt" class="negative-prompt-area">
                        <div class="negative-prompt-box" :dir="app.app_state.isArabic ? 'rtl' : 'ltr'">
                            <textarea
                                v-model="negativePrompt"
                                :placeholder="app.app_state.isArabic ? 'ما الذي لا تريد رؤيته؟ (اختياري)' : 'What do you NOT want to see? (optional)'"
                                class="chat-input neg-input"
                                :class="{ 'rtl-text': app.app_state.isArabic }"
                                rows="1"
                                ref="negPromptTextarea"
                            ></textarea>
                        </div>
                    </div>
                </transition>

                <!-- Quick Modifier Chips -->
                <div class="prompt-modifiers" v-if="promptText.trim()">
                    <span class="modifiers-label">{{ app.app_state.isArabic ? 'أضف:' : 'Add:' }}</span>
                    <button
                        type="button"
                        v-for="mod in promptModifiers"
                        :key="mod.label"
                        class="modifier-chip"
                        :class="{ 'modifier-chip--active': promptIncludes(mod.label) }"
                        @click="toggleModifier(mod)"
                    >
                        {{ app.app_state.isArabic ? mod.labelArabic : mod.label }}
                    </button>
                </div>

                <!-- Inspiration Chips Row -->
                <div class="inspiration-chips-row" v-if="!promptText.trim()">
                    <button
                        type="button"
                        v-for="(chip, ci) in inspirationChips"
                        :key="'insp-'+ci"
                        class="inspiration-chip"
                        @click="useInspirationChip(chip)"
                    >
                        <span class="inspiration-chip-icon">{{ chip.icon }}</span>
                        <span>{{ chip.text }}</span>
                    </button>
                </div>

                <button type="button" class="lang-toggle" @click="app.app_state.isArabic = !app.app_state.isArabic" :class="{ 'arabic-text': app.app_state.isArabic }">
                    {{ app.app_state.isArabic ? 'English' : 'العربية' }}
                </button>
                <div v-if="pendingPrompt" class="pending-generation-note" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                    {{ app.app_state.isArabic ? 'تمت إضافة الطلب. سيتم التوليد تلقائيًا عند جاهزية النموذج والمحرك.' : 'Prompt queued. We\u2019ll generate automatically as soon as model and backend are ready.' }}
                </div>
            </div>

            <div class="quick-controls-card" :class="{ 'rtl-text': app.app_state.isArabic, 'arabic-text': app.app_state.isArabic }">
                <div class="quick-controls-head">
                    <div>
                        <p class="quick-controls-kicker">{{ app.app_state.isArabic ? 'إعدادات سريعة' : 'Quick settings' }}</p>
                        <h2 class="quick-controls-title">{{ app.app_state.isArabic ? 'غيّر النموذج والإعدادات هنا' : 'Change the model and generation options here' }}</h2>
                    </div>
                    <button class="quick-controls-link quick-controls-link--ghost" type="button" @click="openPage('ModelStore')">
                        {{ app.app_state.isArabic ? 'إدارة النماذج' : 'Manage models' }}
                    </button>
                </div>

                <div class="quick-model-picker" v-if="availableModels.length > 0">
                    <label class="quick-controls-label" for="home-model-select">{{ app.app_state.isArabic ? 'النموذج' : 'Model' }}</label>
                    <div class="quick-model-picker-row">
                        <select
                            id="home-model-select"
                            class="model-select"
                            v-model="selectedModelId"
                            @change="onModelSelectChange"
                        >
                            <option v-for="model in availableModels" :key="model.id" :value="model.id">
                                {{ model.title || model.id }}{{ modelMetaSuffix(model) }}
                            </option>
                        </select>
                        <span class="model-select-meta" v-if="selectedModelMetaLabel">{{ selectedModelMetaLabel }}</span>
                    </div>
                </div>
                <div class="quick-model-picker quick-model-picker--empty" v-else>
                    <span class="quick-controls-label">{{ app.app_state.isArabic ? 'النموذج' : 'Model' }}</span>
                    <button type="button" class="onboarding-primary-btn onboarding-primary-btn--compact" @click="downloadDefaultModel">
                        {{ app.app_state.isArabic ? 'تحميل النموذج الافتراضي' : 'Download default model' }}
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
                            :title="resolutionPresetTooltip(preset)"
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
                            :title="qualityPresetTooltip(preset)"
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
                            :title="app.app_state.isArabic ? 'توليد ' + count + ' صور' : 'Generate ' + count + ' images'"
                        >
                            {{ count }}&times;
                        </button>
                    </div>
                </div>
            </div>

            <div class="gallery-section gallery-section--prominent" v-if="app.is_mounted" ref="latestSection">
                <div class="gallery-section-header">
                    <h2 class="category-title gallery-section-title">
                        {{ app.app_state.isArabic ? 'نتائج التوليد' : 'Your generations' }}
                        <span class="generation-stats-badge" v-if="totalGeneratedCount > 0">{{ totalGeneratedCount }}</span>
                    </h2>
                    <div class="gallery-section-actions">
                        <button class="gallery-nav-button" type="button" @click="scrollHomeGallery(-1)" :title="app.app_state.isArabic ? 'السابق' : 'Previous'">
                            &lsaquo;
                        </button>
                        <button class="gallery-nav-button" type="button" @click="scrollHomeGallery(1)" :title="app.app_state.isArabic ? 'التالي' : 'Next'">
                            &rsaquo;
                        </button>
                        <button class="gallery-nav-button gallery-nav-button--ghost" type="button" @click="scrollHomeGalleryToTop" :title="app.app_state.isArabic ? 'العودة للأعلى' : 'Scroll to top'">
                            &uarr;
                        </button>
                    </div>
                </div>

                <!-- Thumbnail strip of recent generated images -->
                <transition-group
                    tag="div"
                    name="thumb-pop"
                    class="home-thumbnail-strip"
                    v-if="recentThumbnails.length > 0"
                    ref="thumbStrip"
                >
                    <div
                        v-for="thumb in recentThumbnails"
                        :key="thumb.job_id"
                        class="home-thumbnail-item"
                        @click="useThumbnailPrompt(thumb)"
                        :title="thumb.prompt || (app.app_state.isArabic ? 'انقر لاستخدام هذا الموجه' : 'Click to reuse this prompt')"
                    >
                        <img
                            :src="toFileUrl(thumb.image_url)"
                            class="home-thumbnail-img"
                            loading="lazy"
                            alt="generated image"
                        />
                        <div class="home-thumbnail-overlay">
                            <span class="home-thumbnail-prompt">{{ truncatePrompt(thumb.prompt || thumb.description, 60) }}</span>
                        </div>
                    </div>
                </transition-group>

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
                <button type="button" v-for="style in displayedStyles" :key="style.name" class="style-chip" @click="applyStyle(style.name)">
                    <span class="style-icon">{{ style.icon }}</span>
                    <span class="style-name">{{ app.app_state.isArabic ? style.nameArabic : style.name }}</span>
                </button>
            </div>
        </div>

        <div class="tools-sections" ref="toolsSection">
            <div v-for="category in categories" :key="category[0]" class="tools-section">
                <h2 class="category-title"> {{category[1]}} </h2>
                <div class="icon_container">
                    <button type="button" v-for="item in all_icons(category[0]) " 
                        :key="item.id" 
                        v-bind:style="{ 'background-image': 'url(' +( item.img_icon || default_img )+ ')' }"
                        @click="app.functions.switch_page(item.id)" 
                        class="select_app"> 
                        <span class="select_app_desc"> 
                            <h2>  {{item.text}}</h2> 
                            <p> {{item.description}} </p>
                            <span class="l_button button_colored" style="margin-top: 10px;"> Open </span>
                        </span> 
                    </button>
                </div>
                <br> 
            </div>
        </div>
        <hr style="border-color: rgba(255,255,255,0.1)">
    </div>
</template>

<script>
import { getRandomPrompt, getInspireLines, rememberPrompt } from "../prompt_library.js"
import GenerationGallery from "../components/GenerationGallery.vue"
import { syncGalleryGroup } from "../generation_broadcast.js"
import { preparePromptForSd, validatePromptLength, countClipContentTokens } from "../prompt_utils.js"
import { toFileUrl } from "../utils.js"
const { getFallbackDefaultStableDiffusionAsset, sortStableDiffusionModelsBestFirst } = require("../utils/model_selection.js")
const { isGeneratableModelType, isFlux2Model } = require("../utils/flux2_catalog.js")
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
        this.loadRecentPrompts();
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
            negativePrompt: '',
            showNegativePrompt: false,
            showRecentPrompts: false,
            recentPrompts: [],
            clipTokenCount: 0,
            selectedModelId: null,
            inspirationIndex: 0,
            inspirationInterval: null,
            stylePresets: [
                { name: "Cinematic", nameArabic: "سينمائي", icon: "\uD83C\uDFAC" },
                { name: "Cyberpunk", nameArabic: "سايبربانك", icon: "\uD83C\uDF03" },
                { name: "Oil Painting", nameArabic: "رسم زيتي", icon: "\uD83C\uDFA8" },
                { name: "Anime", nameArabic: "أنمي", icon: "\uD83C\uDF71" },
                { name: "Photography", nameArabic: "تصوير فوتوغرافي", icon: "\uD83D\uDCF7" },
                { name: "3D Render", nameArabic: "رسم ثلاثي الأبعاد", icon: "\uD83E\uDDCA" },
                { name: "Sketch", nameArabic: "رسم يدوي", icon: "\u270F\uFE0F" },
                { name: "Fantasy", nameArabic: "خيالي", icon: "\uD83D\uDC09" }
            ],
            promptModifiers: [
                { label: 'Cinematic', labelArabic: 'سينمائي', value: ', cinematic lighting, dramatic composition' },
                { label: 'Ultra Detailed', labelArabic: 'مفصل للغاية', value: ', ultra detailed, 8k, intricate details' },
                { label: 'Warm Lighting', labelArabic: 'إضاءة دافئة', value: ', warm golden hour lighting, soft glow' },
                { label: 'Moody', labelArabic: 'جوي', value: ', moody atmosphere, dramatic shadows, dark' },
                { label: 'Vibrant', labelArabic: 'نابض بالحياة', value: ', vibrant colors, rich saturation, vivid' },
                { label: 'Photorealistic', labelArabic: 'واقعي فوتوغرافي', value: ', photorealistic, hyperdetailed, sharp focus' },
            ],
            inspirationChips: [
                { icon: '\uD83C\uDF08', text: 'Aurora over fjord', textAr: 'شفق فوق مضيق' },
                { icon: '\uD83C\uDF0C', text: 'Cyberpunk at night', textAr: 'مدينة سايبربانك ليلاً' },
                { icon: '\uD83C\uDF3F', text: 'Lavender fields', textAr: 'حقول الخزامى' },
                { icon: '\uD83C\uDF0A', text: 'Coastal storm', textAr: 'عاصفة ساحلية' },
                { icon: '\uD83C\uDFF4', text: 'Samurai at dawn', textAr: 'ساموراي عند الفجر' },
                { icon: '\uD83C\uDF0D', text: 'Desert highway', textAr: 'طريق صحراوي' },
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
                    icon: '\u2728',
                    label: 'Create',
                    labelArabic: 'إنشاء',
                    description: 'Prompt, model, and options',
                    descriptionArabic: 'الموجه والنموذج والإعدادات',
                    target: 'composerSection',
                },
                {
                    id: 'library',
                    icon: '\uD83D\uDCDA',
                    label: 'Prompt Library',
                    labelArabic: 'مكتبة الموجهات',
                    description: 'Browse and remix prompts',
                    descriptionArabic: 'استعرض وامزج الموجهات',
                    target: 'stylesSection',
                },
                {
                    id: 'models',
                    icon: '\uD83E\uDDE0',
                    label: 'Models',
                    labelArabic: 'النماذج',
                    description: 'Pick model in quick settings',
                    descriptionArabic: 'اختر النموذج من الإعدادات السريعة',
                    target: 'composerSection',
                },
                {
                    id: 'latest',
                    icon: '\uD83D\uDDBC\uFE0F',
                    label: 'Latest',
                    labelArabic: 'الأحدث',
                    description: 'Latest generated images',
                    descriptionArabic: 'آخر الصور المولدة',
                    target: 'latestSection',
                },
                {
                    id: 'tools',
                    icon: '\uD83D\uDD79\uFE0F',
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
        homeModeTitle(mode) {
            if (this.app.app_state.isArabic) {
                return (mode.labelArabic || mode.label) + ' — ' + (mode.descriptionArabic || mode.description);
            }
            return mode.label + ' — ' + mode.description;
        },
        resolutionPresetLabel(preset) {
            return this.app.app_state.isArabic ? (preset.labelArabic || preset.label) : preset.label;
        },
        resolutionPresetTooltip(preset) {
            if (this.app.app_state.isArabic) {
                const names = { square: 'مربع 1:1', portrait: 'عمودي 4:5', landscape: 'عريض 16:9' };
                return names[preset.id] || preset.label;
            }
            const names = { square: 'Square 1:1', portrait: 'Portrait 4:5', landscape: 'Landscape 16:9' };
            return names[preset.id] || preset.label;
        },
        qualityPresetLabel(preset) {
            return this.app.app_state.isArabic ? (preset.labelArabic || preset.label) : preset.label;
        },
        qualityPresetTooltip(preset) {
            const steps = preset.num_steps;
            if (this.app.app_state.isArabic) {
                return preset.labelArabic + ' — ' + steps + ' خطوة، توجيه ' + preset.guidance_scale;
            }
            return preset.label + ' — ' + steps + ' steps, guidance ' + preset.guidance_scale;
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

            if (this.app.show_model_setup) {
                if (this.app.model_to_download && !this.app.is_downloading_model && !this.app.model_download_completed) {
                    this.app.start_model_download();
                }
                return false;
            }

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
                    ? '\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0644\u0628 \u0648\u0633\u064A\u0628\u062F\u0623 \u0627\u0644\u062A\u0648\u0644\u064A\u062F \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627.'
                    : 'Prompt queued \u2014 generation will start automatically.');
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
            const selectedAsset = this.getSelectedModelAsset();
            if (isFlux2Model(selectedAsset)) {
                this.app.show_toast(this.app.app_state.isArabic
                    ? 'تم تنزيل FLUX.2، لكن محرك التوليد الحالي يدعم نماذج Stable Diffusion فقط. اختر نموذج SD من القائمة أو من صفحة النماذج.'
                    : 'FLUX.2 is downloaded, but the current generation backend supports Stable Diffusion models only. Pick an SD model from the dropdown or Models page.');
                return false;
            }
            if (!this.$refs.homeGallery) return false;

            const prepared = preparePromptForSd(prompt.trim(), this.app.app_state.isArabic);
            const validation = validatePromptLength(prepared.prompt, this.app.app_state.isArabic);
            if (!validation.valid) {
                this.app.show_toast(validation.message);
                return false;
            }

            if (prepared.wasTranslated) {
                this.app.show_toast(this.app.app_state.isArabic
                    ? '\u062A\u0645\u062A \u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0645\u0648\u062C\u0647 \u0625\u0644\u0649 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0644\u062A\u062D\u0633\u064A\u0646 \u062C\u0648\u062F\u0629 \u0627\u0644\u062A\u0648\u0644\u064A\u062F.'
                    : 'Prompt translated to English for better generation quality.');
            }

            const quickOptions = this.buildQuickGenerationOptions();

            let genOptions = {
                model_tdict_path: modelPath,
                prompt: prepared.prompt,
                negative_prompt: this.negativePrompt || '',
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
            this.rememberUsedPrompt(prompt.trim());
            return true;
        },
        onPromptInput() {
            this.$nextTick(() => {
                this.updateClipTokenCount();
                this.autoResizeTextarea();
            });
        },
        updateClipTokenCount() {
            try {
                this.clipTokenCount = countClipContentTokens(this.promptText || '');
            } catch (e) {
                this.clipTokenCount = 0;
            }
        },
        autoResizeTextarea() {
            const el = this.$refs.promptTextarea;
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 160) + 'px';
        },
        loadRecentPrompts() {
            try {
                const data = window.localStorage.getItem('recent_home_prompts');
                this.recentPrompts = data ? JSON.parse(data) : [];
            } catch (e) {
                this.recentPrompts = [];
            }
        },
        rememberUsedPrompt(prompt) {
            if (!prompt) return;
            try {
                const recent = this.recentPrompts.filter(p => p !== prompt);
                recent.unshift(prompt);
                const trimmed = recent.slice(0, 20);
                window.localStorage.setItem('recent_home_prompts', JSON.stringify(trimmed));
                this.recentPrompts = trimmed;
            } catch (e) {
                // ignore storage errors
            }
            rememberPrompt(prompt);
        },
        clearRecentPrompts() {
            this.recentPrompts = [];
            try {
                window.localStorage.removeItem('recent_home_prompts');
            } catch (e) {
                // ignore
            }
            this.showRecentPrompts = false;
        },
        useRecentPrompt(prompt) {
            this.promptText = prompt;
            this.showRecentPrompts = false;
            this.updateClipTokenCount();
            this.$nextTick(() => {
                this.autoResizeTextarea();
                if (this.$refs.promptTextarea) {
                    this.$refs.promptTextarea.focus();
                }
            });
        },
        truncatePrompt(text, maxLen) {
            if (!text) return '';
            return text.length > maxLen ? text.substring(0, maxLen) + '\u2026' : text;
        },
        promptIncludes(modLabel) {
            return this.promptText.toLowerCase().includes(modLabel.toLowerCase());
        },
        toggleModifier(mod) {
            const current = this.promptText;
            if (this.promptIncludes(mod.label)) {
                this.promptText = current.replace(
                    new RegExp(',?\\s*' + mod.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                    ''
                ).replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
            } else {
                this.promptText = current.trim() ? current + mod.value : mod.value.replace(/^,\s*/, '');
            }
            this.updateClipTokenCount();
        },
        useInspirationChip(chip) {
            this.promptText = this.app.app_state.isArabic ? chip.textAr : chip.text;
            this.updateClipTokenCount();
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
        },
        useThumbnailPrompt(thumb) {
            const prompt = thumb.prompt || thumb.description;
            if (!prompt) return;
            this.promptText = prompt;
            this.scrollToHomeSection('composerSection');
        },
        toFileUrl(path) {
            return toFileUrl(path);
        },
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
                let prompt = normalizeGeneratedPrompt(generated.prompt) || fallbackPrompt;
                if (!normalizeGeneratedPrompt(generated.prompt)) {
                    prompt = prompt.trim() ? `${prompt}, ${styleHint}` : styleHint;
                }
                rememberPrompt(prompt);
                this.promptText = prompt;
            } catch (error) {
                console.warn('Ollama prompt generation failed, falling back to the local library:', error);
                let prompt = fallbackPrompt.trim() ? `${fallbackPrompt}, ${styleHint}` : styleHint;
                rememberPrompt(prompt);
                this.promptText = prompt;
            } finally {
                this.is_random_prompt_generating = false;
            }

            await this.$nextTick();
            this.submitPrompt();
        },
        selectModel(model) {
            this.selectedModelId = model.id;
        },
        onModelSelectChange() {
            this.autoSelectModel();
        },
        modelMetaSuffix(model) {
            if (!model || !model.model_meta_data || !model.model_meta_data.sd_type) return '';
            return ' (' + model.model_meta_data.sd_type + ')';
        },
        async downloadDefaultModel() {
            if (!this.app || !this.app.launchOnboarding || !this.app.start_model_download) return;
            // Pick the best default model for this machine (fetches the catalog on demand).
            if (!this.app.model_to_download) {
                await this.app.fetch_models_list();
            }
            if (!this.app.model_to_download) {
                // Catalog unavailable (e.g. offline) — open the dialog so the user can retry.
                this.app.launchOnboarding(true);
                return;
            }
            // One click: open the setup dialog (shows live progress) and start downloading.
            this.app.launchOnboarding(true);
            if (this.app.show_model_setup) {
                this.app.start_model_download();
            }
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
        promptText() {
            this.updateClipTokenCount();
        },
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
            return parts.join(' \u00B7 ');
        },
        tokenCounterClass() {
            if (this.clipTokenCount > 68) return 'token-counter--danger';
            if (this.clipTokenCount > 55) return 'token-counter--warn';
            return 'token-counter--ok';
        },
        recentThumbnails() {
            try {
                const groups = this.$refs.homeGallery ? this.$refs.homeGallery.groups_with_non_zero_imgs : [];
                const thumbs = [];
                for (const g of groups) {
                    const imgs = g.imgs || [];
                    for (const im of imgs) {
                        if (im.image_url && im.image_url !== 'ERROR') {
                            thumbs.push({
                                job_id: im.job_id || im.image_url,
                                image_url: im.image_url,
                                prompt: im.description || im.params?.prompt || '',
                                description: im.description || '',
                            });
                            if (thumbs.length >= 12) break;
                        }
                    }
                    if (thumbs.length >= 12) break;
                }
                return thumbs;
            } catch (e) {
                return [];
            }
        },
        totalGeneratedCount() {
            try {
                const groups = this.$refs.homeGallery ? this.$refs.homeGallery.groups_with_non_zero_imgs : [];
                let count = 0;
                for (const g of groups) {
                    count += (g.imgs || []).filter(im => im.image_url && im.image_url !== 'ERROR').length;
                }
                return count;
            } catch (e) {
                return 0;
            }
        },
        availableModels() {
            if (!this.app.is_mounted || !this.app.assets_manager) return [];
            return sortStableDiffusionModelsBestFirst(
                Object.values(this.app.assets_manager.all_avail_assets || {}).filter(
                    m => m.model_meta_data && isGeneratableModelType(m.model_meta_data.type)
                )
            );
        },
        needsOnboarding() {
            if (this.availableModels.length > 0) return false;
            const settings = this.app && this.app.app_state && this.app.app_state.app_data && this.app.app_state.app_data.settings;
            return !(settings && settings.onboarding_completed);
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

/* Button reset — ensure all buttons inherit font and have no default quirks */
button {
    font-family: var(--main-font-text), -apple-system, BlinkMacSystemFont, sans-serif;
    outline: none;
}

button:focus-visible {
    outline: 2px solid rgba(62, 123, 250, 0.6);
    outline-offset: 2px;
}

.main_container {
    padding: 0;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--sidebar-color);
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
    flex: 0 1 auto;
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
    flex-direction: column;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(30px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 10px 10px 10px 16px;
    box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.chat-box:focus-within {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 
        0 30px 60px -12px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset,
        0 0 30px rgba(62, 123, 250, 0.15);
}

.chat-input-wrap {
    display: flex;
    flex-direction: column;
    position: relative;
}

.chat-input {
    flex-grow: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.1rem;
    padding: 8px 4px 4px;
    outline: none;
    font-family: var(--main-font-text);
    resize: none;
    line-height: 1.5;
    min-height: 48px;
    max-height: 160px;
}

.chat-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.neg-input {
    font-size: 0.95rem;
    padding: 8px 12px;
    color: rgba(255, 255, 255, 0.7);
}

.chat-input-tools {
    display: flex;
    justify-content: flex-end;
    padding: 2px 6px 4px;
}

.prompt-token-counter {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 8px;
    letter-spacing: 0.02em;
    transition: all 0.3s ease;
}

.token-counter--ok {
    color: rgba(52, 199, 89, 0.7);
    background: rgba(52, 199, 89, 0.08);
}

.token-counter--warn {
    color: rgba(255, 204, 0, 0.8);
    background: rgba(255, 204, 0, 0.1);
}

.token-counter--danger {
    color: rgba(255, 69, 58, 0.85);
    background: rgba(255, 69, 58, 0.1);
}

.chat-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    padding: 4px 0 0;
}

.chat-action-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.25s ease;
    flex-shrink: 0;
}

.chat-action-btn:hover {
    background: rgba(62, 123, 250, 0.16);
    border-color: rgba(62, 123, 250, 0.35);
    color: rgba(255, 255, 255, 0.9);
    transform: translateY(-1px);
}

.chat-action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
}

.chat-action-btn--active {
    background: rgba(62, 123, 250, 0.2);
    border-color: rgba(62, 123, 250, 0.5);
    color: #fff;
}

.recent-prompts-dropdown {
    position: relative;
}

.recent-prompts-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 320px;
    max-height: 360px;
    overflow-y: auto;
    background: rgba(30, 30, 32, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    padding: 8px 0;
    z-index: 100;
    animation: menuFadeIn 0.2s ease;
}

@keyframes menuFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

.recent-prompts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 4px;
}

.recent-clear-btn {
    background: none;
    border: none;
    color: rgba(255, 69, 58, 0.6);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.recent-clear-btn:hover {
    color: #ff453a;
    background: rgba(255, 69, 58, 0.1);
}

.recent-prompt-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.2s ease;
    color: rgba(255, 255, 255, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.recent-prompt-item:hover {
    background: rgba(62, 123, 250, 0.12);
}

.recent-prompt-item svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: rgba(255, 255, 255, 0.3);
}

.recent-prompt-text {
    font-size: 0.82rem;
    line-height: 1.4;
    word-break: break-word;
}

.negative-prompt-area {
    margin-top: 6px;
    overflow: hidden;
}

.neg-fade-enter-active, .neg-fade-leave-active {
    transition: all 0.25s ease;
}
.neg-fade-enter, .neg-fade-leave-to {
    opacity: 0;
    max-height: 0;
}
.neg-fade-enter-to, .neg-fade-leave {
    opacity: 1;
    max-height: 100px;
}

.negative-prompt-box {
    background: rgba(255, 69, 58, 0.04);
    border: 1px solid rgba(255, 69, 58, 0.15);
    border-radius: 16px;
    padding: 4px 4px;
}

.prompt-modifiers {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 10px;
    padding: 6px 0 0;
}

.modifiers-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.35);
    margin-right: 4px;
}

.modifier-chip {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.75);
    padding: 5px 10px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s ease;
}

.modifier-chip:hover {
    background: rgba(62, 123, 250, 0.1);
    border-color: rgba(62, 123, 250, 0.3);
    color: #fff;
    transform: translateY(-1px);
}

.modifier-chip--active {
    background: rgba(62, 123, 250, 0.18);
    border-color: rgba(62, 123, 250, 0.5);
    color: #fff;
}

.inspiration-chips-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
    justify-content: center;
}

.inspiration-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
    padding: 7px 14px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 500;
    transition: all 0.25s ease;
}

.inspiration-chip:hover {
    background: rgba(62, 123, 250, 0.12);
    border-color: rgba(62, 123, 250, 0.35);
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.inspiration-chip-icon {
    font-size: 1rem;
}

.rtl-text {
    font-family: 'Tajawal', sans-serif !important;
    direction: rtl;
    line-height: 1.4;
}

/* <button> elements don't inherit font-family from an ancestor's !important
   rule the way plain text elements do, since a `button { font-family: ... }`
   reset declares it directly on the element — so rtl-text has to be repeated
   explicitly for button descendants like .mode-pill. */
.rtl-text .mode-pill {
    font-family: 'Tajawal', sans-serif !important;
}

.lang-toggle {
    display: block;
    margin: 20px auto 0;
    padding: 8px 16px;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    font-family: var(--main-font-text), sans-serif;
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
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.04);
    transform: translateY(-1px);
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

.generation-stats-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: 11px;
    background: rgba(62, 123, 250, 0.2);
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-left: 8px;
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
    font-size: 1.1rem;
}

.gallery-nav-button:hover {
    transform: translateY(-1px);
    background: rgba(62, 123, 250, 0.16);
    border-color: rgba(62, 123, 250, 0.35);
}

.gallery-nav-button--ghost {
    width: 38px;
}

/* Thumbnail strip */
.home-thumbnail-strip {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 6px 0 14px;
    margin-bottom: 6px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}

.home-thumbnail-strip::-webkit-scrollbar {
    height: 3px;
}

.home-thumbnail-strip::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.03);
    border-radius: 3px;
}

.home-thumbnail-strip::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
}

.home-thumbnail-item {
    flex: 0 0 120px;
    height: 120px;
    border-radius: 14px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    scroll-snap-align: start;
}

/* Deliberate entrance/reorder animation for new thumbnails (transform/opacity only,
   never layout properties, so it never causes reflow jank). */
.thumb-pop-enter-active {
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.thumb-pop-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
    position: absolute;
}
.thumb-pop-enter,
.thumb-pop-leave-to {
    opacity: 0;
    transform: scale(0.85);
}
.thumb-pop-move {
    transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.home-thumbnail-item:hover {
    transform: translateY(-4px) scale(1.03);
    border-color: rgba(62,123,250,0.4);
    box-shadow: 0 12px 28px rgba(0,0,0,0.4);
}

.home-thumbnail-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.home-thumbnail-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 8px;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
    opacity: 0;
    transition: opacity 0.25s ease;
}

.home-thumbnail-item:hover .home-thumbnail-overlay {
    opacity: 1;
}

.home-thumbnail-prompt {
    color: #fff;
    font-size: 0.7rem;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

@media (max-width: 700px) {
    .home-thumbnail-item {
        flex: 0 0 90px;
        height: 90px;
    }
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
    width: 38px;
    height: 38px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    flex-shrink: 0;
    box-shadow: 0 6px 16px rgba(0,0,0,0.25);
}

.chat-submit:hover:not(:disabled) {
    transform: rotate(10deg) scale(1.08);
    background: #f0f0f0;
    box-shadow: 0 10px 24px rgba(0,0,0,0.35);
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

    .recent-prompts-menu {
        width: 280px;
        right: -60px;
    }
}

.onboarding-banner {
    width: 100%;
    max-width: 900px;
    margin: 0 0 22px;
    padding: 18px 20px;
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(62, 123, 250, 0.18), rgba(108, 92, 231, 0.12));
    border: 1px solid rgba(62, 123, 250, 0.28);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
}

.onboarding-banner-kicker {
    margin: 0 0 4px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.55);
}

.onboarding-banner-title {
    margin: 0 0 6px;
    font-size: 1.05rem;
    color: rgba(255, 255, 255, 0.96);
}

.onboarding-banner-desc {
    margin: 0;
    font-size: 0.86rem;
    color: rgba(255, 255, 255, 0.62);
    max-width: 520px;
}

.onboarding-banner-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.onboarding-primary-btn,
.onboarding-secondary-btn {
    border-radius: 999px;
    padding: 11px 18px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.onboarding-primary-btn {
    background: #3E7BFA;
    color: #fff;
    border-color: rgba(62, 123, 250, 0.5);
}

.onboarding-primary-btn:hover {
    transform: translateY(-1px);
    background: #4d86fb;
}

.onboarding-primary-btn--compact {
    padding: 9px 14px;
    font-size: 0.82rem;
}

.onboarding-secondary-btn {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.14);
}

.onboarding-secondary-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.quick-controls-card .quick-option-group {
    min-width: 0;
}

.quick-model-picker {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.07);
}

.quick-model-picker--empty {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.quick-model-picker-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.model-select {
    min-width: min(100%, 320px);
    flex: 1;
    appearance: none;
    -webkit-appearance: none;
    padding: 11px 38px 11px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.65)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;
    color: rgba(255, 255, 255, 0.95);
    font-family: var(--main-font-text), sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.model-select:hover,
.model-select:focus {
    border-color: rgba(62, 123, 250, 0.45);
    background-color: rgba(62, 123, 250, 0.1);
    outline: none;
    box-shadow: 0 0 0 3px rgba(62, 123, 250, 0.12);
}

.model-select option {
    color: #111;
    background: #fff;
}

.model-select-meta {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
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
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-family: var(--main-font-text), sans-serif;
    color: inherit;
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
    display: block;
    width: 100%;
    height: 260px;
    background-size: cover;
    background-position: center;
    background-color: rgba(255, 255, 255, 0.03);
    border-radius: 24px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    padding: 0;
    font-family: var(--main-font-text), sans-serif;
    color: inherit;
    text-align: left;
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
