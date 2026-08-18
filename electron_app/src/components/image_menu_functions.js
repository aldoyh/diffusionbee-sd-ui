
import { uploadToImgbb, getImgbbApiKey } from "../utils/imgbb_upload.js"
import { open_popup, gallery_item_context, toFileUrl } from "../utils.js"

let image_manu_functions = {}

image_manu_functions['preview_image'] = function (app, image_item_data){
	if(!image_item_data || !image_item_data.image_url || image_item_data.image_url == 'ERROR')
        return;
	// Full-screen in-app lightbox (zoom / pan / prev-next across the other
	// images of the same generation group) — same viewer as clicking the image.
	open_popup(toFileUrl(image_item_data.image_url), undefined, gallery_item_context(image_item_data))
}
image_manu_functions['preview_image'].text = "Preview"

image_manu_functions['save_image'] =  function (app, image_item_data){
	app;
	image_item_data;

	if(!image_item_data.image_url)
        return;
    let im_path = image_item_data.image_url.split("?")[0];

    let seed = (image_item_data.params || {}).seed || ""

    let suggested_fname = (image_item_data.description || "Image").substring(0, 100) + "_" + seed
    let out_path = window.ipcRenderer.sendSync('save_dialog', suggested_fname);
    if(!out_path)
        return
    let org_path = im_path.replaceAll("file://" , "")
    window.ipcRenderer.sendSync('save_file', org_path+"||" +out_path);

}
image_manu_functions['save_image'] .text = "Save Image"

image_manu_functions['send_img_2_img'] =  function (app, image_item_data){
	app.functions.send_to_img2img( image_item_data.image_url )
	
}
image_manu_functions['send_img_2_img'].text = "Send to Img2Img"

image_manu_functions['send_outpaint'] =  function (app, image_item_data){

	app.functions.send_to_outpaint( image_item_data.image_url )
	
}
image_manu_functions['send_outpaint'].text = "Send to AI Canvas"



image_manu_functions['send_inpaint'] =  function (app, image_item_data){

	app.functions.send_to_inpaint( image_item_data.image_url )
	
}
image_manu_functions['send_inpaint'].text = "Send to Inpainting"



image_manu_functions['send_img_2_img_with_params'] =  function (app, image_item_data){

	let image_params = JSON.parse(JSON.stringify(image_item_data.params))
	app.functions.send_to_img2img( image_item_data.image_url , image_params )
	
}
image_manu_functions['send_img_2_img_with_params'].text = "Send to Img2Img with params"



image_manu_functions['use_params_current_page'] =  function (app, image_item_data){
	
	let image_params = JSON.parse(JSON.stringify(image_item_data.params))

	let router = app.$refs.router 
	let cur_page_id = router.current_open_page_id 

	router.$refs[ cur_page_id ][0].$refs.sd_applet.load_options(image_params)
	
}
image_manu_functions['use_params_current_page'].text = "Use parameters"



image_manu_functions['copy_params'] =  function (app, image_item_data){
	app;
	image_item_data;
	const remove_keys = ['generated_img', 'done_percentage', 'prompt_tokens' , 
	'job_state', 'job_id', "raw_form_options" ,  'negative_prompt_tokens' ,"input_image_with_mask" , "model_tdict_path" ,
	"controlnet_tdict_path" , "controlnet_inp_img_preprocesser_model_path" , "aux_output_img" ]
	let image_params = JSON.parse(JSON.stringify(image_item_data.params))
	for(let k of remove_keys)
		image_params[k] = undefined;
	window.ipcRenderer.sendSync('copy_to_clipboard' ,  JSON.stringify(image_params , null, 4))
	
}
image_manu_functions['copy_params'].text = "Copy all parameters"



image_manu_functions['send_to_postprocess'] =  function (app, image_item_data){

	app.functions.send_to_postprocess( image_item_data.image_url )
	
}
image_manu_functions['send_to_postprocess'].text = "Send to Upscaler"

image_manu_functions['generate_similar_images'] =  function (app, image_item_data){

	if( (!image_item_data.params) || image_item_data.params.applet_name != "txt2img"){
		app.show_toast("Only available for images generated using TextToImage")
		return
	}

	let router = app.$refs.router 

	if(router.$refs[ "Txt2Img" ][0].$refs.sd_applet.generate_similar_images( image_item_data.params)) {
		// Generation queued on Txt2Img page — no navigation needed
		app.show_toast(app.app_state && app.app_state.isArabic
			? 'جارٍ توليد صور مشابهة — تفقّد معرض الصور'
			: 'Generating similar images — check the gallery')
	}
	
}
image_manu_functions['generate_similar_images'].text = "Generate similar images"

