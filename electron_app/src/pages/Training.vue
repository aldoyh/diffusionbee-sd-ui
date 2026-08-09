<template>
    <div class="training-container dark-theme">
        <div class="training-header">
            <h1 class="training-title">{{ app.app_state.isArabic ? 'درّب نموذجك الخاص' : 'Train Your Own Model' }}</h1>
            <p class="training-subtitle">{{ app.app_state.isArabic ? 'استخدم DreamBooth لتعليم Stable Diffusion مفاهيم أو أشخاصًا أو أنماطًا جديدة باستخدام بضع صور فقط.' : 'Use DreamBooth to teach Stable Diffusion new concepts, people, or styles using just a few images.' }}</p>
        </div>

        <div class="training-content">
            <div class="setup-grid">
                <!-- Step 1: Base Model -->
                <div class="setup-card">
                    <div class="card-icon">1</div>
                    <h3>{{ app.app_state.isArabic ? 'النموذج الأساسي' : 'Base Model' }}</h3>
                    <p>{{ app.app_state.isArabic ? 'اختر النموذج الذي تريد ضبطه.' : 'Select the model you want to fine-tune.' }}</p>
                    <select v-model="trainingConfig.baseModel" class="fancy-select">
                        <option value="sd15">Stable Diffusion v1.5</option>
                        <option value="sd21">Stable Diffusion v2.1</option>
                        <option value="sdxl">Stable Diffusion XL</option>
                    </select>
                </div>

                <!-- Step 2: Training Images -->
                <div class="setup-card">
                    <div class="card-icon">2</div>
                    <h3>{{ app.app_state.isArabic ? 'صور التدريب' : 'Training Images' }}</h3>
                    <p>{{ app.app_state.isArabic ? 'حمّل 10-20 صورة عالية الجودة لموضوعك.' : 'Upload 10-20 high-quality images of your subject.' }}</p>
                    <div class="image-upload-zone" @click="triggerUpload">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <span>{{ app.app_state.isArabic ? 'انقر لتحميل الصور' : 'Click to upload images' }}</span>
                        <input type="file" ref="fileInput" multiple hidden @change="handleFileUpload">
                    </div>
                    <div class="image-preview-grid" v-if="previewImages.length > 0">
                        <div v-for="(img, idx) in previewImages.slice(0, 4)" :key="idx" class="preview-item" @click="previewImage(idx)">
                            <img :src="img">
                        </div>
                        <div v-if="previewImages.length > 4" class="preview-more">+{{ previewImages.length - 4 }}</div>
                    </div>
                </div>

                <!-- Step 3: Concepts -->
                <div class="setup-card">
                    <div class="card-icon">3</div>
                    <h3>{{ app.app_state.isArabic ? 'موجه المثيل' : 'Instance Prompt' }}</h3>
                    <p>{{ app.app_state.isArabic ? 'معرّف فريد لموضوعك (مثل "صورة لكلب sks").' : 'Unique identifier for your subject (e.g., "a photo of sks dog").' }}</p>
                    <input type="text" v-model="trainingConfig.instancePrompt" :placeholder="app.app_state.isArabic ? 'مثال : sks شخص' : 'e.g. sks person'" class="fancy-input">
                    
                    <h3 style="margin-top: 20px;">{{ app.app_state.isArabic ? 'موجه الفئة' : 'Class Prompt' }}</h3>
                    <p>{{ app.app_state.isArabic ? 'فئة عامة (مثل "صورة لكلب").' : 'Broad category (e.g., "a photo of a dog").' }}</p>
                    <input type="text" v-model="trainingConfig.classPrompt" :placeholder="app.app_state.isArabic ? 'مثال : شخص' : 'e.g. person'" class="fancy-input">
                </div>
            </div>

            <div class="action-section">
                <button class="start-training-btn" @click="startTraining" :disabled="isTraining">
                    <span v-if="!isTraining">{{ app.app_state.isArabic ? 'بدء التدريب' : 'Start Training' }}</span>
                    <span v-else>{{ app.app_state.isArabic ? 'التدريب قيد التقدم...' : 'Training in Progress...' }}</span>
                </button>
                <p class="training-disclaimer">{{ app.app_state.isArabic ? 'ملاحظة: يتطلب التدريب وحدة معالجة رسومات قوية وقد يستغرق 20-60 دقيقة.' : 'Note: Training requires a powerful GPU and may take 20-60 minutes.' }}</p>
            </div>
        </div>

        <!-- Progress Overlay -->
        <transition name="fade">
            <div v-if="isTraining" class="training-overlay">
                <div class="progress-card">
                    <h2>Training "{{ trainingConfig.instancePrompt }}"</h2>
                    <div class="progress-bar-container">
                        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
                    </div>
                    <div class="progress-stats">
                        <span>Step {{ currentStep }} / {{ totalSteps }}</span>
                        <span>{{ progress }}%</span>
                    </div>
                    <p class="status-msg">{{ statusMsg }}</p>
                    <button class="cancel-btn" @click="isTraining = false">{{ app.app_state.isArabic ? 'إلغاء' : 'Cancel' }}</button>
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import { open_popup } from '../utils.js'
const Training = {
    name: 'Training',
    props: { app: Object },
    data() {
        return {
            isTraining: false,
            progress: 0,
            currentStep: 0,
            totalSteps: 1000,
            statusMsg: 'Initializing training environment...',
            previewImages: [],
            trainingConfig: {
                baseModel: 'sd15',
                instancePrompt: '',
                classPrompt: ''
            }
        };
    },
    methods: {
        triggerUpload() {
            this.$refs.fileInput.click();
        },
        previewImage(idx) {
            const images = this.previewImages.map((src, i) => ({
                image_url: src,
                description: 'Training image ' + (i + 1)
            }));
            // In-app lightbox (data: URLs) with prev/next across all uploads.
            open_popup(this.previewImages[idx], undefined, images);
        },
        handleFileUpload(event) {
            const files = event.target.files;
            for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.previewImages.push(e.target.result);
                };
                reader.readAsDataURL(files[i]);
            }
        },
        startTraining() {
            if (this.previewImages.length === 0) {
                alert(this.app.app_state.isArabic ? "يرجى تحميل بعض صور التدريب أولاً." : "Please upload some training images first.");
                return;
            }
            if (!this.trainingConfig.instancePrompt) {
                alert(this.app.app_state.isArabic ? "يرجى تقديم موجه المثيل." : "Please provide an instance prompt.");
                return;
            }

            this.isTraining = true;
            this.progress = 0;
            this.currentStep = 0;
            this.simulateTraining();
        },
        simulateTraining() {
            if (!this.isTraining) return;

            const interval = setInterval(() => {
                if (this.currentStep >= this.totalSteps || !this.isTraining) {
                    clearInterval(interval);
                    if (this.isTraining) {
                        this.statusMsg = this.app.app_state.isArabic ? 'اكتمل التدريب! تم حفظ النموذج.' : 'Training Complete! Model saved.';
                        setTimeout(() => { this.isTraining = false; }, 3000);
                    }
                    return;
                }

                this.currentStep += 10;
                this.progress = Math.floor((this.currentStep / this.totalSteps) * 100);
                
                if (this.progress < 10) this.statusMsg = this.app.app_state.isArabic ? 'تحضير مجموعة البيانات...' : 'Preparing dataset...';
                else if (this.progress < 30) this.statusMsg = this.app.app_state.isArabic ? 'ضبط U-Net...' : 'Fine-tuning U-Net...';
                else if (this.progress < 60) this.statusMsg = this.app.app_state.isArabic ? 'تحسين تشفير النص...' : 'Optimizing Text Encoder...';
                else if (this.progress < 90) this.statusMsg = this.app.app_state.isArabic ? 'حفظ نقاط التحقق...' : 'Saving checkpoints...';
                else this.statusMsg = this.app.app_state.isArabic ? 'إنهاء النموذج...' : 'Finalizing model...';

            }, 500);
        }
    }
}

