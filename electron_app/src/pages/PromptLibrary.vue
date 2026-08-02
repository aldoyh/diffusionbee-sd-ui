<template>
    <div class="prompt-library-page">
        <section class="hero-panel">
            <div class="hero-copy">
                <p class="eyebrow">
                    {{ app && app.app_state && app.app_state.isArabic ? 'مكتبة الموجهات' : 'Prompt Library' }}
                </p>
                <h1>
                    {{ app && app.app_state && app.app_state.isArabic ? 'استكشف، أعد المزج، وولّد موجهات أقوى' : 'Browse, remix, and generate stronger prompts' }}
                </h1>
                <p class="hero-desc">
                    {{ app && app.app_state && app.app_state.isArabic ? 'هذه هي المكتبة التي نبحث عنها: موجهات جاهزة، موجهاتك المحفوظة، وآخر الموجهات العشوائية، مع توليد Ollama عند الطلب.' : 'This is the library that was missing: curated prompts, your saved prompts, recent random prompts, and Ollama-powered generation when you need it.' }}
                </p>

                <div class="hero-stats">
                    <div class="stat-chip">
                        <span class="stat-value">{{ builtInPromptCount }}</span>
                        <span class="stat-label">{{ app && app.app_state && app.app_state.isArabic ? 'موجهًا مدمجًا' : 'built-in prompts' }}</span>
                    </div>
                    <div class="stat-chip">
                        <span class="stat-value">{{ savedPromptCount }}</span>
                        <span class="stat-label">{{ app && app.app_state && app.app_state.isArabic ? 'محفوظ' : 'saved' }}</span>
                    </div>
                    <div class="stat-chip">
                        <span class="stat-value">{{ recentPromptCount }}</span>
                        <span class="stat-label">{{ app && app.app_state && app.app_state.isArabic ? 'حديث' : 'recent' }}</span>
                    </div>
                </div>
            </div>

            <div class="generator-panel">
                <div class="generator-card">
                    <div class="generator-header">
                        <div>
                            <div class="generator-title">
                                {{ app && app.app_state && app.app_state.isArabic ? 'مولّد Ollama' : 'Ollama Generator' }}
                            </div>
                            <div class="generator-subtitle">
                                {{ ollamaModelLabel || (app && app.app_state && app.app_state.isArabic ? 'لم يتم العثور على نموذج Ollama بعد' : 'No Ollama model detected yet') }}
                            </div>
                        </div>
                        <button class="ghost-btn" @click="refreshOllamaModels" :disabled="isRefreshingModels">
                            {{ isRefreshingModels ? (app && app.app_state && app.app_state.isArabic ? 'جارٍ الفحص...' : 'Refreshing...') : (app && app.app_state && app.app_state.isArabic ? 'تحديث' : 'Refresh') }}
                        </button>
                    </div>

                    <button class="primary-btn" @click="generateFromSelection" :disabled="isGeneratingPrompt">
                        {{ isGeneratingPrompt ? (app && app.app_state && app.app_state.isArabic ? 'جارٍ التوليد...' : 'Generating...') : (app && app.app_state && app.app_state.isArabic ? '🎲 ولّد موجهًا' : '🎲 Generate prompt') }}
                    </button>

                    <textarea
                        v-model="draftPrompt"
                        class="draft-box"
                        :placeholder="app && app.app_state && app.app_state.isArabic ? 'سيظهر الموجه هنا...' : 'Your prompt draft will appear here...'"
                        rows="5"
                    ></textarea>

                    <div class="draft-actions">
                        <button class="action-btn" @click="copyPrompt(draftPrompt)" :disabled="!draftPrompt.trim()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            {{ app && app.app_state && app.app_state.isArabic ? 'نسخ' : 'Copy' }}
                        </button>
                        <button class="action-btn" @click="savePrompt(draftPrompt)" :disabled="!draftPrompt.trim()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            {{ app && app.app_state && app.app_state.isArabic ? 'حفظ' : 'Save' }}
                        </button>
                        <button class="action-btn" @click="usePrompt(draftPrompt)" :disabled="!draftPrompt.trim()">
                            {{ app && app.app_state && app.app_state.isArabic ? 'فتح' : 'Open' }}
                        </button>
                        <button class="action-btn action-btn--generate" @click="generateNow(draftPrompt)" :disabled="!draftPrompt.trim() || !isBackendAvailable">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            {{ app && app.app_state && app.app_state.isArabic ? 'توليد الآن' : 'Generate now' }}
                        </button>
                    </div>

                    <div class="generator-note" v-if="lastGeneratedModelName">
                        {{ app && app.app_state && app.app_state.isArabic ? 'تم التوليد باستخدام' : 'Generated with' }} {{ lastGeneratedModelName }}
                    </div>
                </div>
            </div>
        </section>

        <section class="toolbar-panel">
            <input
                v-model="searchQuery"
                class="search-input"
                type="text"
                :placeholder="app && app.app_state && app.app_state.isArabic ? 'ابحث داخل الموجهات...' : 'Search prompts...'"
            />
            <div class="category-strip">
                <button
                    v-for="filter in categoryFilters"
                    :key="filter.id"
                    class="category-chip"
                    :class="{ active: activeCategoryId === filter.id }"
                    @click="activeCategoryId = filter.id"
                >
                    {{ filter.label }}
                </button>
            </div>
        </section>

        <section class="section-card" v-if="draftPrompt.trim()">
            <div class="section-head">
                <h2>{{ app && app.app_state && app.app_state.isArabic ? 'الموجه الحالي' : 'Current prompt' }}</h2>
                <div class="section-actions">
                    <button class="tiny-btn" @click="generateFromDraft(draftPrompt)" :disabled="isGeneratingPrompt || !draftPrompt.trim()">
                        {{ app && app.app_state && app.app_state.isArabic ? 'إعادة المزج' : 'Remix' }}
                    </button>
                    <button class="tiny-btn" @click="openPromptInGeneratorPage(draftPrompt)" :disabled="!draftPrompt.trim()">
                        {{ app && app.app_state && app.app_state.isArabic ? 'فتح في الصفحة الحالية' : 'Use in current page' }}
                    </button>
                </div>
            </div>
            <div class="draft-preview">
                {{ draftPrompt }}
            </div>
        </section>

        <section class="split-sections">
            <article class="section-card">
                <div class="section-head">
                    <h2>{{ app && app.app_state && app.app_state.isArabic ? 'المحفوظات' : 'Saved prompts' }}</h2>
                    <button class="tiny-btn" @click="clearSavedPrompts" :disabled="savedPromptCount === 0">
                        {{ app && app.app_state && app.app_state.isArabic ? 'مسح المحفوظات' : 'Clear saved' }}
                    </button>
                </div>

                <div class="empty-state" v-if="savedPromptEntries.length === 0">
                    {{ app && app.app_state && app.app_state.isArabic ? 'لا توجد موجهات محفوظة بعد.' : 'No saved prompts yet.' }}
                </div>

                <div class="mini-list" v-else>
                    <article class="mini-card" v-for="entry in savedPromptEntries" :key="entry.id">
                        <div class="mini-card-text">{{ entry.prompt }}</div>
                        <div class="mini-actions">
                            <button class="mini-btn" @click="copyPrompt(entry.prompt)">{{ app && app.app_state && app.app_state.isArabic ? 'نسخ' : 'Copy' }}</button>
                            <button class="mini-btn" @click="usePrompt(entry.prompt)">{{ app && app.app_state && app.app_state.isArabic ? 'استخدام' : 'Use' }}</button>
                        </div>
                    </article>
                </div>
            </article>

            <article class="section-card">
                <div class="section-head">
                    <h2>{{ app && app.app_state && app.app_state.isArabic ? 'الأخيرة' : 'Recent prompts' }}</h2>
                    <button class="tiny-btn" @click="clearRecentPrompts" :disabled="recentPromptCount === 0">
                        {{ app && app.app_state && app.app_state.isArabic ? 'مسح الحديثة' : 'Clear recent' }}
                    </button>
                </div>

                <div class="empty-state" v-if="recentPromptEntries.length === 0">
                    {{ app && app.app_state && app.app_state.isArabic ? 'الموجهات العشوائية الحديثة ستظهر هنا.' : 'Recent random prompts will appear here.' }}
                </div>

                <div class="mini-list" v-else>
                    <article class="mini-card" v-for="entry in recentPromptEntries" :key="entry.id">
                        <div class="mini-card-text">{{ entry.prompt }}</div>
                        <div class="mini-actions">
                            <button class="mini-btn" @click="copyPrompt(entry.prompt)">{{ app && app.app_state && app.app_state.isArabic ? 'نسخ' : 'Copy' }}</button>
                            <button class="mini-btn" @click="usePrompt(entry.prompt)">{{ app && app.app_state && app.app_state.isArabic ? 'استخدام' : 'Use' }}</button>
                        </div>
                    </article>
                </div>
            </article>
        </section>

        <section class="section-card">
            <div class="section-head">
                <h2>{{ app && app.app_state && app.app_state.isArabic ? 'استعرض المكتبة' : 'Browse the library' }}</h2>
                <div class="section-meta">
                    {{ visibleBuiltInPromptEntries.length }} {{ app && app.app_state && app.app_state.isArabic ? 'نتيجة' : 'results' }}
                </div>
            </div>

            <div class="empty-state" v-if="visibleBuiltInPromptEntries.length === 0">
                {{ app && app.app_state && app.app_state.isArabic ? 'لم نجد موجهات تطابق البحث الحالي.' : 'No prompts match the current search.' }}
            </div>

            <div class="prompt-grid" v-else>
                <article class="prompt-card" v-for="entry in visibleBuiltInPromptEntries" :key="entry.id">
                    <div class="prompt-card-top">
                        <span class="category-badge">{{ entry.categoryLabel }}</span>
                        <span class="source-badge">{{ entry.categoryIcon }}</span>
                    </div>
                    <div class="prompt-text">{{ entry.prompt }}</div>
                    <div class="prompt-description">{{ entry.categoryDescription }}</div>
                    <div class="card-actions">
                        <button class="tiny-btn" @click="copyPrompt(entry.prompt)" :title="app && app.app_state && app.app_state.isArabic ? 'نسخ إلى الحافظة' : 'Copy to clipboard'">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:3px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            {{ app && app.app_state && app.app_state.isArabic ? 'نسخ' : 'Copy' }}
                        </button>
                        <button class="tiny-btn" @click="savePrompt(entry.prompt)">{{ app && app.app_state && app.app_state.isArabic ? 'حفظ' : 'Save' }}</button>
                        <button class="tiny-btn tiny-btn--accent" @click="usePrompt(entry.prompt)">{{ app && app.app_state && app.app_state.isArabic ? 'فتح' : 'Open' }}</button>
                        <button class="tiny-btn tiny-btn--generate" @click="generateNow(entry.prompt)" :disabled="!isBackendAvailable">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:3px"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            {{ app && app.app_state && app.app_state.isArabic ? 'توليد' : 'Generate' }}
                        </button>
                        <button class="tiny-btn" @click="generateFromDraft(entry.prompt)" :disabled="isGeneratingPrompt">
                            {{ app && app.app_state && app.app_state.isArabic ? 'إعادة مزج' : 'Remix' }}
                        </button>
                    </div>
                </article>
            </div>
        </section>
    </div>
