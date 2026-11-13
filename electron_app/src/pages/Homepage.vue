<template>
    <div class="home" :class="{ 'home--rtl': isArabic }" :dir="isArabic ? 'rtl' : 'ltr'">
        <div class="home-inner">

            <!-- ── Page header ─────────────────────────────────────────── -->
            <header class="home-header" ref="composerSection">
                <div class="home-header-copy">
                    <p class="home-eyebrow">{{ isArabic ? 'مساحة العمل' : 'Workbench' }}</p>
                    <h1 class="home-title">{{ isArabic ? 'ماذا ستصنع اليوم؟' : 'What will you create today?' }}</h1>
                    <p class="home-subtitle">
                        {{ isArabic
                            ? 'اكتب وصفًا بأي لغة، اختر النموذج والأبعاد، ثم اضغط توليد.'
                            : 'Describe an image in any language, choose a model and canvas, then generate.' }}
                    </p>
                </div>
                <div class="home-header-side">
                    <span class="status-pill" :class="'status-pill--' + statusTone">
                        <span class="status-dot" aria-hidden="true"></span>
                        {{ statusLabel }}
                    </span>
                    <button
                        type="button"
                        class="btn btn-ghost btn-sm lang-btn"
                        @click="toggleLanguage"
                        :lang="isArabic ? 'en' : 'ar'"
                    >
                        {{ isArabic ? 'English' : 'العربية' }}
                    </button>
                </div>
            </header>

            <!-- ── First-run setup ─────────────────────────────────────── -->
            <section v-if="needsOnboarding" class="setup-card" aria-labelledby="setup-title">
                <div class="setup-icon" aria-hidden="true"><AppIcon name="wand" :size="22" /></div>
                <div class="setup-copy">
                    <h2 id="setup-title" class="setup-title">
                        {{ isArabic ? 'ثبّت نموذجًا واحدًا لتبدأ التوليد' : 'Install one model to start generating' }}
                    </h2>
                    <p class="setup-desc">
                        {{ isArabic
                            ? 'سنختار أفضل نموذج لجهازك ونحمّله بنقرة واحدة — بدون أي إعداد.'
                            : 'We pick the best model for this machine and download it in one click — no setup needed.' }}
                    </p>
                </div>
                <div class="setup-actions">
                    <button type="button" class="btn btn-primary" @click="downloadDefaultModel">
                        <AppIcon name="download" :size="16" />
                        {{ isArabic ? 'تحميل النموذج الافتراضي' : 'Download default model' }}
                    </button>
                    <button type="button" class="btn btn-secondary" @click="openPage('ModelStore')">
                        {{ isArabic ? 'اختيار يدوي' : 'Choose manually' }}
                    </button>
                </div>
            </section>

            <p v-if="pendingPrompt" class="pending-note" role="status">
                {{ isArabic
                    ? 'تمت إضافة الطلب. سيتم التوليد تلقائيًا عند جاهزية النموذج والمحرك.'
                    : 'Prompt queued. Generation starts automatically as soon as the model and engine are ready.' }}
            </p>

            <!-- ── Composer + settings ─────────────────────────────────── -->
            <div class="workbench">
                <section class="composer" aria-labelledby="composer-label">
                    <div class="composer-head">
                        <label id="composer-label" class="composer-label" for="prompt-textarea">
                            <AppIcon name="sparkles" :size="15" />
                            {{ jsonMode ? (isArabic ? 'JSON للدفعة' : 'JSON batch') : (isArabic ? 'الموجه' : 'Prompt') }}
                        </label>

                        <div class="composer-head-meta">
                            <div class="recent-wrap" v-if="recentPrompts.length > 0">
                                <button
                                    type="button"
                                    class="meta-btn"
                                    :class="{ 'meta-btn--active': showRecentPrompts }"
                                    @click="showRecentPrompts = !showRecentPrompts"
                                    :aria-expanded="showRecentPrompts ? 'true' : 'false'"
                                    aria-haspopup="true"
                                >
                                    <AppIcon name="clock" :size="14" />
                                    {{ isArabic ? 'الأخيرة' : 'Recent' }}
                                </button>

                                <div v-if="showRecentPrompts" class="recent-menu" v-click-outside="closeRecentPrompts" role="group" aria-label="Recent prompts">
                                    <div class="recent-menu-head">
                                        <span>{{ isArabic ? 'الموجهات الأخيرة' : 'Recent prompts' }}</span>
                                        <button type="button" class="meta-btn" @click="clearRecentPrompts">
                                            {{ isArabic ? 'مسح' : 'Clear' }}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        v-for="(rp, ri) in recentPrompts"
                                        :key="'rp-' + ri"
                                        class="recent-item"
                                        @click="useRecentPrompt(rp)"
                                    >
                                        <AppIcon name="arrow-right" :size="13" />
                                        <span class="recent-item-text" dir="auto">{{ truncatePrompt(rp, 90) }}</span>
                                    </button>
                                </div>
                            </div>

                            <span
                                class="token-meter"
                                :class="tokenMeterClass"
                                role="progressbar"
                                aria-valuemin="0"
                                aria-valuemax="75"
                                :aria-valuenow="clipTokenCount"
                                id="prompt-token-meter"
                                :aria-label="isArabic ? 'عدد رموز CLIP' : 'CLIP token count'"
                                :title="isArabic ? 'عدد رموز CLIP (الحد 75)' : 'CLIP token count (limit 75)'"
                            >
                                <span class="token-meter-bar" aria-hidden="true">
                                    <span class="token-meter-fill" :style="{ width: tokenPercent + '%' }"></span>
                                </span>
                                <span class="token-meter-value">{{ clipTokenCount }}/75</span>
                            </span>
                        </div>
                    </div>

                    <textarea
                        id="prompt-textarea"
                        v-model="promptText"
                        @keydown.enter.exact="onEnterSubmit"
                        @input="onPromptInput"
                        :placeholder="promptPlaceholder"
                        class="prompt-input"
                        :class="{ 'prompt-input--mono': jsonMode, 'rtl-input': isArabic }"
                        rows="3"
                        ref="promptTextarea"
                        aria-describedby="prompt-token-meter"
                        spellcheck="false"
                    ></textarea>

                    <p v-if="jsonMode" class="json-hint" :class="{ 'json-hint--invalid': !jsonBatchInfo.valid }">
                        {{ jsonBatchInfo.valid
                            ? (isArabic
                                ? 'سيدخل ' + jsonBatchInfo.totalPrompts + ' موجه إلى قائمة الانتظار.'
                                : jsonBatchInfo.totalPrompts + ' prompt(s) will be queued.')
                            : (isArabic ? 'أدخل مصفوفة JSON من النصوص.' : 'Enter a JSON array of prompt strings.') }}
                    </p>

                    <div v-if="showNegativePrompt" class="neg-area">
                        <label class="neg-label" for="negative-prompt">
                            {{ isArabic ? 'الموجه السلبي' : 'Negative prompt' }}
                        </label>
                        <textarea
                            id="negative-prompt"
                            v-model="negativePrompt"
                            :placeholder="isArabic ? 'ما الذي لا تريد رؤيته؟ (اختياري)' : 'What should the image avoid? (optional)'"
                            class="prompt-input prompt-input--sm"
                            :class="{ 'rtl-input': isArabic }"
                            rows="2"
                            ref="negPromptTextarea"
                        ></textarea>
                    </div>

                    <!-- Modifier chips while writing -->
                    <div v-if="promptText.trim() && !jsonMode" class="chips">
                        <span class="chips-label">{{ isArabic ? 'إضافات' : 'Refine' }}</span>
                        <button
                            type="button"
                            v-for="mod in promptModifiers"
                            :key="mod.label"
                            class="chip"
                            :class="{ 'chip--active': promptIncludes(mod.label) }"
                            :aria-pressed="promptIncludes(mod.label) ? 'true' : 'false'"
                            @click="toggleModifier(mod)"
                        >
                            {{ isArabic ? mod.labelArabic : mod.label }}
                        </button>
                    </div>

                    <!-- Starter ideas while the composer is empty -->
                    <div v-else-if="!jsonMode" class="chips">
                        <span class="chips-label">{{ isArabic ? 'جرّب' : 'Try' }}</span>
                        <button
                            type="button"
                            v-for="(chip, ci) in inspirationChips"
                            :key="'insp-' + ci"
                            class="chip chip--idea"
                            @click="useInspirationChip(chip)"
                        >
                            <AppIcon name="plus" :size="12" />
                            {{ isArabic ? chip.textAr : chip.text }}
                        </button>
                    </div>

                    <div class="composer-foot">
                        <div class="foot-tools">
                            <button
                                type="button"
                                class="btn btn-ghost btn-sm"
                                :class="{ 'is-active': showNegativePrompt }"
                                @click="toggleNegativePrompt"
                                :aria-pressed="showNegativePrompt ? 'true' : 'false'"
                            >
                                <AppIcon name="circle-slash" :size="15" />
                                {{ isArabic ? 'سلبي' : 'Negative' }}
                            </button>
                            <button
                                type="button"
                                class="btn btn-ghost btn-sm"
                                @click="randomPrompt"
                                :disabled="is_random_prompt_generating"
                            >
                                <AppIcon name="shuffle" :size="15" />
                                {{ is_random_prompt_generating
                                    ? (isArabic ? 'جارٍ الكتابة…' : 'Writing…')
                                    : (isArabic ? 'فاجئني' : 'Surprise me') }}
                            </button>
                            <button
                                type="button"
                                class="btn btn-ghost btn-sm"
                                :class="{ 'is-active': jsonMode }"
                                @click="toggleJsonMode"
                                :aria-pressed="jsonMode ? 'true' : 'false'"
                                :title="isArabic ? 'لصق مصفوفة JSON من الموجهات' : 'Paste a JSON array of prompts'"
                            >
                                <AppIcon name="braces" :size="15" />
                                JSON
                            </button>
                        </div>

                        <div class="foot-actions">
                            <span class="foot-hint" aria-hidden="true">{{ isArabic ? '↵ توليد · ⇧↵ سطر جديد' : '↵ generate · ⇧↵ new line' }}</span>
                            <button
                                type="button"
                                class="btn btn-secondary"
                                @click="addToBatch"
                                :disabled="!promptText.trim() || is_batch_running"
                                :title="isArabic ? 'أضف الطلب الحالي إلى قائمة الدفعة' : 'Add this request to the batch queue'"
                            >
                                <AppIcon name="list-plus" :size="16" />
                                <span class="btn-label">{{ isArabic ? 'إلى الدفعة' : 'Add to batch' }}</span>
                            </button>
                            <button
                                type="button"
                                class="btn btn-primary btn-generate"
                                @click="submitPrompt"
                                :disabled="!canSubmit"
                            >
                                <AppIcon name="send" :size="15" />
                                {{ submitLabel }}
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Settings rail -->
                <aside class="settings" :aria-label="isArabic ? 'إعدادات التوليد' : 'Generation settings'">
                    <div class="settings-block">
                        <div class="settings-label-row">
                            <span class="settings-label" id="home-model-label">{{ isArabic ? 'النموذج' : 'Model' }}</span>
                            <button type="button" class="link-btn" @click="openPage('ModelStore')">
                                {{ isArabic ? 'إدارة' : 'Manage' }}
                            </button>
                        </div>
                        <ModelSelector
                            v-if="availableModels.length > 0"
                            :models="availableModels"
                            v-model="selectedModelId"
                            :is-arabic="isArabic"
                            @change="onModelSelectChange"
                        />
                        <button
                            v-else
                            type="button"
                            class="btn btn-secondary btn-sm btn-block"
                            @click="downloadDefaultModel"
                        >
                            <AppIcon name="download" :size="15" />
                            {{ isArabic ? 'تحميل النموذج الافتراضي' : 'Download default model' }}
                        </button>
                    </div>

                    <div class="settings-block">
                        <span class="settings-label">{{ isArabic ? 'الأبعاد' : 'Canvas' }}</span>
                        <div class="segmented" role="group" :aria-label="isArabic ? 'أبعاد الصورة' : 'Image aspect ratio'">
                            <button
                                type="button"
                                v-for="preset in resolutionPresets"
                                :key="preset.id"
                                class="segmented-btn"
                                :class="{ 'segmented-btn--active': selectedResolutionPresetId === preset.id }"
                                :aria-pressed="selectedResolutionPresetId === preset.id ? 'true' : 'false'"
                                @click="selectedResolutionPresetId = preset.id"
                                :title="resolutionPresetTooltip(preset)"
                            >
                                <span class="ratio-shape" :data-shape="preset.id" aria-hidden="true"></span>
                                {{ resolutionPresetLabel(preset) }}
                            </button>
                        </div>
                    </div>

                    <div class="settings-block">
                        <span class="settings-label">{{ isArabic ? 'الجودة' : 'Quality' }}</span>
                        <div class="segmented" role="group" :aria-label="isArabic ? 'جودة التوليد' : 'Generation quality'">
                            <button
                                type="button"
                                v-for="preset in qualityPresets"
                                :key="preset.id"
                                class="segmented-btn"
                                :class="{ 'segmented-btn--active': selectedQualityPresetId === preset.id }"
                                :aria-pressed="selectedQualityPresetId === preset.id ? 'true' : 'false'"
                                @click="selectedQualityPresetId = preset.id"
                                :title="qualityPresetTooltip(preset)"
                            >
                                {{ qualityPresetLabel(preset) }}
                            </button>
                        </div>
                    </div>

                    <div class="settings-block">
                        <span class="settings-label">{{ isArabic ? 'عدد الصور' : 'Images' }}</span>
                        <div class="segmented segmented--numeric" role="group" :aria-label="isArabic ? 'عدد الصور لكل طلب' : 'Images per request'">
                                <button
                                    type="button"
                                    v-for="count in batchPresetOptions"
                                    :key="count"
                                    class="segmented-btn"
                                    :class="{ 'segmented-btn--active': selectedBatchCount === count }"
                                    :aria-pressed="selectedBatchCount === count ? 'true' : 'false'"
                                    @click="selectedBatchCount = count"
                                    :title="isArabic ? 'توليد ' + count + ' صورة' : 'Generate ' + count + ' image(s)'"
                                >
                                    {{ count }}×
                                </button>
                        </div>
                    </div>

                    <p class="settings-summary">
                        <bdi>{{ canvasDimensions.width }} × {{ canvasDimensions.height }}</bdi>
                        <span aria-hidden="true"> · </span>
                        <bdi>{{ selectedQualitySteps }}</bdi> {{ isArabic ? 'خطوة' : 'steps' }}
                        <span aria-hidden="true"> · </span>
                        <bdi>CFG {{ selectedQualityGuidance }}</bdi>
                        <span aria-hidden="true"> · </span>
                        <bdi>{{ selectedBatchCount }}×</bdi>
                    </p>
                </aside>
            </div>

            <!-- ── Batch queue ─────────────────────────────────────────── -->
            <section v-if="batch_queue.length > 0" class="batch-panel" aria-labelledby="batch-title">
                <div class="batch-head">
                    <div class="batch-head-copy">
                        <h2 id="batch-title" class="section-title">{{ isArabic ? 'قائمة الدفعة' : 'Batch queue' }}</h2>
                        <span class="section-meta">
                            {{ batch_queue.length }} {{ isArabic ? 'طلب' : (batch_queue.length === 1 ? 'request' : 'requests') }}
                            · {{ batchPendingCount }} {{ isArabic ? 'معلق' : 'pending' }}
                        </span>
                    </div>
                    <div class="batch-actions">
                        <button type="button" class="btn btn-secondary btn-sm" @click="clearBatch" :disabled="batchHasActive">
                            <AppIcon name="trash" :size="14" />
                            {{ isArabic ? 'مسح' : 'Clear' }}
                        </button>
                        <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            @click="runBatch"
                            :disabled="batchPendingCount === 0 || batchHasActive"
                        >
                            <AppIcon name="play" :size="14" />
                            {{ batchHasActive ? (isArabic ? 'جارٍ التنفيذ…' : 'Running…') : (isArabic ? 'تشغيل الدفعة' : 'Run batch') }}
                        </button>
                    </div>
                </div>

                <ol class="batch-list">
                    <li v-for="(item, idx) in batch_queue" :key="item.id" class="batch-row">
                        <span class="batch-index">{{ idx + 1 }}</span>
                        <span class="batch-prompt" dir="auto" :title="item.prompt">{{ truncatePrompt(item.prompt, 110) }}</span>
                        <span class="batch-dims">{{ item.img_width }}×{{ item.img_height }} · ×{{ item.num_imgs }}</span>
                        <span class="batch-state" :class="'batch-state--' + (item.state || 'pending')">
                            <span class="batch-state-dot" aria-hidden="true"></span>
                            {{ stateLabel(item.state) }}
                        </span>
                        <button
                            type="button"
                            class="batch-remove"
                            @click="removeFromBatch(item.id)"
                            :disabled="item.state === 'queued' || item.state === 'running'"
                            :aria-label="isArabic ? 'إزالة من الدفعة' : 'Remove from batch'"
                        >
                            <AppIcon name="x" :size="14" />
                        </button>
                    </li>
                </ol>
            </section>

            <!-- ── Samples ─────────────────────────────────────────────── -->
            <HomeSampleStrip :tiles="sampleTiles" :is-arabic="isArabic" @select="useSample" />

            <!-- ── Generations ─────────────────────────────────────────── -->
            <section class="generations" ref="latestSection" aria-labelledby="generations-title">
                <div class="section-head">
                    <div class="section-head-copy">
                        <h2 id="generations-title" class="section-title">
                            {{ isArabic ? 'صورك' : 'Your generations' }}
                            <span v-if="generatedCount > 0" class="section-count">{{ generatedCount }}</span>
                        </h2>
                        <p class="section-meta">
                            {{ isArabic ? 'آخر ما ولّدته في هذا الجهاز.' : 'Everything you have generated on this machine.' }}
                        </p>
                    </div>
                    <div class="section-actions" v-if="generatedCount > 0">
                        <button type="button" class="btn btn-secondary btn-icon btn-sm" @click="scrollHomeGallery(-1)" :aria-label="isArabic ? 'السابق' : 'Previous'">
                            <AppIcon name="chevron-left" :size="16" />
                        </button>
                        <button type="button" class="btn btn-secondary btn-icon btn-sm" @click="scrollHomeGallery(1)" :aria-label="isArabic ? 'التالي' : 'Next'">
                            <AppIcon name="chevron-right" :size="16" />
                        </button>
                    </div>
                </div>

                <div v-if="generatedCount === 0" class="empty-state">
                    <AppIcon name="image" :size="26" />
                    <p class="empty-title">{{ isArabic ? 'لا توجد صور بعد' : 'Nothing generated yet' }}</p>
                    <p class="empty-copy">
                        {{ isArabic
                            ? 'اكتب وصفًا بالأعلى واضغط توليد — ستظهر الصور هنا تلقائيًا.'
                            : 'Describe something above and hit generate — your images will land here.' }}
                    </p>
                </div>

                <div class="gallery-host" :class="{ 'gallery-host--empty': generatedCount === 0 }" v-if="app.is_mounted">
                    <GenerationGallery
                        ref="homeGallery"
                        :app="app"
                        :n_to_keep="10"
                        :menu_items_skip="['use_params_current_page']"
                        :compact="true"
                        :fixed_col_size="280"
                        :enable_selection="true"
                        :on_selection_action="onGallerySelectionAction"
                    ></GenerationGallery>
                </div>
            </section>

            <!-- ── Prompt library & styles ─────────────────────────────── -->
            <section class="library" ref="stylesSection" aria-labelledby="library-title">
                <div class="library-copy">
                    <p class="home-eyebrow">{{ isArabic ? 'مكتبة الموجهات' : 'Prompt library' }}</p>
                    <h2 id="library-title" class="section-title">
                        {{ isArabic ? 'ابدأ من موجه جاهز' : 'Start from a prompt that already works' }}
                    </h2>
                    <p class="library-desc">
                        {{ isArabic
                            ? 'استعرض الموجهات المحفوظة، عدّلها، وارجع إلى التوليد دون مغادرة الشاشة الرئيسية.'
                            : 'Browse saved prompts, remix them, and jump straight back into generation without leaving this screen.' }}
                    </p>
                    <button type="button" class="btn btn-secondary" @click="openPage('PromptLibrary')">
                        <AppIcon name="library" :size="15" />
                        {{ isArabic ? 'فتح المكتبة' : 'Open library' }}
                    </button>
                </div>

                <div class="library-styles">
                    <div class="library-styles-head">
                        <span class="settings-label">{{ isArabic ? 'الأنماط' : 'Styles' }}</span>
                        <span class="section-meta">{{ isArabic ? 'تُضاف إلى الموجه' : 'Appended to your prompt' }}</span>
                    </div>
                    <div class="style-chips">
                        <button
                            type="button"
                            v-for="style in stylePresets"
                            :key="style.name"
                            class="chip chip--style"
                            :class="{ 'chip--active': promptIncludes(style.name) }"
                            :aria-pressed="promptIncludes(style.name) ? 'true' : 'false'"
                            @click="applyStyle(style.name)"
                        >
                            <AppIcon :name="styleIcon(style.name)" :size="13" />
                            {{ styleName(style) }}
                        </button>
                    </div>
                </div>
            </section>

            <!-- ── Tools ───────────────────────────────────────────────── -->
            <section class="tools" ref="toolsSection" aria-labelledby="tools-title">
                <div class="section-head">
                    <div class="section-head-copy">
                        <h2 id="tools-title" class="section-title">{{ isArabic ? 'كل الأدوات' : 'All tools' }}</h2>
                        <p class="section-meta">
                            {{ isArabic ? 'افتح أي وضع للتحويل أو التكبير أو التفريغ.' : 'Open any mode to transform, upscale, or strip out objects.' }}
                        </p>
                    </div>
                </div>
                <HomeToolGrid :groups="toolGroups" @open="openPage" />
            </section>
        </div>
    </div>
