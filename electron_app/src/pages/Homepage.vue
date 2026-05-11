
<template>
    <div class="main_container dark-theme">
        <div class="welcome-section">
            <h1 class="welcome-title">What will you create today?</h1>

            <div class="chat-container">
                <div class="chat-box">
                    <input
                        type="text"
                        v-model="promptText"
                        @keyup.enter="submitPrompt"
                        placeholder="Describe what you want to see..."
                        class="chat-input"
                        autofocus
                    />
                    <button @click="submitPrompt" class="chat-submit" :disabled="!promptText.trim()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
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
    },
    beforeDestroy() {
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
        }
    },
    data() {
        return {
            promptText: '',
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
        all_icons(category){
            let ret = []
            let items = (this.app.all_pages_ready ) ?  this.app.$refs.router.all_applet_items : [];
            for(let item of items){
                if(item.home_category == category)
                    ret.push(item)
            }
            return ret;
        }, 
    },
    computed: {
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
    background-image: radial-gradient(circle at 50% 0%, #1a1a2e 0%, #000000 60%);
    color: #ffffff;
}

.welcome-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px 40px;
    min-height: 50vh;
}

.welcome-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 40px;
    text-align: center;
    background: linear-gradient(90deg, #ffffff, #a0a0a0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 30px rgba(255,255,255,0.1);
}

.chat-container {
    width: 100%;
    max-width: 700px;
    margin-bottom: 50px;
    position: relative;
    z-index: 10;
}

.chat-box {
    display: flex;
    align-items: center;
    background: rgba(30, 30, 35, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 12px 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    transition: all 0.3s ease;
}

.chat-box:focus-within {
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 0 20px rgba(62, 123, 250, 0.2);
}

.chat-input {
    flex-grow: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.1rem;
    padding: 10px;
    outline: none;
    font-family: var(--main-font-text);
}

.chat-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
}

.chat-submit {
    background: #ffffff;
    color: #000000;
    border: none;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.chat-submit:hover:not(:disabled) {
    transform: scale(1.05);
    background: #e0e0e0;
}

.chat-submit:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
}

.carousel-wrapper {
    width: 100%;
    overflow: hidden;
    position: relative;
    padding: 20px 0;
    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.carousel-container {
    width: 100%;
    overflow: hidden;
}

.carousel-track {
    display: flex;
    will-change: transform;
}

.carousel-item {
    flex: 0 0 auto;
    width: 250px;
    height: 250px;
    margin: 0 15px;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 10px 20px rgba(0,0,0,0.5);
    transition: transform 0.3s ease;
}

.carousel-item:hover {
    transform: translateY(-10px) scale(1.02);
    z-index: 2;
}

.carousel-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.carousel-caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
    color: white;
    padding: 20px 15px 15px;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.carousel-item:hover .carousel-caption {
    opacity: 1;
}

.empty-carousel {
    display: flex;
    justify-content: center;
    gap: 20px;
    opacity: 0.5;
    margin-top: 20px;
}

.placeholder-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.2);
}

.placeholder-img {
    width: 100%;
    height: 100%;
}

.tools-section {
    padding: 0 40px;
    margin-bottom: 20px;
}

.category-title {
    color: rgba(255,255,255,0.8);
    font-size: 1.2rem;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 10px;
}

.icon_container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}

.select_app {
    width: 280px;
    height: 230px;
    background-size: cover;
    background-position: center;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(255,255,255,0.05);
}

.select_app:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0,0,0,0.4);
    border-color: rgba(255,255,255,0.2);
}

@media only screen and (max-width: 1730px) {
  .select_app {
    width : calc(20% - 16px);
  }
}

@media only screen and (max-width: 1430px) {
  .select_app {
    width : calc(25% - 15px);
  }
}

@media only screen and (max-width: 1200px) {
  .select_app {
    width : calc(33.333% - 14px);
  }
}

.select_app_desc {
    background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%);
    padding: 20px 15px 15px;
    position: absolute;
    bottom: 0;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.3s ease;
}

.select_app_desc h2 {
    color: white;
    margin-bottom: 5px;
    font-size: 1.1rem;
}

.select_app_desc p {
    color: rgba(255,255,255,0.7);
    margin-bottom: 10px;
    font-size: 0.85rem;
    line-height: 1.4;
}

.button_colored {
    background: #ffffff;
    color: #000000;
    border-radius: 20px;
    padding: 6px 16px;
    font-weight: 600;
    transition: all 0.2s ease;
}

.button_colored:hover {
    background: #e0e0e0;
    color: #000000;
}
</style>
