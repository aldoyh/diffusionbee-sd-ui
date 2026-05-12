
<template>
    <div class="main_container dark-theme">
        <div class="welcome-section">
            <h1 class="welcome-title" :class="{ 'rtl-text': isArabic }">
                {{ isArabic ? 'ماذا ستصنع اليوم؟' : 'What will you create today?' }}
            </h1>
            
            <p class="inspiration-text" :class="{ 'rtl-text': isArabic }">
                {{ currentInspiration }}
            </p>

            <div class="chat-container">
                <div class="chat-box" :dir="isArabic ? 'rtl' : 'ltr'">
                    <input
                        type="text"
                        v-model="promptText"
                        @keyup.enter="submitPrompt"
                        :placeholder="isArabic ? 'صف ما تريد رؤيته...' : 'Describe what you want to see...'"
                        class="chat-input"
                        :class="{ 'rtl-text': isArabic }"
                        autofocus
                    />
                    <button @click="submitPrompt" class="chat-submit" :disabled="!promptText.trim()">
                        <svg v-if="!isArabic" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: scaleX(-1);">
                            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="lang-toggle" @click="isArabic = !isArabic">
                    {{ isArabic ? 'English' : 'العربية' }}
                </div>
            </div>

            <div class="carousel-wrapper" v-if="carouselImages.length > 0">
                <div class="carousel-container">
                    <div class="carousel-track" :style="trackStyle">
                        <div v-for="(img, idx) in carouselImages" :key="idx" class="carousel-item">
                            <img :src="'file://' + img.image_url" class="carousel-img" />
                            <div class="carousel-caption">{{ img.prompt }}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="empty-carousel">
                <div class="carousel-item placeholder-item" v-for="i in 5" :key="i">
                    <div class="placeholder-img"></div>
                </div>
            </div>
        </div>

        <div class="styles-section">
            <h2 class="category-title">{{ isArabic ? 'استكشف الأنماط' : 'Explore Styles' }}</h2>
            <div class="styles-grid">
                <div v-for="style in displayedStyles" :key="style.name" class="style-chip" @click="applyStyle(style.name)">
                    <span class="style-icon">{{ style.icon }}</span>
                    <span class="style-name">{{ isArabic ? style.nameArabic : style.name }}</span>
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
        <hr style="border-color: rgba(255,255,255,0.1)">
    </div>
</template>

<script>
import { migrate_history_only_once } from "../utils"