</template>

<script>
import { getRandomPrompt, rememberPrompt } from "../prompt_library.js"
import GenerationGallery from "../components/GenerationGallery.vue"
import ModelSelector from "../components/ModelSelector.vue"
import HomeSampleStrip from "../components/home/HomeSampleStrip.vue"
import HomeToolGrid from "../components/home/HomeToolGrid.vue"
import AppIcon from "../components/ui/AppIcon.vue"
import { syncGalleryGroup } from "../generation_broadcast.js"
import { preparePromptForSd, validatePromptLength, countClipContentTokens } from "../prompt_utils.js"
import { loadHomepageBatch, saveHomepageBatch } from "../batch_queue_store.js"
import batchQueueMixin from "../batch_queue_mixin.js"
const { getFallbackDefaultStableDiffusionAsset, sortStableDiffusionModelsBestFirst } = require("../utils/model_selection.js")
const { resolveModelCapability, isFlux2Model } = require("../utils/flux2_catalog.js")
const { generatePromptWithOllama, normalizeGeneratedPrompt } = require("../utils/ollama_prompt_service.js")

const PUBLIC_BASE = (typeof process !== 'undefined' && process.env && process.env.BASE_URL) || '/';

// Maximum number of 700ms retries before giving up on auto-generating a
// queued prompt (≈70s). Prevents an unbounded poll when the model download
// can never complete.
const PENDING_MAX_ATTEMPTS = 100;