</template>

<script>
import {
    PROMPTS_BY_CATEGORY,
    clearRecentRandomPrompts,
    clearUserPrompts,
    getCategories,
    getRecentRandomPrompts,
    getRandomPrompt,
    getRandomPromptFromCategory,
    getUserPrompts,
    rememberPrompt,
} from "../prompt_library.js"
const {
    formatOllamaModelLabel,
    generatePromptWithOllama,
    listOllamaModels,
    normalizeGeneratedPrompt,
    pickBestOllamaModel,
} = require("../utils/ollama_prompt_service.js")

function normalizeSearchText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function shufflePick(list) {
    if (!list || list.length === 0) return '';
    return list[Math.floor(Math.random() * list.length)];
}

export default {
    name: 'PromptLibrary',
    props: {
        app: Object,
    },
    mounted() {
        this.refreshOllamaModels();
        this.draftPrompt = this.getSeedPrompt();
    },
    data() {
        return {
            activeCategoryId: 'all',
            searchQuery: '',
            draftPrompt: '',
            isGeneratingPrompt: false,
            isRefreshingModels: false,
            availableOllamaModels: [],
            activeOllamaModel: null,
            lastGeneratedModelName: '',
        };
    },
    computed: {
        categoryFilters() {
            const categories = getCategories();
            const filters = [
                {
                    id: 'all',
                    label: this.app && this.app.app_state && this.app.app_state.isArabic ? 'الكل' : 'All',
                },
                {
                    id: 'saved',
                    label: this.app && this.app.app_state && this.app.app_state.isArabic ? 'المحفوظ' : 'Saved',
                },
                {
                    id: 'recent',
                    label: this.app && this.app.app_state && this.app.app_state.isArabic ? 'الحديث' : 'Recent',
                },
            ];

            Object.keys(categories).forEach((categoryId) => {
                const category = categories[categoryId];
                filters.push({
                    id: categoryId,
                    label: this.app && this.app.app_state && this.app.app_state.isArabic ? category.nameArabic : category.name,
                });
            });

            return filters;
        },
        ollamaModelLabel() {
            if (!this.activeOllamaModel) return '';
            return formatOllamaModelLabel(this.activeOllamaModel);
        },
        builtInPromptEntries() {
            const categories = getCategories();
            const entries = [];

            Object.keys(PROMPTS_BY_CATEGORY).forEach((categoryId) => {
                const category = categories[categoryId] || {};
                const prompts = PROMPTS_BY_CATEGORY[categoryId] || [];
                prompts.forEach((prompt, index) => {
                    entries.push({
                        id: `${categoryId}-${index}`,
                        prompt,
                        categoryId,
                        categoryLabel: this.app && this.app.app_state && this.app.app_state.isArabic ? (category.nameArabic || category.name || categoryId) : (category.name || category.nameArabic || categoryId),
                        categoryIcon: category.icon || '•',
                        categoryDescription: category.description || '',
                    });
                });
            });

            return entries;
        },
        savedPromptEntries() {
            return getUserPrompts().map((prompt, index) => ({
                id: `saved-${index}-${prompt.slice(0, 24)}`,
                prompt,
                categoryLabel: this.app && this.app.app_state && this.app.app_state.isArabic ? 'محفوظ' : 'Saved',
                categoryIcon: '★',
                categoryDescription: this.app && this.app.app_state && this.app.app_state.isArabic ? 'من مكتبتك الشخصية' : 'From your personal library',
            })).filter((entry) => this.matchesCurrentFilter(entry.prompt, 'saved'));
        },
        recentPromptEntries() {
            return getRecentRandomPrompts().map((prompt, index) => ({
                id: `recent-${index}-${prompt.slice(0, 24)}`,
                prompt,
                categoryLabel: this.app && this.app.app_state && this.app.app_state.isArabic ? 'حديث' : 'Recent',
                categoryIcon: '↻',
                categoryDescription: this.app && this.app.app_state && this.app.app_state.isArabic ? 'أحدث الموجهات العشوائية' : 'Latest random prompts',
            })).filter((entry) => this.matchesCurrentFilter(entry.prompt, 'recent'));
        },
        visibleBuiltInPromptEntries() {
            const query = normalizeSearchText(this.searchQuery);
            let entries = this.builtInPromptEntries.slice();

            if (this.activeCategoryId !== 'all' && this.activeCategoryId !== 'saved' && this.activeCategoryId !== 'recent') {
                entries = entries.filter((entry) => entry.categoryId === this.activeCategoryId);
            }

            if (query) {
                entries = entries.filter((entry) => normalizeSearchText([
                    entry.prompt,
                    entry.categoryLabel,
                    entry.categoryDescription,
                ].join(' ')).includes(query));
            }

            return entries.slice(0, 96);
        },
        builtInPromptCount() {
            return this.builtInPromptEntries.length;
        },
        savedPromptCount() {
            return getUserPrompts().length;
        },
        recentPromptCount() {
            return getRecentRandomPrompts().length;
        },
        isBackendAvailable() {
            return this.app && this.app.stable_diffusion_manager && this.app.stable_diffusion_manager.is_ready && this.app.assets_manager;
        },
    },
    methods: {
        matchesCurrentFilter(prompt, type) {
            const query = normalizeSearchText(this.searchQuery);
            if (this.activeCategoryId && this.activeCategoryId !== 'all' && this.activeCategoryId !== type) {
                if (type !== 'saved' && type !== 'recent') {
                    if (this.activeCategoryId !== type) {
                        const categories = getCategories();
                        if (!categories[this.activeCategoryId]) {
                            return false;
                        }
                    }
                } else if (this.activeCategoryId !== type) {
                    return false;
                }
            }

            if (!query) return true;
            return normalizeSearchText(prompt).includes(query);
        },
        getSeedPrompt() {
            if (this.activeCategoryId === 'saved') {
                return shufflePick(getUserPrompts()) || getRandomPrompt();
            }

            if (this.activeCategoryId === 'recent') {
                return shufflePick(getRecentRandomPrompts()) || getRandomPrompt();
            }

            if (this.activeCategoryId !== 'all' && PROMPTS_BY_CATEGORY[this.activeCategoryId]) {
                return getRandomPromptFromCategory(this.activeCategoryId);
            }

            return getRandomPrompt();
        },
        async refreshOllamaModels(forceRefresh = true) {
            if (this.isRefreshingModels) return;
            this.isRefreshingModels = true;

            try {
                const models = await listOllamaModels({ forceRefresh });
                this.availableOllamaModels = models;
                this.activeOllamaModel = pickBestOllamaModel(models);
            } catch (error) {
                console.warn('Failed to refresh Ollama models:', error);
                this.availableOllamaModels = [];
                this.activeOllamaModel = null;
            } finally {
                this.isRefreshingModels = false;
            }
        },
        copyPrompt(prompt) {
            const text = String(prompt || '').trim();
            if (!text) return;
            window.ipcRenderer.sendSync('copy_to_clipboard', text);
            this.notify(this.app && this.app.app_state && this.app.app_state.isArabic ? 'تم النسخ إلى الحافظة.' : 'Copied to clipboard.');
        },
        savePrompt(prompt) {
            const text = String(prompt || '').trim();
            if (!text) return;
            rememberPrompt(text);
            this.notify(this.app && this.app.app_state && this.app.app_state.isArabic ? 'تم حفظ الموجه.' : 'Prompt saved.');
        },
        clearSavedPrompts() {
            clearUserPrompts();
            this.notify(this.app && this.app.app_state && this.app.app_state.isArabic ? 'تم مسح الموجهات المحفوظة.' : 'Saved prompts cleared.');
        },
        clearRecentPrompts() {
            clearRecentRandomPrompts();
            this.notify(this.app && this.app.app_state && this.app.app_state.isArabic ? 'تم مسح الموجهات الحديثة.' : 'Recent prompts cleared.');
        },
        usePrompt(prompt) {
            const text = String(prompt || '').trim();
            if (!text) return;
            rememberPrompt(text);
            this.draftPrompt = text;
            this.openPromptInGeneratorPage(text);
        },
        async openPromptInGeneratorPage(prompt) {
            const text = String(prompt || '').trim();
            if (!text) return;

            const router = this.app && this.app.$refs && this.app.$refs.router;
            if (!router || !this.app || !this.app.functions || !this.app.functions.switch_page) {
                return;
            }

            const currentPageId = router.current_open_page_id;
            const currentPage = router.$refs[currentPageId] && router.$refs[currentPageId][0];

            if (currentPageId === 'Homepage' && currentPage) {
                currentPage.promptText = text;
                this.app.functions.switch_page('Homepage');
                return;
            }

            if (currentPage && currentPage.$refs && currentPage.$refs.sd_applet) {
                currentPage.$refs.sd_applet.load_options({ prompt: text });
                return;
            }

            this.app.functions.switch_page('Txt2Img');
            await this.$nextTick();

            const txt2Img = router.$refs.Txt2Img && router.$refs.Txt2Img[0];
            if (txt2Img && txt2Img.$refs && txt2Img.$refs.sd_applet) {
                txt2Img.$refs.sd_applet.load_options({ prompt: text });
            }
        },
        async generateFromSelection() {
            const seedPrompt = this.getSeedPrompt();
            await this.generateFromDraft(seedPrompt);
        },
        async        generateFromDraft(seedPrompt) {
            if (this.isGeneratingPrompt) return;
            const seed = String(seedPrompt || '').trim() || this.getSeedPrompt();
            if (!seed) return;

            this.isGeneratingPrompt = true;
            try {
                const selectedFilter = this.categoryFilters.find((filter) => filter.id === this.activeCategoryId);
                const result = await generatePromptWithOllama({
                    sourcePrompt: seed,
                    category: this.activeCategoryId !== 'all' ? this.activeCategoryId : '',
                    style: selectedFilter ? selectedFilter.label : '',
                    locale: this.app && this.app.app_state && this.app.app_state.isArabic ? 'ar' : 'en',
                    modelName: this.activeOllamaModel && this.activeOllamaModel.name,
                });

                const prompt = normalizeGeneratedPrompt(result.prompt) || seed;
                this.draftPrompt = prompt;
                this.lastGeneratedModelName = result.model_name || (this.activeOllamaModel && this.activeOllamaModel.name) || '';
                rememberPrompt(prompt);
            } catch (error) {
                console.warn('Ollama remix failed, falling back to the seed prompt:', error);
                this.draftPrompt = seed;
                this.lastGeneratedModelName = '';
                rememberPrompt(seed);
            } finally {
                this.isGeneratingPrompt = false;
            }
        },
        generateNow(prompt) {
            const text = String(prompt || '').trim();
            if (!text) return;

            if (!this.isBackendAvailable) {
                this.notify(this.app && this.app.app_state && this.app.app_state.isArabic
                    ? 'المحرك غير جاهز بعد. انتظر حتى يكتمل التحميل.'
                    : 'Backend not ready yet. Please wait for loading to complete.');
                return;
            }

            if (!this.app || !this.app.functions) return;

            // Navigate to Homepage and set the prompt
            const router = this.app.$refs && this.app.$refs.router;
            if (router) {
                const homePage = router.$refs && router.$refs.Homepage && router.$refs.Homepage[0];
                if (homePage && homePage.promptText !== undefined) {
                    homePage.promptText = text;
                }
            }

            this.app.functions.switch_page('Homepage');
            this.notify(this.app && this.app.app_state && this.app.app_state.isArabic
                ? 'تم تعيين الموجه. اضغط زر الإرسال لبدء التوليد.'
                : 'Prompt set. Press submit to start generation.');
        },
        notify(message) {
            if (this.app && this.app.show_toast) {
                this.app.show_toast(message);
            }
        },
    },
}
</script>

