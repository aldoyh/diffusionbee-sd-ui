/*
 * i18n.js — Comprehensive English ↔ Arabic translations
 * Usage: import { t, isArabic } from "../i18n.js"
 *        t('key') returns the localized string based on current locale
 *        setLocale('ar') / setLocale('en') to switch
 *        getLocale() returns current locale
 */

// ─── Locale state ───────────────────────────────────────────────────────────
let currentLocale = 'en'

export function setLocale(locale) {
  currentLocale = locale
  try {
    window.localStorage.setItem('diffusionbee_locale', locale)
  } catch (e) { /* ignore */ }
}

export function getLocale() {
  return currentLocale
}

export function getIsArabic() {
  return currentLocale === 'ar'
}

// Initialize from localStorage
try {
  const saved = window.localStorage.getItem('diffusionbee_locale')
  if (saved === 'ar' || saved === 'en') {
    currentLocale = saved
  }
} catch (e) { /* ignore */ }

// ─── Translation function ───────────────────────────────────────────────────
export function t(key) {
  const text = translations[key]
  if (!text) {
    console.warn(`[i18n] Missing translation key: "${key}"`)
    return key
  }
  return currentLocale === 'ar' ? (text.ar || text.en) : text.en
}

// Helper to get both en/ar at once
export function tBoth(key) {
  const text = translations[key]
  if (!text) {
    console.warn(`[i18n] Missing translation key: "${key}"`)
    return { en: key, ar: key }
  }
  return { en: text.en, ar: text.ar || text.en }
}