const WELCOME_ASSET_REQUIRES = {
    'welcome_anime_tokyo_alley.png': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=80',
    'welcome_glass_pavilion.png': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    'welcome_oil_still_life.png': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
    'welcome_street_food.png': 'https://images.unsplash.com/photo-1511407397940-d57f68e81203?w=600&q=80',
    'welcome_pixel_ramen.png': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=80',
    'welcome_underwater_kelp.png': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    'welcome_samurai_peak.png': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
    'welcome_desert_highway.png': 'https://images.unsplash.com/photo-1511407397940-d57f68e81203?w=600&q=80',
    'welcome_northern_lights.png': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=80',
    'welcome_lavender_fields.png': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    'welcome_cyberpunk_city.png': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
    'welcome_coastal_lighthouse.png': 'https://images.unsplash.com/photo-1511407397940-d57f68e81203?w=600&q=80',
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

// Homepage tool groupings. `id` matches `home_category` in pageMeta.js.
const TOOL_GROUPS = [
    { id: 'main', title: 'Create', titleArabic: 'إنشاء' },
    { id: 'pages', title: 'Manage', titleArabic: 'إدارة' },
    { id: 'tools', title: 'Tools', titleArabic: 'أدوات' },
    { id: 'misc', title: 'More', titleArabic: 'المزيد' },
];

const Home = {
    name: 'Home',
    props: { app: Object },
    mixins: [batchQueueMixin],
    components: { GenerationGallery, ModelSelector, HomeSampleStrip, HomeToolGrid, AppIcon },
    mounted() {
        this.loadRecentPrompts();
        // Keep the composer's inline height in sync with the viewport: a
        // height measured at desktop width clips wrapped text after a resize.
        window.addEventListener('resize', this.handleViewportResize);
        if (this.app.functions.subscribe_generation) {
            this.app.functions.subscribe_generation(() => this.onGenerationComplete());
        }
        // Restore any previously collected batch (survives app restarts).
        this.batch_queue = loadHomepageBatch()
        this.startBatchPolling()
        this.$nextTick(() => {
            this.autoSelectModel();
            this.hydrateGalleryFromLastGeneration();
            this.refreshGalleryStats();
        });
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleViewportResize);
        this.clearPendingGenerationTimer();
        this.stopBatchPolling();
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
            stylePresets: [
                { name: "Cinematic", nameArabic: "سينمائي" },
                { name: "Cyberpunk", nameArabic: "سايبربانك" },
                { name: "Oil Painting", nameArabic: "رسم زيتي" },
                { name: "Anime", nameArabic: "أنمي" },
                { name: "Photography", nameArabic: "تصوير فوتوغرافي" },
                { name: "3D Render", nameArabic: "رسم ثلاثي الأبعاد" },
                { name: "Sketch", nameArabic: "رسم يدوي" },
                { name: "Fantasy", nameArabic: "خيالي" }
            ],
            jsonMode: false,
            jsonBatchInfo: { totalPrompts: 0, totalImages: 0, valid: false },
            promptModifiers: [
                { label: 'Cinematic', labelArabic: 'سينمائي', value: ', cinematic lighting, dramatic composition' },
                { label: 'Ultra Detailed', labelArabic: 'مفصل للغاية', value: ', ultra detailed, 8k, intricate details' },
                { label: 'Warm Lighting', labelArabic: 'إضاءة دافئة', value: ', warm golden hour lighting, soft glow' },
                { label: 'Moody', labelArabic: 'جوي', value: ', moody atmosphere, dramatic shadows, dark' },
                { label: 'Vibrant', labelArabic: 'نابض بالحياة', value: ', vibrant colors, rich saturation, vivid' },
                { label: 'Photorealistic', labelArabic: 'واقعي فوتوغرافي', value: ', photorealistic, hyperdetailed, sharp focus' },
            ],
            inspirationChips: [
                { text: 'Aurora over fjord', textAr: 'شفق فوق مضيق' },
                { text: 'Cyberpunk at night', textAr: 'مدينة سايبربانك ليلاً' },
                { text: 'Lavender fields', textAr: 'حقول الخزامى' },
                { text: 'Coastal storm', textAr: 'عاصفة ساحلية' },
                { text: 'Samurai at dawn', textAr: 'ساموراي عند الفجر' },
                { text: 'Desert highway', textAr: 'طريق صحراوي' },
            ],
            welcomeTiles: WELCOME_CAROUSEL_META.map((sample) => ({
                assetKey: sample.assetKey,
                src: resolveWelcomeAssetUrl(sample.assetKey),
                prompt: sample.prompt,
            })),
            pendingPrompt: '',
            pendingGenerationReason: '',
            pendingGenerationTimer: null,
            pendingGenerationAttempts: 0,
            selectedResolutionPresetId: 'square',
            selectedQualityPresetId: 'balanced',
            selectedBatchCount: 1,
            is_random_prompt_generating: false,
            // The gallery shows its images itself, but it exposes its groups
            // through refs (not reactive state). A computed reading `$refs`
            // caches once and then never updates, so the count that drives the
            // empty state lives in data and is refreshed explicitly.
            generatedCount: 0,
            resolutionPresets: [
                { id: 'square', label: '1:1', labelArabic: 'مربع' },
                { id: 'portrait', label: '4:5', labelArabic: 'عمودي' },
                { id: 'landscape', label: '16:9', labelArabic: 'عريض' },
            ],
            qualityPresets: [
                { id: 'fast', label: 'Fast', labelArabic: 'سريع', num_steps: 20, guidance_scale: 6.5, scheduler: 'ddim' },
                { id: 'balanced', label: 'Balanced', labelArabic: 'متوازن', num_steps: 25, guidance_scale: 7.5, scheduler: 'karras' },
                { id: 'detail', label: 'Detailed', labelArabic: 'تفصيلي', num_steps: 50, guidance_scale: 8.5, scheduler: 'karras', max_steps: 100 },
            ],
            batchPresetOptions: [1, 2, 4],
        };
    },
    methods: {
        // ── Navigation & layout ──────────────────────────────────────────
        toggleLanguage() {
            if (this.app && this.app.app_state) {
                this.app.app_state.isArabic = !this.app.app_state.isArabic;
            }
        },
        openPage(pageId) {
            if (this.app && this.app.functions && this.app.functions.switch_page) {
                this.app.functions.switch_page(pageId);
            }
        },
        getSectionElement(refName) {
            const ref = this.$refs[refName];
            if (!ref) return null;
            if (Array.isArray(ref)) return ref[0] || null;
            return ref.$el || ref;
        },
        scrollToHomeSection(refName) {
            const el = this.getSectionElement(refName);
            if (!el || !el.scrollIntoView) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        focusPrompt() {
            const el = this.$refs.promptTextarea;
            if (el) el.focus();
        },
        scrollToComposer() {
            this.scrollToHomeSection('composerSection');
            this.$nextTick(this.focusPrompt);
        },

        // ── Model & generation presets ───────────────────────────────────
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
        onModelSelectChange() {
            this.autoSelectModel();
        },
        resolutionPresetLabel(preset) {
            return this.isArabic ? (preset.labelArabic || preset.label) : preset.label;
        },
        resolutionPresetTooltip(preset) {
            const names = this.isArabic
                ? { square: 'مربع 1:1', portrait: 'عمودي 4:5', landscape: 'عريض 16:9' }
                : { square: 'Square 1:1', portrait: 'Portrait 4:5', landscape: 'Landscape 16:9' };
            return names[preset.id] || preset.label;
        },
        qualityPresetLabel(preset) {
            return this.isArabic ? (preset.labelArabic || preset.label) : preset.label;
        },
        qualityPresetTooltip(preset) {
            const steps = preset.num_steps;
            return this.isArabic
                ? preset.labelArabic + ' — ' + steps + ' خطوة، توجيه ' + preset.guidance_scale
                : preset.label + ' — ' + steps + ' steps, guidance ' + preset.guidance_scale;
        },
        getSelectedModelAsset() {
            return this.availableModels.find((model) => model.id === this.selectedModelId) || this.availableModels[0] || getFallbackDefaultStableDiffusionAsset();
        },
        isXLModelAsset(model) {
            const sdType = String((model && model.model_meta_data && model.model_meta_data.sd_type) || '').toLowerCase();
            return sdType.includes('xl');
        },
        getSelectedQualityPreset() {
            const preset = this.qualityPresets.find((p) => p.id === this.selectedQualityPresetId) || this.qualityPresets[1];
            // If 'detailed' is selected, use 85% of max_steps
            if (preset.id === 'detail' && preset.max_steps) {
                return { ...preset, num_steps: Math.round(preset.max_steps * 0.85) };
            }
            return preset;
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

        // ── Readiness ────────────────────────────────────────────────────
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

        // ── Pending prompt (waits for model + backend) ───────────────────
        clearPendingGenerationTimer() {
            if (this.pendingGenerationTimer) {
                clearInterval(this.pendingGenerationTimer);
                this.pendingGenerationTimer = null;
            }
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
                // Bound the retry loop: if the model download can never
                // complete (server down, catalog reject, disk error) this
                // must NOT poll forever. Give up after PENDING_MAX_ATTEMPTS
                // (~70s) and surface a toast so the user can act.
                this.pendingGenerationAttempts = 0;
                this.pendingGenerationTimer = setInterval(() => {
                    this.pendingGenerationAttempts += 1;
                    if (this.pendingGenerationAttempts >= PENDING_MAX_ATTEMPTS) {
                        this.clearPendingGenerationTimer();
                        if (this.pendingPrompt) {
                            const stuck = this.pendingPrompt;
                            this.pendingPrompt = '';
                            this.pendingGenerationReason = '';
                            this.app.show_toast(this.app.app_state.isArabic
                                ? 'تعذر تجهيز النموذج تلقائيًا. حاول من صفحة النماذج.'
                                : 'Could not auto-download the model. Try the Models page.');
                            console.warn('[home] Gave up auto-generating prompt after ' + PENDING_MAX_ATTEMPTS + ' attempts:', stuck);
                        }
                        return;
                    }
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

        // ── Generation ───────────────────────────────────────────────────
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
                    ? 'تمت ترجمة الموجه إلى الإنجليزية لتحسين جودة التوليد.'
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
        onEnterSubmit(event) {
            // Never submit while an IME (Arabic, Japanese, Chinese…) is still
            // composing — Enter there means "commit the candidate".
            if (event && (event.isComposing || event.keyCode === 229)) return;
            this.submitPrompt();
        },
        submitPrompt() {
            let prompt = this.promptText.trim();
            if (!prompt) return;

            if (this.jsonMode) {
                this.submitJsonBatch();
                return;
            }

            if (!this.ensureModelReadyForGeneration() || !this.isBackendReady() || !this.$refs.homeGallery) {
                this.queuePromptForAutoGeneration(prompt, this.isBackendReady() ? 'model' : 'backend');
                return;
            }
            this.promptText = '';
            if (!this.generatePrompt(prompt)) {
                this.queuePromptForAutoGeneration(prompt, 'retry');
            }
        },

        // ── Token counter & textarea ─────────────────────────────────────
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
            el.style.height = Math.min(el.scrollHeight, 260) + 'px';
        },
        handleViewportResize() {
            this.$nextTick(this.autoResizeTextarea);
        },
        toggleNegativePrompt() {
            this.showNegativePrompt = !this.showNegativePrompt;
            if (this.showNegativePrompt) {
                this.$nextTick(() => {
                    const el = this.$refs.negPromptTextarea;
                    if (el) el.focus();
                });
            }
        },

        // ── Recent prompts ───────────────────────────────────────────────
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
        closeRecentPrompts() {
            this.showRecentPrompts = false;
        },
        useRecentPrompt(prompt) {
            this.setPrompt(prompt);
        },

        // ── Prompt helpers ───────────────────────────────────────────────
        setPrompt(prompt) {
            this.promptText = prompt;
            this.updateClipTokenCount();
            this.$nextTick(() => {
                this.autoResizeTextarea();
                this.focusPrompt();
            });
        },
        truncatePrompt(text, maxLen) {
            if (!text) return '';
            return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
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
            this.setPrompt(this.isArabic ? chip.textAr : chip.text);
        },
        applyStyle(styleName) {
            if (this.promptIncludes(styleName)) {
                this.toggleModifier({ label: styleName, value: ', ' + styleName });
                return;
            }
            this.promptText = this.promptText.trim() ? `${this.promptText}, ${styleName}` : styleName;
            this.updateClipTokenCount();
        },
        styleName(style) {
            return this.isArabic ? (style.nameArabic || style.name) : style.name;
        },
        styleIcon(name) {
            const icons = {
                Cinematic: 'film',
                Cyberpunk: 'zap',
                'Oil Painting': 'brush',
                Anime: 'sparkles',
                Photography: 'camera',
                '3D Render': 'box',
                Sketch: 'pencil',
                Fantasy: 'moon',
            };
            return icons[name] || 'sparkles';
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
                    locale: this.isArabic ? 'ar' : 'en',
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

        // ── JSON batch mode ──────────────────────────────────────────────
        toggleJsonMode() {
            this.jsonMode = !this.jsonMode;
            this.parseJsonBatch();
            this.$nextTick(this.autoResizeTextarea);
        },
        parseJsonBatch() {
            let totalPrompts = 0;
            let valid = false;
            try {
                const parsed = JSON.parse(this.promptText || '[]');
                if (Array.isArray(parsed)) {
                    const prompts = parsed.filter(p => typeof p === 'string' && String(p).trim().length > 0);
                    totalPrompts = prompts.length;
                    valid = totalPrompts > 0;
                }
            } catch (e) {
                valid = false;
            }
            this.jsonBatchInfo = {
                totalPrompts,
                totalImages: totalPrompts,
                valid,
            };
        },
        submitJsonBatch() {
            let prompts = [];
            try {
                const parsed = JSON.parse(this.promptText || '[]');
                if (Array.isArray(parsed)) {
                    prompts = parsed.map(p => String(p).trim()).filter(Boolean);
                }
            } catch (e) {
                this.app.show_toast(this.isArabic
                    ? 'صيغة JSON غير صالحة — أدخل مصفوفة من الموجهات النصية.'
                    : 'Invalid JSON — enter an array of prompt strings.');
                return;
            }

            if (prompts.length === 0) {
                this.app.show_toast(this.isArabic
                    ? 'لا توجد موجهات صالحة في JSON.'
                    : 'No valid prompts in the JSON array.');
                return;
            }

            if (!this.ensureModelReadyForGeneration() || !this.isBackendReady() || !this.$refs.homeGallery) {
                // Do NOT queue the raw JSON text as a pending prompt — the
                // auto-retry path would generate an image from the JSON string
                // literal. Tell the user to retry once the model/backend is ready.
                this.app.show_toast(this.isArabic
                    ? 'النموذج أو المحرك غير جاهز بعد. حاول مرة أخرى بعد التجهيز.'
                    : 'Model/backend not ready yet. Try again once it is.');
                return;
            }

            this.promptText = '';
            this.jsonMode = false;
            for (const p of prompts) {
                this.generatePrompt(p);
            }
            this.app.show_toast(this.isArabic
                ? ('تمت إضافة ' + prompts.length + ' موجه إلى قائمة الانتظار.')
                : (prompts.length + ' prompts queued for generation.'));
        },

        // ── Batch queue ──────────────────────────────────────────────────
        addToBatch() {
            if (this.is_batch_running) return;
            const prompt = this.promptText.trim();
            if (!prompt) {
                this.app.show_toast(this.isArabic ? 'اكتب موجهًا أولاً.' : 'Write a prompt first.');
                return;
            }

            const selectedAsset = this.getSelectedModelAsset();
            if (isFlux2Model(selectedAsset)) {
                this.app.show_toast(this.isArabic
                    ? 'FLUX.2 لا يدعمه محرك التوليد الحالي. اختر نموذج SD.'
                    : 'FLUX.2 is not supported by the current generation backend. Pick an SD model.');
                return;
            }

            const modelPath = this.app.assets_manager.get_downloaded_asset_path(this.selectedModelId);
            if (!modelPath) {
                this.app.show_toast(this.isArabic
                    ? 'حمّل النموذج أولاً قبل إضافة الطلب إلى الدفعة.'
                    : 'Download the model first before adding to the batch.');
                return;
            }

            const prepared = preparePromptForSd(prompt, this.isArabic);
            const validation = validatePromptLength(prepared.prompt, this.isArabic);
            if (!validation.valid) {
                this.app.show_toast(validation.message);
                return;
            }

            const quickOptions = this.buildQuickGenerationOptions();

            const item = {
                id: Math.random().toString(),
                prompt: prompt,
                preparedPrompt: prepared.prompt,
                negative_prompt: this.negativePrompt || '',
                model_id: this.selectedModelId,
                model_tdict_path: modelPath,
                img_width: quickOptions.img_width,
                img_height: quickOptions.img_height,
                num_imgs: quickOptions.num_imgs,
                num_steps: quickOptions.num_steps,
                guidance_scale: quickOptions.guidance_scale,
                scheduler: quickOptions.scheduler,
                applet_name: 'txt2img',
                state: 'pending',
                group_id: null,
            };

            this.batch_queue.push(item);

            const n = this.batch_queue.length;
            this.app.show_toast(this.isArabic
                ? ('أُضيف إلى الدفعة (' + this.batchCountLabel(n) + '). اضغط "تشغيل الدفعة" لبدء التوليد بالتسلسل.')
                : ('Added to batch (' + this.batchCountLabel(n) + '). Press "Run batch" to generate sequentially.'));
        },
        submitBatchItem(item, groupId) {
            const genOptions = {
                model_tdict_path: item.model_tdict_path,
                prompt: item.preparedPrompt,
                negative_prompt: item.negative_prompt,
                img_width: item.img_width,
                img_height: item.img_height,
                num_imgs: item.num_imgs,
                // Gallery re-runs carry the original seed so the FIFO job
                // reproduces the selected generation; form-added items get a
                // fresh random seed as before.
                seed: (item.seed !== undefined && item.seed !== null && item.seed >= 0) ? item.seed : Math.floor(Math.random() * 1000000),
                guidance_scale: item.guidance_scale,
                num_steps: item.num_steps,
                scheduler: item.scheduler,
                applet_name: 'txt2img',
            };
            const rawFormOptions = {
                prompt: item.prompt,
                seed: genOptions.seed,
                selected_sd_model: item.model_id,
                num_imgs: item.num_imgs,
            };
            this.app.stable_diffusion_manager.add_job(genOptions, rawFormOptions, this.$refs.homeGallery, groupId);
        },
        getBatchGallery() {
            return this.$refs.homeGallery;
        },
        // Gallery multi-select "Re-run": map a selected image's stored params
        // (saved by SDManager per job) onto the homepage batch-item shape so
        // the shared FIFO runBatch machinery picks it up unchanged.
        buildBatchItemFromImage(img) {
            const p = img.params || {};
            const prompt = p.prompt || img.description || '';
            // The Homepage composer is txt2img-only. Images generated on the
            // img2img/inpaint/upscaler applet pages can appear here (last
            // generation hydration) — re-running those through the txt2img
            // path would silently drop their input-image context, so skip
            // them; their own pages' galleries can re-run them correctly.
            if (!prompt || !p.model_tdict_path || (p.applet_name && p.applet_name !== 'txt2img')) return null;
            return {
                id: Math.random().toString(),
                prompt: prompt,
                preparedPrompt: prompt,
                negative_prompt: p.negative_prompt || '',
                model_id: (p.raw_form_options && p.raw_form_options.selected_sd_model) || '',
                model_tdict_path: p.model_tdict_path,
                img_width: p.img_width,
                img_height: p.img_height,
                num_imgs: 1,
                num_steps: p.num_steps,
                guidance_scale: p.guidance_scale,
                scheduler: p.scheduler,
                applet_name: p.applet_name || 'txt2img',
                seed: (p.seed !== undefined && p.seed !== null && p.seed >= 0) ? p.seed : undefined,
                state: 'pending',
                group_id: null,
            };
        },
        persistBatchQueue(queue) {
            saveHomepageBatch(queue);
        },

        // ── Samples, thumbnails, gallery ────────────────────────────────
        sampleLabel(img, idx) {
            const labels = this.isArabic
                ? ['أنمي', 'عمارة', 'رسم زيتي', 'طعام', 'بكسل', 'تحت الماء', 'ساموراي', 'صحراء', 'شفق', 'لافندر', 'سايبربانك', 'منارة']
                : ['Anime', 'Architecture', 'Oil painting', 'Street food', 'Pixel art', 'Underwater', 'Samurai', 'Desert', 'Aurora', 'Lavender', 'Cyberpunk', 'Lighthouse'];
            return labels[idx] || img.assetKey;
        },
        useSample(prompt) {
            if (!prompt) return;
            this.setPrompt(prompt);
            this.scrollToComposer();
        },
        hydrateGalleryFromLastGeneration() {
            const last = this.app.app_state.last_gallery_group;
            if (!last || !this.$refs.homeGallery) return;
            if (this.$refs.homeGallery.groups_with_non_zero_imgs.length > 0) return;
            syncGalleryGroup(this.$refs.homeGallery, last, null);
        },
        refreshGalleryStats() {
            const gallery = this.$refs.homeGallery;
            const groups = (gallery && gallery.groups_with_non_zero_imgs) || [];
            let count = 0;
            for (const group of groups) {
                for (const image of (group.imgs || [])) {
                    if (image.image_url && image.image_url !== 'ERROR') count += 1;
                }
            }
            this.generatedCount = count;
        },
        onGenerationComplete() {
            this.refreshGalleryStats();
            this.$nextTick(() => {
                if (this.app.current_selected_tab === 'Homepage') {
                    this.scrollToGallery();
                }
            });
        },
        scrollToGallery() {
            this.scrollToHomeSection('latestSection');
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

        // ── Onboarding & tools ──────────────────────────────────────────
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
        all_icons(category) {
            let ret = []
            let items = (this.app.all_pages_ready) ? this.app.$refs.router.all_applet_items : [];
            for (let item of items) {
                if (item.home_category == category)
                    ret.push(item)
            }
            return ret;
        }
    },
    watch: {
        promptText() {
            this.updateClipTokenCount();
            if (this.jsonMode) {
                this.parseJsonBatch();
            }
        },
        availableModels() {
            this.autoSelectModel();
            this.tryRunPendingPrompt();
        },
        selectedModelId() {
            this.tryRunPendingPrompt();
        },
        'app.is_mounted': {
            handler: function (newValue) {
                if (newValue) {
                    this.autoSelectModel();
                    this.tryRunPendingPrompt();
                    this.$nextTick(this.refreshGalleryStats);
                }
            }
        },
        'app.current_selected_tab'(tab) {
            // Stats are read from the gallery through refs; refresh on return.
            if (tab === 'Homepage') {
                this.$nextTick(this.refreshGalleryStats);
            }
        },
        'app.stable_diffusion_manager.is_ready': {
            handler: function () {
                this.tryRunPendingPrompt();
            }
        },
        'app.assets_manager.downloading': {
            handler: function () {
                this.tryRunPendingPrompt();
            },
            deep: true
        },
    },
    computed: {
        isArabic() {
            return !!(this.app && this.app.app_state && this.app.app_state.isArabic);
        },
        promptPlaceholder() {
            if (this.jsonMode) {
                return this.isArabic ? '["موجه أول", "موجه ثاني"]' : '["first prompt", "second prompt"]';
            }
            return this.isArabic ? 'صف ما تريد رؤيته…' : 'Describe what you want to see…';
        },
        sampleTiles() {
            return this.welcomeTiles.map((tile, idx) => ({
                key: tile.assetKey || ('welcome-' + idx),
                src: tile.src,
                prompt: tile.prompt,
                label: this.sampleLabel(tile, idx),
            }));
        },
        tokenMeterClass() {
            if (this.clipTokenCount > 68) return 'token-meter--danger';
            if (this.clipTokenCount > 55) return 'token-meter--warn';
            return 'token-meter--ok';
        },
        tokenPercent() {
            return Math.min(100, Math.round((this.clipTokenCount / 75) * 100));
        },
        canSubmit() {
            if (!this.promptText.trim()) return false;
            if (this.jsonMode) return this.jsonBatchInfo.valid;
            return true;
        },
        submitLabel() {
            if (this.jsonMode) {
                return this.jsonBatchInfo.valid
                    ? (this.isArabic ? 'أضف ' + this.jsonBatchInfo.totalPrompts + ' للدفعة' : 'Queue ' + this.jsonBatchInfo.totalPrompts)
                    : (this.isArabic ? 'JSON غير صالح' : 'Invalid JSON');
            }
            return this.isArabic ? 'توليد' : 'Generate';
        },
        statusTone() {
            if (!this.app.is_mounted) return 'idle';
            if (this.availableModels.length === 0) return 'warn';
            return this.isBackendReady() ? 'ready' : 'idle';
        },
        statusLabel() {
            if (!this.app.is_mounted) return this.isArabic ? 'جارٍ التحميل…' : 'Loading…';
            if (this.availableModels.length === 0) return this.isArabic ? 'لا يوجد نموذج' : 'No model installed';
            if (this.isBackendReady()) return this.isArabic ? 'جاهز للتوليد' : 'Ready to generate';
            return this.isArabic ? 'جارٍ تجهيز المحرك…' : 'Starting engine…';
        },
        canvasDimensions() {
            return this.getSelectedResolutionDimensions();
        },
        selectedQualitySteps() {
            return this.getSelectedQualityPreset().num_steps;
        },
        selectedQualityGuidance() {
            return this.getSelectedQualityPreset().guidance_scale;
        },
        availableModels() {
            if (!this.app.is_mounted || !this.app.assets_manager) return [];
            return sortStableDiffusionModelsBestFirst(
                Object.values(this.app.assets_manager.all_avail_assets || {}).filter(
                    m => m.model_meta_data && resolveModelCapability(m) === 'runnable'
                )
            );
        },
        needsOnboarding() {
            if (this.availableModels.length > 0) return false;
            const settings = this.app && this.app.app_state && this.app.app_state.app_data && this.app.app_state.app_data.settings;
            return !(settings && settings.onboarding_completed);
        },
        toolGroups() {
            return TOOL_GROUPS
                .map(group => ({
                    id: group.id,
                    title: this.isArabic ? group.titleArabic : group.title,
                    items: this.all_icons(group.id).map(item => ({
                        id: item.id,
                        title: item.text || item.title || item.id,
                        description: item.description || '',
                        img_icon: item.img_icon || null,
                    })),
                }))
                .filter(group => group.items.length > 0);
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
/* ==========================================================================
   Homepage workbench
   One vertical rhythm (var(--space-*)), one radius scale, one focus treatment.
   No arbitrary pixel values below the surface tokens, and no colour literals
   outside the scrim on top of photography.
   ========================================================================== */

.home {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    background-color: var(--color-bg);
    font-family: var(--font-family-sans);
    color: var(--color-text-primary);
}

.home--rtl {
    font-family: var(--font-family-arabic);
}

.home-inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-xxl);
    max-width: 1160px;
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-xl) var(--space-xxxl);
}

/* ── Header ──────────────────────────────────────────────────────────── */

.home-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-lg);
    scroll-margin-top: var(--space-lg);
}

.home-header-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
}

.home-eyebrow {
    margin: 0;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
}

.home-title {
    margin: 0;
    font-size: var(--font-size-display);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
}

.home-subtitle {
    margin: 0;
    max-width: 56ch;
    font-size: var(--font-size-base);
    line-height: var(--line-height-relaxed);
    color: var(--color-text-secondary);
}

.home-header-side {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
    padding-top: var(--space-xs);
}

.lang-btn {
    font-family: var(--font-family-arabic);
    color: var(--color-text-tertiary);
}

.status-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 6px var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background-color: var(--color-bg-elevated);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background-color: var(--color-text-placeholder);
}

.status-pill--ready .status-dot {
    background-color: var(--color-success);
}

.status-pill--warn .status-dot {
    background-color: var(--color-warning);
}

/* ── Setup card ──────────────────────────────────────────────────────── */

.setup-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-lg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-bg-elevated);
}