<style scoped>
.prompt-library-page {
    min-height: 100%;
    padding: 24px;
    overflow-y: auto;
    color: #fff;
    background:
        radial-gradient(circle at top left, rgba(62, 123, 250, 0.18), transparent 28%),
        radial-gradient(circle at top right, rgba(0, 191, 166, 0.12), transparent 24%),
        linear-gradient(180deg, #09090f 0%, #0f1117 44%, #0a0c12 100%);
}

.hero-panel {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 18px;
    align-items: stretch;
}

.hero-copy,
.generator-card,
.toolbar-panel,
.section-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}

.hero-copy {
    border-radius: 28px;
    padding: 28px;
}

.eyebrow {
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.55);
}

.hero-copy h1 {
    margin: 0;
    max-width: 10ch;
    font-size: 2.8rem;
    line-height: 0.98;
    letter-spacing: -0.05em;
}

.hero-desc {
    margin: 16px 0 0;
    max-width: 62ch;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.6;
}

.hero-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 22px;
}

.stat-chip {
    min-width: 118px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-value {
    display: block;
    font-size: 1.45rem;
    font-weight: 800;
}

.stat-label {
    display: block;
    margin-top: 3px;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.62);
}

.generator-card {
    height: 100%;
    border-radius: 28px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.generator-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
}