// ─── All Translations ───────────────────────────────────────────────────────
const translations = {

  // ── App / Model Setup Dialog ──────────────────────────────────────────────
  'model_setup.welcome':         { en: 'Welcome to DiffusionBee GUI!',                    ar: 'مرحبًا بك في واجهة DiffusionBee!' },
  'model_setup.subtitle':        { en: "Let's get a model installed so you can start creating.", ar: 'دعنا نثبت نموذجًا حتى تتمكن من البدء في الإنشاء.' },
  'model_setup.checking':        { en: 'Checking for available models...',                 ar: 'جارٍ التحقق من النماذج المتاحة...' },
  'model_setup.download_btn':    { en: 'Download & Get Started',                           ar: 'تحميل وابدأ' },
  'model_setup.downloading':     { en: 'Downloading',                                      ar: 'جارٍ التحميل' },
  'model_setup.model_ready':     { en: 'Model ready!',                                     ar: 'النموذج جاهز!' },
  'model_setup.ready_desc':      { en: "You're all set to start generating images.",        ar: 'أنت جاهز تمامًا لبدء توليد الصور.' },
  'model_setup.retry':           { en: 'Retry',                                            ar: 'إعادة المحاولة' },
  'model_setup.skip':            { en: 'Skip for now',                                     ar: 'تخطي الآن' },
  'model_setup.no_models':       { en: 'No models available from the server.',             ar: 'لا توجد نماذج متاحة من الخادم.' },
  'model_setup.connection_err':  { en: 'Could not reach the model server. Check your internet connection.', ar: 'تعذر الوصول إلى خادم النماذج. تحقق من اتصالك بالإنترنت.' },
  'model_setup.failed_dl':       { en: 'Failed to auto-download model. Please download it manually.', ar: 'فشل التحميل التلقائي للنموذج. يرجى تحميله يدويًا.' },

  // ── Update Check ──────────────────────────────────────────────────────────
  'update.available':            { en: 'A new version of',                                 ar: 'نسخة جديدة من' },
  'update.is_available':         { en: 'is available. Do you want to visit',               ar: 'متاحة. هل تريد زيارة' },
  'update.to_update':            { en: 'to update?',                                       ar: 'لتحديث؟' },

  // ── Homepage ──────────────────────────────────────────────────────────────
  'homepage.title':              { en: 'What will you create today?',                       ar: 'ماذا ستصنع اليوم؟' },
  'homepage.placeholder':        { en: 'Describe what you want to see...',                  ar: 'صف ما تريد رؤيته...' },
  'homepage.random_title':       { en: 'Generate random prompt',                           ar: 'توليد موجه عشوائي' },
  'homepage.your_models':        { en: 'Your Models',                                       ar: 'النماذج المتاحة' },
  'homepage.explore_styles':     { en: 'Explore Styles',                                    ar: 'استكشف الأنماط' },
  'homepage.lang_en':            { en: 'English',                                           ar: 'English' },
  'homepage.lang_ar':            { en: 'العربية',                                           ar: 'العربية' },
  'homepage.cat_main':           { en: 'All AI Tools',                                      ar: 'جميع أدوات الذكاء الاصطناعي' },
  'homepage.cat_pages':          { en: 'Pages',                                             ar: 'الصفحات' },
  'homepage.cat_misc':           { en: 'Miscellaneous',                                     ar: 'متنوع' },
  'homepage.open':               { en: 'Open',                                              ar: 'فتح' },
  'homepage.inspire_0':          { en: 'A futuristic city in the clouds',                   ar: 'مدينة مستقبلية في السحب' },
  'homepage.inspire_1':          { en: 'A magical forest with glowing plants',              ar: 'غابة سحرية بنباتات مضيئة' },
  'homepage.inspire_2':          { en: 'A cybernetic samurai in Tokyo',                     ar: 'ساموراي سايبربانك في طوكيو' },
  'homepage.inspire_3':          { en: 'An underwater civilization of glass',               ar: 'حضارة تحت الماء من الزجاج' },
  'homepage.inspire_4':          { en: 'A cosmic journey through a nebula',                 ar: 'رحلة كونية عبر سديم' },

  // ── Style Presets ─────────────────────────────────────────────────────────
  'style.cinematic':             { en: 'Cinematic',                                         ar: 'سينمائي' },
  'style.cyberpunk':             { en: 'Cyberpunk',                                         ar: 'سايبربانك' },
  'style.oil_painting':          { en: 'Oil Painting',                                      ar: 'رسم زيتي' },
  'style.anime':                 { en: 'Anime',                                             ar: 'أنمي' },
  'style.photography':           { en: 'Photography',                                       ar: 'تصوير فوتوغرافي' },
  'style.threed_render':         { en: '3D Render',                                         ar: 'رسم ثلاثي الأبعاد' },
  'style.sketch':                { en: 'Sketch',                                            ar: 'رسم يدوي' },
  'style.fantasy':               { en: 'Fantasy',                                           ar: 'خيالي' },

  // ── Page Titles & Descriptions (used in sidebar & router) ─────────────────
  'page.home':                   { en: 'Home',                                              ar: 'الرئيسية' },
  'page.home_desc':              { en: 'Home page',                                         ar: 'الصفحة الرئيسية' },
  'page.txt2img':                { en: 'Text to image',                                     ar: 'نص إلى صورة' },
  'page.txt2img_desc':           { en: 'Generate images with text descriptions',            ar: 'توليد الصور باستخدام أوصاف نصية' },
  'page.img2img':                { en: 'Image to image',                                    ar: 'صورة إلى صورة' },
  'page.img2img_desc':           { en: 'Transform images with text descriptions',           ar: 'تحويل الصور باستخدام أوصاف نصية' },
  'page.inpainting':             { en: 'Inpainting',                                        ar: 'تعبئة ذكية' },
  'page.inpainting_desc':        { en: 'Add or remove objects from an image',               ar: 'إضافة أو إزالة كائنات من الصورة' },
  'page.training':               { en: 'Training',                                          ar: 'تدريب' },
  'page.training_desc':          { en: 'Train a model on your own images using DreamBooth.', ar: 'تدريب نموذج على صورك باستخدام DreamBooth' },
  'page.history':                { en: 'History',                                           ar: 'السجل' },
  'page.history_desc':           { en: 'View generated images',                             ar: 'عرض الصور المولدة' },
  'page.models':                 { en: 'Models',                                            ar: 'النماذج' },
  'page.models_desc':            { en: 'Download, import and manage models',                ar: 'تحميل واستيراد وإدارة النماذج' },
  'page.settings':               { en: 'Settings',                                          ar: 'الإعدادات' },
  'page.settings_desc':          { en: 'Application settings',                              ar: 'إعدادات التطبيق' },
  'page.upscaler':               { en: 'Upscaler',                                          ar: 'رفع الدقة' },
  'page.upscaler_desc':          { en: 'Use AI to increase the resolution of an image.',    ar: 'استخدم الذكاء الاصطناعي لزيادة دقة الصورة' },
  'page.logs':                   { en: 'Logs',                                              ar: 'السجلات' },
  'page.logs_desc':              { en: 'Application logs',                                  ar: 'سجلات التطبيق' },
  'page.contact':                { en: 'Contact Us',                                        ar: 'اتصل بنا' },
  'page.contact_desc':           { en: 'Get in touch with the team',                        ar: 'تواصل مع الفريق' },

  // ── Inpainting ────────────────────────────────────────────────────────────
  'inpaint.generate':            { en: 'Generate',                                          ar: 'توليد' },
  'inpaint.clear_stage':         { en: 'Clear Stage',                                       ar: 'مسح المسرح' },
  'inpaint.stop':                { en: 'Stop',                                              ar: 'إيقاف' },
  'inpaint.redo':                { en: 'Redo',                                              ar: 'إعادة' },
  'inpaint.undo':                { en: 'Undo',                                              ar: 'تراجع' },
  'inpaint.open':                { en: 'Open',                                              ar: 'فتح' },
  'inpaint.save':                { en: 'Save',                                              ar: 'حفظ' },
  'inpaint.clear_mask':          { en: 'Clear Mask',                                        ar: 'مسح القناع' },
  'inpaint.stroke_size':         { en: 'Stroke Size',                                       ar: 'حجم الفرشاة' },
  'inpaint.click_to_add':        { en: 'Click to add input image and draw a mask',          ar: 'انقر لإضافة صورة ورسم قناع' },
  'inpaint.discard':             { en: 'Discard',                                           ar: 'تجاهل' },
  'inpaint.keep':                { en: 'Keep',                                              ar: 'احتفاظ' },
  'inpaint.retry':               { en: 'Retry',                                             ar: 'إعادة المحاولة' },
  'inpaint.generating':          { en: 'Generating',                                        ar: 'جارٍ التوليد' },
  'inpaint.stopping':            { en: 'Stopping ...',                                      ar: 'جارٍ الإيقاف...' },

  // ── Training ──────────────────────────────────────────────────────────────
  'train.title':                 { en: 'Train Your Own Model',                              ar: 'درّب نموذجك الخاص' },
  'train.subtitle':              { en: 'Use DreamBooth to teach Stable Diffusion new concepts, people, or styles using just a few images.', ar: 'استخدم DreamBooth لتعليم Stable Diffusion مفاهيم أو أشخاصًا أو أنماطًا جديدة باستخدام بضع صور فقط.' },
  'train.base_model':            { en: 'Base Model',                                        ar: 'النموذج الأساسي' },
  'train.select_model':          { en: 'Select the model you want to fine-tune.',           ar: 'اختر النموذج الذي تريد ضبطه.' },
  'train.training_images':       { en: 'Training Images',                                   ar: 'صور التدريب' },
  'train.upload_images':         { en: 'Upload 10-20 high-quality images of your subject.', ar: 'حمّل 10-20 صورة عالية الجودة لموضوعك.' },
  'train.click_upload':          { en: 'Click to upload images',                            ar: 'انقر لتحميل الصور' },
  'train.instance_prompt':       { en: 'Instance Prompt',                                   ar: 'موجه المثيل' },
  'train.unique_id':             { en: 'Unique identifier for your subject (e.g., "a photo of sks dog").', ar: 'معرّف فريد لموضوعك (مثل "صورة لكلب sks").' },
  'train.class_prompt':          { en: 'Class Prompt',                                      ar: 'موجه الفئة' },
  'train.broad_category':        { en: 'Broad category (e.g., "a photo of a dog").',        ar: 'فئة عامة (مثل "صورة لكلب").' },
  'train.start_training':        { en: 'Start Training',                                    ar: 'بدء التدريب' },
  'train.in_progress':           { en: 'Training in Progress...',                           ar: 'التدريب قيد التقدم...' },
  'train.disclaimer':            { en: 'Note: Training requires a powerful GPU and may take 20-60 minutes.', ar: 'ملاحظة: يتطلب التدريب وحدة معالجة رسومات قوية وقد يستغرق 20-60 دقيقة.' },
  'train.cancel':                { en: 'Cancel',                                            ar: 'إلغاء' },
  'train.upload_first':          { en: 'Please upload some training images first.',         ar: 'يرجى تحميل بعض صور التدريب أولاً.' },
  'train.provide_prompt':        { en: 'Please provide an instance prompt.',                ar: 'يرجى تقديم موجه المثيل.' },
  'train.complete':              { en: 'Training Complete! Model saved.',                   ar: 'اكتمل التدريب! تم حفظ النموذج.' },
  'train.prep_data':             { en: 'Preparing dataset...',                              ar: 'تحضير مجموعة البيانات...' },
  'train.fine_tune_unet':         { en: 'Fine-tuning U-Net...',                              ar: 'ضبط U-Net...' },
  'train.optimize_encoder':      { en: 'Optimizing Text Encoder...',                        ar: 'تحسين تشفير النص...' },
  'train.save_checkpoints':      { en: 'Saving checkpoints...',                             ar: 'حفظ نقاط التحقق...' },
  'train.finalizing':            { en: 'Finalizing model...',                               ar: 'إنهاء النموذج...' },

  // ── History ───────────────────────────────────────────────────────────────
  'history.search':              { en: 'Search by prompt text',                             ar: 'بحث حسب نص الموجه' },
  'history.newest_first':        { en: 'Newest First',                                      ar: 'الأحدث أولاً' },
  'history.oldest_first':        { en: 'Oldest First',                                      ar: 'الأقدم أولاً' },
  'history.clear':               { en: 'Clear History',                                     ar: 'مسح السجل' },
  'history.delete':              { en: 'Delete',                                            ar: 'حذف' },
  'history.share':               { en: 'Share',                                             ar: 'مشاركة' },
  'history.share_arthub':        { en: 'Share on ArtHub.ai',                                ar: 'مشاركة على ArtHub.ai' },
  'history.no_images':           { en: 'No images generated yet.',                          ar: 'لم يتم توليد صور بعد.' },
  'history.confirm_clear':       { en: 'Are you sure you want to clear history?',           ar: 'هل أنت متأكد من رغبتك في مسح السجل؟' },
  'history.upload_error':        { en: 'Error in uploading.',                               ar: 'خطأ في الرفع.' },
  'history.uploading':           { en: 'Uploading',                                         ar: 'جارٍ الرفع' },

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title':              { en: 'Settings',                                          ar: 'الإعدادات' },
  'settings.general':            { en: 'General Settings',                                  ar: 'الإعدادات العامة' },
  'settings.notification':       { en: 'Notification sound',                                ar: 'صوت الإشعار' },
  'settings.notification_desc':  { en: 'To play a notification sound when generation of an image is completed', ar: 'تشغيل صوت إشعار عند اكتمال توليد الصورة' },

  // ── Model Store ───────────────────────────────────────────────────────────
  'models.import':               { en: 'Import From Computer',                              ar: 'استيراد من الكمبيوتر' },
  'models.my_models':            { en: 'My Models',                                         ar: 'نماذجي' },
  'models.importing':            { en: 'Importing model',                                   ar: 'جارٍ استيراد النموذج' },
  'models.available':            { en: 'Available Models',                                  ar: 'النماذج المتاحة' },
  'models.refresh':              { en: 'Refresh',                                           ar: 'تحديث' },
  'models.needs_update':         { en: 'You need to update DiffusionBee to use this model', ar: 'تحتاج إلى تحديث DiffusionBee لاستخدام هذا النموذج' },
  'models.already_importing':    { en: 'Model is already importing. Please wait',           ar: 'النموذج قيد الاستيراد بالفعل. يرجى الانتظار' },
  'models.name_empty':           { en: 'Put non empty model name',                          ar: 'أدخل اسم نموذج غير فارغ' },
  'models.already_exists':       { en: 'A model with this name already exists',             ar: 'يوجد نموذج بهذا الاسم بالفعل' },
  'models.import_error':         { en: 'Error while importing',                             ar: 'خطأ أثناء الاستيراد' },
  'models.download_again':       { en: 'Download Again',                                    ar: 'تحميل مرة أخرى' },

  // ── Logs ──────────────────────────────────────────────────────────────────
  'logs.title':                  { en: 'Logs',                                              ar: 'السجلات' },

  // ── Contact Us ────────────────────────────────────────────────────────────
  'contact.title':               { en: 'Contact Us',                                        ar: 'اتصل بنا' },
  'contact.email':               { en: 'To contact us, please send an email at :',           ar: 'للتواصل معنا، يرجى إرسال بريد إلكتروني إلى :' },
  'contact.response':            { en: 'We will get back to you as soon as possible',        ar: 'سنتواصل معك في أقرب وقت ممكن' },

  // ── Post-Process / Upscaler ───────────────────────────────────────────────
  'upscale.upscale':             { en: 'Upscale',                                           ar: 'رفع الدقة' },
  'upscale.select_image':        { en: 'Please select an input image first',                ar: 'يرجى تحديد صورة إدخال أولاً' },
  'upscale.too_large':           { en: 'Input image is too large',                           ar: 'صورة الإدخال كبيرة جدًا' },
  'upscale.upscaler':            { en: 'Upscaler',                                          ar: 'رافع الدقة' },

  // ── MainToolbar ───────────────────────────────────────────────────────────
  'toolbar.status_gen':          { en: 'Status : Generating Images',                        ar: 'الحالة : جارٍ توليد الصور' },
  'toolbar.gen_speed':           { en: 'Generation speed :',                                ar: 'سرعة التوليد :' },
  'toolbar.current_eta':         { en: 'Current image ETA :',                               ar: 'الوقت المتبقي للصورة الحالية :' },
  'toolbar.status_idle':         { en: 'Status : Idle',                                     ar: 'الحالة : خامل' },
  'toolbar.images_remaining':    { en: 'Images remaining :',                                ar: 'الصور المتبقية :' },
  'toolbar.stop_all':            { en: 'Stop All',                                          ar: 'إيقاف الكل' },
  'toolbar.stopping':            { en: 'Stopping',                                          ar: 'جارٍ الإيقاف' },
  'toolbar.help':                { en: 'Help',                                              ar: 'مساعدة' },
  'toolbar.discord':             { en: 'Start Discord Chat',                                ar: 'بدء محادثة Discord' },
  'toolbar.show_logs':           { en: 'Show Logs',                                         ar: 'عرض السجلات' },
  'toolbar.model_license':       { en: 'Model License',                                     ar: 'رخصة النموذج' },
  'toolbar.oss_licenses':        { en: 'Open-source Licences',                              ar: 'تراخيص المصادر المفتوحة' },
  'toolbar.about':               { en: 'About',                                             ar: 'حول' },
  'toolbar.contact_us':          { en: 'Contact Us',                                        ar: 'اتصل بنا' },
  'toolbar.report_issues':       { en: 'Report Issues',                                     ar: 'الإبلاغ عن مشكلات' },
  'toolbar.settings':            { en: 'Settings',                                          ar: 'الإعدادات' },
  'toolbar.close':               { en: 'Close',                                             ar: 'إغلاق' },

  // ── BasicSDApplet ─────────────────────────────────────────────────────────
  'sdapplet.download_models':    { en: 'You need to download the following models to generate:', ar: 'تحتاج إلى تحميل النماذج التالية للتوليد:' },
  'sdapplet.reset_default':      { en: 'Reset to default',                                  ar: 'إعادة إلى الإعدادات الافتراضية' },
  'sdapplet.download_first':     { en: 'First you need to download the model to generate',  ar: 'تحتاج أولاً إلى تحميل النموذج للتوليد' },
  'sdapplet.enter_prompt':       { en: 'You need to enter a prompt',                        ar: 'تحتاج إلى إدخال موجه' },
  'sdapplet.model_not_found':    { en: 'Model not found. Please select a valid model.',     ar: 'النموذج غير موجود. يرجى اختيار نموذج صالح.' },
  'sdapplet.no_input_img':       { en: 'You need to specify an input image',                ar: 'تحتاج إلى تحديد صورة إدخال' },
  'sdapplet.similar_images':     { en: 'Currently some images are already being generated. Please wait for them to finish.', ar: 'يتم حاليًا توليد بعض الصور. يرجى الانتظار حتى الانتهاء.' },

  // ── GenerationGallery ─────────────────────────────────────────────────────
  'gallery.no_images':           { en: 'No images to display',                              ar: 'لا توجد صور للعرض' },
  'gallery.enter_prompt':        { en: 'Enter a prompt to generate images using AI.',       ar: 'أدخل موجهًا لتوليد الصور باستخدام الذكاء الاصطناعي.' },

  // ── DownloadButton ────────────────────────────────────────────────────────
  'download.delete':             { en: 'Delete',                                            ar: 'حذف' },
  'download.download':           { en: 'Download',                                          ar: 'تحميل' },
  'download.download_again':     { en: 'Download Again',                                    ar: 'تحميل مرة أخرى' },
  'download.downloaded':         { en: 'Downloaded',                                        ar: 'تم التحميل' },

  // ── Toast messages ────────────────────────────────────────────────────────
  'toast.error_prefix':          { en: 'Error :',                                           ar: 'خطأ :' },

  // ── Buttons ───────────────────────────────────────────────────────────────
  'button.generate':             { en: 'Generate',                                          ar: 'توليد' },
  'button.random':               { en: '🎲 Random',                                         ar: '🎲 عشوائي' },
  'button.add_to_queue':         { en: 'Add to Queue',                                      ar: 'إضافة إلى قائمة الانتظار' },
  'button.stop_all':             { en: 'Stop all',                                          ar: 'إيقاف الكل' },
  'button.stopping':             { en: 'Stopping ...',                                      ar: 'جارٍ الإيقاف...' },

  // ── Queue ─────────────────────────────────────────────────────────────────
  'queue.added':                 { en: 'Added to queue',                                    ar: 'تمت الإضافة إلى قائمة الانتظار' },

}

export default { t, setLocale, getLocale, getIsArabic, tBoth, translations }