.setup-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: var(--radius-lg);
    background-color: var(--color-primary-light);
    color: var(--color-primary);
}

.setup-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
}

.setup-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
}

.setup-desc {
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    color: var(--color-text-secondary);
}

.setup-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
}

/* ── Workbench grid ──────────────────────────────────────────────────── */

.workbench {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 304px;
    gap: var(--space-md);
    align-items: start;
}

/* ── Composer ────────────────────────────────────────────────────────── */

.composer {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-lg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-xl);
    background-color: var(--card-bg);
    transition: border-color var(--transition-fast);
}

.composer:focus-within {
    border-color: var(--color-border-strong);
}

.composer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
}

.composer-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    cursor: text;
}

.composer:focus-within .composer-label {
    color: var(--color-text-primary);
}

.composer:focus-within .composer-label .app-icon {
    color: var(--color-primary);
}

.composer-head-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.recent-wrap {
    position: relative;
}

.meta-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px var(--space-xs);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-tertiary);
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: color var(--transition-fast), background-color var(--transition-fast);
}

.meta-btn:hover,
.meta-btn--active {
    color: var(--color-text-primary);
    background-color: var(--color-bg-hover);
}

.meta-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary-light), 0 0 0 1px var(--color-primary);
}

.recent-menu {
    position: absolute;
    top: calc(100% + var(--space-xs));
    inset-inline-end: 0;
    z-index: 30;
    width: min(420px, 70vw);
    max-height: 320px;
    overflow-y: auto;
    padding: var(--space-xxs);
    border: 1px solid var(--dropdown-border);
    border-radius: var(--radius-lg);
    background-color: var(--dropdown-bg);
    box-shadow: var(--shadow-lg);
}