const Home = {
    name: 'Home',
    props: {app:Object, },
    components: {},
    mounted() {
        this.loadHistory();
        this.startCarousel();
        this.startInspirationRotation();
    },
    beforeDestroy() {
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
        }
        if (this.inspirationInterval) {
            clearInterval(this.inspirationInterval);
        }
    },
    data() {
        return {
            isArabic: false,
            promptText: '',
            inspirationIndex: 0,
            inspirationInterval: null,
            inspirationMessages: [
                "A futuristic city in the clouds",
                "A magical forest with glowing plants",
                "A cybernetic samurai in Tokyo",
                "An underwater civilization of glass",
                "A cosmic journey through a nebula"
            ],
            inspirationMessagesArabic: [
                "مدينة مستقبلية في السحب",
                "غابة سحرية بنباتات مضيئة",
                "ساموراي سايبربانك في طوكيو",
                "حضارة تحت الماء من الزجاج",
                "رحلة كونية عبر سديم"
            ],
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
            carouselImages: [],
            carouselOffset: 0,
            carouselInterval: null,
            itemWidth: 280, // width + margin
            categories: [
                ["main" , "All AI Tools"],
                ["pages" , "Pages"],
                ["misc" , "Miscellaneous"],
            ]
        };
    },
    methods: {
        loadHistory() {
            let history = {}
            try {
                let hist = window.ipcRenderer.sendSync('load_data' , 'history.json')
                if(hist && hist.history){
                    history = hist.history;
                }

                let new_items = migrate_history_only_once(history)
                for(let k in new_items){
                    history[k] = new_items[k]
                }

                // Extract images and sort by date (newest first)
                let allImages = [];
                let historyArray = Object.values(history).reverse();
                for (let group of historyArray) {
                    if (group.imgs && group.imgs.length > 0) {
                        for (let img of group.imgs) {
                            allImages.push({
                                image_url: img.image_url,
                                prompt: group.prompt || (group.params && group.params.prompt) || 'No prompt'
                            });
                        }
                    }
                    if (allImages.length >= 20) break; // limit to 20 images
                }

                this.carouselImages = allImages;

                // Clone images for infinite scroll effect
                if (this.carouselImages.length > 0) {
                    this.carouselImages = [...this.carouselImages, ...this.carouselImages, ...this.carouselImages];
                }
            } catch (error) {
                console.error("Error loading history:", error);
            }
        },
        startCarousel() {
            if (this.carouselImages.length === 0) return;

            this.carouselInterval = setInterval(() => {
                this.carouselOffset -= 1;

                // Reset when scrolled past one set of images
                if (Math.abs(this.carouselOffset) >= (this.carouselImages.length / 3) * this.itemWidth) {
                    this.carouselOffset = 0;
                }
            }, 30);
        },
        submitPrompt() {
            if (!this.promptText.trim()) return;

            let prompt = this.promptText;
            this.promptText = '';

            // Switch page
            this.app.functions.switch_page('Txt2Img');

            // Wait for Vue to render the new component
            this.$nextTick(() => {
                let txt2imgComp = this.app.$refs.router.$refs['Txt2Img'];
                if (Array.isArray(txt2imgComp)) txt2imgComp = txt2imgComp[0];

                if (txt2imgComp && txt2imgComp.$refs.sd_applet) {
                    let sd_applet = txt2imgComp.$refs.sd_applet;
                    sd_applet.load_options({ prompt: prompt });
                    // Optional: automatically start generation
                    // sd_applet.generate();
                }
            });
        },
        applyStyle(styleName) {
            if (!this.promptText.includes(styleName)) {
                this.promptText = this.promptText.trim() ? `${this.promptText}, ${styleName}` : styleName;
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
                this.inspirationIndex = (this.inspirationIndex + 1) % this.inspirationMessages.length;
            }, 5000);
        }
    },
    computed: {
        currentInspiration() {
            return this.isArabic 
                ? this.inspirationMessagesArabic[this.inspirationIndex] 
                : this.inspirationMessages[this.inspirationIndex];
        },
        displayedStyles() {
            return this.stylePresets;
        },
        trackStyle() {
            return {
                transform: `translateX(${this.carouselOffset}px)`
            };
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
    padding: 80px 20px 60px;
    min-height: 40vh;
}

.welcome-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin-bottom: 10px;
    text-align: center;
    background: linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 10px 40px rgba(255,255,255,0.05);
    letter-spacing: -1px;
}

.inspiration-text {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 40px;
    font-style: italic;
    transition: opacity 0.5s ease;
    height: 1.5rem;
}

.chat-container {
    width: 100%;
    max-width: 800px;
    margin-bottom: 60px;
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

.carousel-wrapper {
    width: 100%;
    overflow: hidden;
    position: relative;
    padding: 40px 0;
    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
}

.carousel-item {
    flex: 0 0 auto;
    width: 280px;
    height: 280px;
    margin: 0 20px;
    border-radius: 24px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(255,255,255,0.05);
}

.carousel-item:hover {
    transform: translateY(-15px) scale(1.05);
    z-index: 2;
    border-color: rgba(255,255,255,0.2);
    box-shadow: 0 30px 60px rgba(0,0,0,0.6);
}

.carousel-caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
    color: white;
    padding: 30px 20px 20px;
    font-size: 0.9rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
}

.carousel-item:hover .carousel-caption {
    opacity: 1;
    transform: translateY(0);
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