.generator-title {
    font-size: 1.1rem;
    font-weight: 700;
}

.generator-subtitle {
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.82rem;
}

.primary-btn,
.ghost-btn,
.action-btn,
.tiny-btn {
    border: 0;
    border-radius: 14px;
    padding: 10px 14px;
    color: #fff;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
}

.primary-btn:hover,
.ghost-btn:hover,
.action-btn:hover,
.tiny-btn:hover {
    transform: translateY(-1px);
}

.primary-btn {
    background: linear-gradient(135deg, #3e7bfa 0%, #2f5de7 100%);
    font-weight: 700;
}

.ghost-btn,
.action-btn,
.tiny-btn {
    background: rgba(255, 255, 255, 0.08);
}

.action-btn--accent,
.tiny-btn--accent {
    background: rgba(62, 123, 250, 0.26);
}

.action-btn--generate,
.tiny-btn--generate {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    font-weight: 600;
}

.action-btn--generate:hover:not(:disabled),
.tiny-btn--generate:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3);
}

.draft-box {
    width: 100%;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.18);
    color: #fff;
    padding: 14px;
    resize: vertical;
    min-height: 120px;
    line-height: 1.55;
}

.draft-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.generator-note {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.62);
}

.toolbar-panel {
    margin-top: 18px;
    padding: 16px;
    border-radius: 24px;
}