.recent-menu-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-xxs) var(--space-xs);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.recent-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    width: 100%;
    padding: var(--space-xs);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: var(--font-size-sm);
    text-align: start;
    cursor: pointer;
}

.recent-item:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text-primary);
}

.recent-item:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary) inset;
}

.recent-item-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Token meter */

.token-meter {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-tertiary);
}

.token-meter-bar {
    display: block;
    width: 56px;
    height: 4px;
    border-radius: var(--radius-full);
    background-color: var(--color-border);
    overflow: hidden;
}

.token-meter-fill {
    display: block;
    height: 100%;
    border-radius: var(--radius-full);
    background-color: var(--color-text-placeholder);
    transition: width var(--transition-normal), background-color var(--transition-normal);
}

.token-meter--warn .token-meter-fill {
    background-color: var(--color-warning);
}

.token-meter--warn .token-meter-value {
    color: var(--color-warning);
}

.token-meter--danger .token-meter-fill {
    background-color: var(--color-error);
}

.token-meter--danger .token-meter-value {
    color: var(--color-error);
}

/* Prompt input */

.prompt-input {
    width: 100%;
    min-height: 108px;
    max-height: 260px;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-lg);
    background-color: var(--input-bg);
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: var(--font-size-lg);
    line-height: var(--line-height-relaxed);
    resize: vertical;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.prompt-input::placeholder {
    color: var(--color-text-placeholder);
}