image_manu_functions['upload_imgbb'] =  async function (app, image_item_data){
	if(!image_item_data.image_url)
        return;

    const apiKey = getImgbbApiKey(app);
    if (!apiKey) {
        app.show_toast(app.app_state && app.app_state.isArabic
            ? 'يرجى إضافة مفتاح API لـ imgbb في الإعدادات أولاً.'
            : 'Please add an imgbb API key in Settings first.');
        return;
    }

    let im_path = image_item_data.image_url.split("?")[0];

    try {
        const result = await uploadToImgbb(im_path, apiKey);
        if (result.url) {
            window.ipcRenderer.sendSync('copy_to_clipboard', result.url);
            app.show_toast(app.app_state && app.app_state.isArabic
                ? 'تم رفع الصورة إلى imgbb ونسخ الرابط إلى الحافظة!'
                : 'Image uploaded to imgbb — URL copied to clipboard!');
        }
    } catch (error) {
        console.error('imgbb upload failed:', error);
        app.show_toast(app.app_state && app.app_state.isArabic
            ? 'فشل رفع الصورة إلى imgbb: ' + (error.message || 'خطأ غير معروف')
            : 'Failed to upload image to imgbb: ' + (error.message || 'Unknown error'));
    }
}
image_manu_functions['upload_imgbb'].text = "Upload to imgbb.com"

// Arabic labels, resolved by the galleries when app_state.isArabic is set.
const MENU_TEXT_AR = {
    'preview_image': 'معاينة',
    'save_image': 'حفظ الصورة',
    'send_img_2_img': 'إرسال إلى توليد من صورة',
    'send_outpaint': 'إرسال إلى اللوحة الذكية',
    'send_inpaint': 'إرسال إلى الرسم الداخلي',
    'send_img_2_img_with_params': 'إرسال إلى توليد من صورة مع المعاملات',
    'use_params_current_page': 'استخدام المعاملات',
    'copy_params': 'نسخ جميع المعاملات',
    'send_to_postprocess': 'إرسال إلى رفع الدقة',
    'generate_similar_images': 'توليد صور مشابهة',
    'upload_imgbb': 'رفع إلى imgbb.com',
};

for (let fn of Object.keys(image_manu_functions)) {
    image_manu_functions[fn].text_ar = MENU_TEXT_AR[fn] || image_manu_functions[fn].text;
}

// Menu structure: sectioned dropdown with per-item icons. The galleries build
// their popup from these groups so the menu stays consistent everywhere
// (generation gallery + History).
const MENU_ICONS = {
    'preview_image': 'search-plus',
    'save_image': 'download',
    'upload_imgbb': 'cloud-upload-alt',
    'send_img_2_img': 'image',
    'send_outpaint': 'magic',
    'send_inpaint': 'paint-brush',
    'send_img_2_img_with_params': 'sliders-h',
    'send_to_postprocess': 'arrows-alt',
    'use_params_current_page': 'tools',
    'copy_params': 'copy',
    'generate_similar_images': 'clone',
};

const MENU_GROUPS = [
    { id: 'preview', label: 'Preview & Export', label_ar: 'معاينة وحفظ', items: ['preview_image', 'save_image', 'upload_imgbb'] },
    { id: 'send', label: 'Send To', label_ar: 'إرسال إلى', items: ['send_img_2_img', 'send_outpaint', 'send_inpaint', 'send_img_2_img_with_params', 'send_to_postprocess'] },
    { id: 'params', label: 'Parameters', label_ar: 'المعاملات', items: ['use_params_current_page', 'copy_params', 'generate_similar_images'] },
];

// Builds the sectioned menu passed down to GalleryImage. `skip` is an array of
// function ids to omit (e.g. 'use_params_current_page' on non-Txt2Img pages).
function build_image_menu_items(skip, isArabic) {
    skip = skip || [];
    const groups = [];
    for (let g of MENU_GROUPS) {
        const items = g.items
            .filter(id => !skip.includes(id) && image_manu_functions[id])
            .map(id => ({
                id,
                icon: MENU_ICONS[id],
                text: (isArabic && image_manu_functions[id].text_ar) ? image_manu_functions[id].text_ar : image_manu_functions[id].text,
            }));
        if (items.length) {
            groups.push({ id: g.id, label: (isArabic && g.label_ar) ? g.label_ar : g.label, items });
        }
    }
    return groups;
}


export {image_manu_functions, build_image_menu_items}