.search-input {
    width: 100%;
    border: 0;
    outline: none;
    border-radius: 16px;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.07);
    color: #fff;
}

.search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
}

.category-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.category-chip {
    border: 0;
    border-radius: 999px;
    padding: 9px 14px;
    color: #fff;
    background: rgba(255, 255, 255, 0.07);
    cursor: pointer;
}

.category-chip.active {
    background: rgba(62, 123, 250, 0.34);
}

.section-card {
    margin-top: 18px;
    border-radius: 26px;
    padding: 18px;
}

.section-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 14px;
}

.section-head h2 {
    margin: 0;
    font-size: 1.1rem;
}

.section-meta {
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.84rem;
}

.section-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.draft-preview {
    border-radius: 18px;
    padding: 14px;
    background: rgba(0, 0, 0, 0.16);
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.55;
    white-space: pre-wrap;
}

.split-sections {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
}

.empty-state {
    padding: 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.64);
}

.mini-list {
    display: grid;
    gap: 10px;
}

.mini-card {
    border-radius: 18px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.mini-card-text {
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
}

.mini-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.mini-btn {
    border: 0;
    border-radius: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
}

.prompt-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
}

.prompt-card {
    border-radius: 20px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.prompt-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.category-badge,
.source-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    padding: 5px 10px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.85);
}

.prompt-text {
    line-height: 1.6;
    font-size: 0.96rem;
}

.prompt-description {
    color: rgba(255, 255, 255, 0.58);
    font-size: 0.78rem;
}

.card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tiny-btn {
    padding: 8px 12px;
    font-size: 0.8rem;
}

.tiny-btn:disabled,
.primary-btn:disabled,
.ghost-btn:disabled,
.action-btn:disabled,
.mini-btn:disabled,
.category-chip:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    transform: none;
}

@media (max-width: 1080px) {
    .hero-panel,
    .split-sections {
        grid-template-columns: 1fr;
    }

    .hero-copy h1 {
        max-width: none;
    }
}

@media (max-width: 700px) {
    .prompt-library-page {
        padding: 16px;
    }

    .hero-copy,
    .generator-card,
    .toolbar-panel,
    .section-card {
        border-radius: 22px;
    }

    .hero-copy h1 {
        font-size: 2.1rem;
    }
}
</style>