.prompt-input:focus-visible {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-light);
}

.prompt-input--sm {
    min-height: 64px;
    max-height: 160px;
    font-size: var(--font-size-base);
}

.prompt-input--mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
}

.rtl-input {
    direction: rtl;
    text-align: right;
}

.neg-area {
    display: flex;
    flex-direction: column;
    gap: var(--space-xxs);
}

.neg-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.04em;
    color: var(--color-text-tertiary);
}

.json-hint {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
}

.json-hint--invalid {
    color: var(--color-warning);
}

/* Chips */

.chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
}

.chips-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-placeholder);
    margin-inline-end: var(--space-xxs);
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background-color: transparent;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: var(--font-size-sm);
    line-height: 1;
    cursor: pointer;
    transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast);
}

.chip:hover {
    border-color: var(--color-border-strong);
    background-color: var(--color-bg-hover);
    color: var(--color-text-primary);
}

.chip:focus-visible {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 2px var(--color-primary-light);
}

.chip--active {
    border-color: var(--color-primary);
    background-color: var(--color-primary-light);
    color: var(--color-text-primary);
}

.chip--idea {
    color: var(--color-text-tertiary);
}

.chip--style {
    height: 30px;
}

/* Composer footer */

.composer-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    flex-wrap: wrap;
    padding-top: var(--space-xs);
    border-top: 1px solid var(--color-border);
}