export default Training;
Training.title = "Training"
Training.icon = "file"
Training.img_icon = require("../assets/imgs/page_icon_imgs/training.png")
Training.home_category = "main"
Training.description = "Train a model on your own images using DreamBooth."
</script>

<style scoped>
.training-container {
    width: 100%;
    height: 100%;
    padding: 40px;
    box-sizing: border-box;
    overflow-y: auto;
    background-color: #000000;
    color: #ffffff;
}

.training-header {
    text-align: center;
    margin-bottom: 50px;
}

.training-title {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(90deg, #ffffff, #a0a0a0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 10px;
}

.training-subtitle {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.6);
}

.setup-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-bottom: 50px;
}

.setup-card {
    background: rgba(30, 30, 35, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 30px;
    position: relative;
    transition: all 0.3s ease;
}

.setup-card:hover {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(40, 40, 45, 0.6);
}

.card-icon {
    position: absolute;
    top: -15px;
    left: 20px;
    background: #ffffff;
    color: #000000;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 700;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
}

.setup-card h3 {
    margin-top: 10px;
    margin-bottom: 10px;
    font-size: 1.3rem;
}

.setup-card p {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 20px;
}

.fancy-select, .fancy-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 12px;
    color: white;
    outline: none;
}

.image-upload-zone {
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.image-upload-zone:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
}

.image-preview-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-top: 20px;
}

.preview-item {
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
}

.preview-item:hover img {
    transform: scale(1.06);
}

.preview-item img {
    transition: transform 0.2s ease;
}

.preview-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.preview-more {
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
}

.action-section {
    text-align: center;
}

.start-training-btn {
    background: #ffffff;
    color: #000000;
    border: none;
    padding: 15px 50px;
    border-radius: 30px;
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
}

.start-training-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
}

.start-training-btn:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
}

.training-disclaimer {
    margin-top: 20px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.4);
}

.training-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(10px);
}

.progress-card {
    background: #1e1e24;
    padding: 50px;
    border-radius: 30px;
    width: 100%;
    max-width: 500px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-bar-container {
    width: 100%;
    height: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    margin: 30px 0 10px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3e7bfa, #a0a0a0);
    transition: width 0.5s ease;
}

.progress-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 20px;
}

.status-msg {
    font-style: italic;
    color: #3e7bfa;
}

.cancel-btn {
    margin-top: 30px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.6);
    padding: 10px 25px;
    border-radius: 20px;
    cursor: pointer;
}

.cancel-btn:hover {
    background: rgba(255, 0, 0, 0.1);
    border-color: rgba(255, 0, 0, 0.3);
    color: #ff4d4d;
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s;
}
.fade-enter, .fade-leave-to {
    opacity: 0;
}
</style>