.foot-tools {
    display: flex;
    align-items: center;
    gap: var(--space-xxs);
    flex-wrap: wrap;
}

.foot-tools .btn.is-active {
    background-color: var(--color-primary-light);
    color: var(--color-text-primary);
}

.foot-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-inline-start: auto;
}

.foot-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-placeholder);
    white-space: nowrap;
}

.btn-generate {
    min-width: 128px;
    font-weight: var(--font-weight-semibold);
}

.btn-block {
    width: 100%;
}

/* ── Settings rail ───────────────────────────────────────────────────── */

.settings {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding: var(--space-lg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-xl);
    background-color: var(--card-bg);
}

.settings-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.settings-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
}

.settings-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
}

.link-btn {
    padding: 0;
    border: none;
    background: none;
    color: var(--color-text-tertiary);
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
}

.link-btn:hover {
    color: var(--color-text-primary);
}

.link-btn:focus-visible {
    outline: none;
    border-radius: var(--radius-xs);
    box-shadow: 0 0 0 2px var(--color-primary);
}

.segmented--numeric {
    direction: ltr;
}

.segmented {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-md);
    background-color: var(--color-bg-hover);
}

.segmented-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 28px;
    padding: 0 var(--space-xxs);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: var(--font-size-sm);
    white-space: nowrap;
    cursor: pointer;
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.segmented-btn:hover {
    color: var(--color-text-primary);
}

.segmented-btn--active {
    background-color: var(--color-bg-elevated);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-sm);
}

.segmented-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary);
}

.ratio-shape {
    display: inline-block;
    border: 1.5px solid currentColor;
    border-radius: 2px;
    opacity: 0.75;
}

.ratio-shape[data-shape='square'] {
    width: 10px;
    height: 10px;
}

.ratio-shape[data-shape='portrait'] {
    width: 8px;
    height: 11px;
}

.ratio-shape[data-shape='landscape'] {
    width: 12px;
    height: 8px;
}

/* The model badge carries the model family; the `float16` meta line is
   technical detail that does not fit (and is not actionable) in this rail.
   Long model names wrap rather than truncate mid-word. */
.settings ::v-deep .model-selector-trigger-meta {
    display: none;
}

.settings ::v-deep .model-selector-trigger-title {
    white-space: normal;
    line-height: var(--line-height-tight);
}

.settings-summary {
    margin: 0;
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-tertiary);
}

/* ── Batch queue ─────────────────────────────────────────────────────── */

.batch-panel {
    border: 1px solid var(--card-border);
    border-radius: var(--radius-xl);
    background-color: var(--card-bg);
    overflow: hidden;
}

.batch-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border);
}

.batch-head-copy {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
    min-width: 0;
}

.batch-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
}

.batch-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.batch-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto auto 28px;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-md);
}

.batch-row + .batch-row {
    border-top: 1px solid var(--color-border);
}

.batch-index {
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-placeholder);
    text-align: center;
}

.batch-prompt {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
}

.batch-dims {
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-tertiary);
    white-space: nowrap;
}

.batch-state {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    white-space: nowrap;
}

.batch-state-dot {
    width: 5px;
    height: 5px;
    border-radius: var(--radius-full);
    background-color: var(--color-text-placeholder);
}

.batch-state--queued .batch-state-dot,
.batch-state--running .batch-state-dot {
    background-color: var(--color-primary);
}

.batch-state--done .batch-state-dot {
    background-color: var(--color-success);
}

.batch-state--error .batch-state-dot {
    background-color: var(--color-error);
}

.batch-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-placeholder);
    cursor: pointer;
}

.batch-remove:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
    color: var(--color-text-primary);
}

.batch-remove:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.batch-remove:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary);
}

/* ── Section primitives ──────────────────────────────────────────────── */

.section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-md);
}

.section-head-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space-xxs);
    min-width: 0;
}

.section-title {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
}

.section-meta {
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    color: var(--color-text-tertiary);
}

.section-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: var(--radius-full);
    background-color: var(--color-bg-hover);
    color: var(--color-text-tertiary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    font-variant-numeric: tabular-nums;
}

.section-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
}

/* ── Generations ─────────────────────────────────────────────────────── */

.generations {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    scroll-margin-top: var(--space-lg);
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xxl) var(--space-lg);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-xl);
    color: var(--color-text-tertiary);
    text-align: center;
}

.empty-title {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
}

.empty-copy {
    margin: 0;
    max-width: 44ch;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    color: var(--color-text-tertiary);
}

.gallery-host {
    min-width: 0;
}

/* The gallery component carries its own illustration-based empty screen and a
   320px min-height. The page already renders a clearer empty state above it,
   so collapse the redundant one while there is nothing to show. The gallery
   must stay mounted either way: jobs attach their output through its ref. */
.gallery-host--empty ::v-deep .gallery-empty {
    display: none;
}

.gallery-host--empty ::v-deep .generation_gallery_div--compact {
    min-height: 0;
}

/* ── Library & styles ────────────────────────────────────────────────── */

.library {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: var(--space-xl);
    align-items: center;
    padding: var(--space-xl);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-xl);
    background-color: var(--card-bg);
    scroll-margin-top: var(--space-lg);
}

.library-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-xs);
    min-width: 0;
}

.library-desc {
    margin: 0 0 var(--space-xs);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
    color: var(--color-text-secondary);
}

.library-styles {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    min-width: 0;
}

.library-styles-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-xs);
}

.style-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
}

/* ── Tools ───────────────────────────────────────────────────────────── */

.tools {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    scroll-margin-top: var(--space-lg);
}

/* ── Pending note ────────────────────────────────────────────────────── */

.pending-note {
    margin: 0;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-lg);
    background-color: var(--color-primary-light);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
}

/* ── Responsive ──────────────────────────────────────────────────────── */

@media (max-width: 1024px) {
    .workbench {
        grid-template-columns: minmax(0, 1fr) 272px;
    }

    .library {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (max-width: 880px) {
    .home-inner {
        padding: var(--space-xl) var(--space-md) var(--space-xxl);
        gap: var(--space-xl);
    }

    .workbench {
        grid-template-columns: minmax(0, 1fr);
    }

    .settings {
        position: static;
    }

    .home-header {
        flex-direction: column;
        gap: var(--space-sm);
    }        .home-header-side {
            padding-top: 0;
        }

        .lang-btn {
            align-self: flex-start;
        }

    .setup-card {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 640px) {
    .home-title {
        font-size: var(--font-size-xxl);
    }

    .composer {
        padding: var(--space-md);
    }

    .composer-foot {
        align-items: stretch;
    }

    .foot-actions {
        width: 100%;
        margin-inline-start: 0;
    }

    .foot-hint {
        display: none;
    }

    .btn-generate {
        flex: 1;
    }

    .batch-row {
        grid-template-columns: 20px minmax(0, 1fr) auto 24px;
    }

    .batch-dims {
        display: none;
    }
}

/* Respect reduced-motion preferences across the page. */
@media (prefers-reduced-motion: reduce) {
    .sample-card,
    .sample-card-img,
    .thumb,
    .chip,
    .segmented-btn,
    .meta-btn,
    .composer,
    .prompt-input,
    .token-meter-fill {
        transition: none;
    }
}
</style>
