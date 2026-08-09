
function compute_n_cols() {
    let w = window.innerWidth;
    let n_col;
    if (w < 576) { n_col = 2 } else if (w < 668) { n_col = 3 } else if (w < 892) { n_col = 4 } else if (w < 1100) { n_col = 5 } else if (w < 1600) { n_col = 6 } else if (w < 1900) { n_col = 7 } else if (w < 2100) { n_col = 8 } else if (w < 2400) { n_col = 9 }

    n_col -= 1;
    return n_col;
}

function compute_time_remaining(time_remaining) {
    if (time_remaining.asSeconds() < 1) return "";
    if (time_remaining.hours() > 0) return `(${time_remaining.hours()}h${time_remaining.minutes()}m left)`;
    else return `(${time_remaining.minutes()}m${time_remaining.seconds()}s left)`;
}

function simple_hash( strr ) {
    var hash = 0;
    for (var i = 0; i < strr.length; i++) {
        var char = strr.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}


function toFileUrl(path) {
    if (!path) {
        return '';
    }
    if (path.startsWith('file://') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }
    // Windows drive-letter absolute path, e.g. C:\Users\... or C:/Users/...
    if (/^[a-zA-Z]:[\\/]/.test(path)) {
        return 'file:///' + path.replace(/\\/g, '/');
    }
    if (path.startsWith('/')) {
        return 'file://' + path;
    }
    return 'file://' + path;
}

function resolve_asset_illustration(name) {
    let pre_assets_list_svg = [
      ];
    let pre_assets_list_png = [
        ];
    if (pre_assets_list_svg.includes(name))
        return require("@/assets/" + name + ".svg")
    else  if (pre_assets_list_png.includes(name))
        return require("@/assets/" + name + ".png")
    else if (name.startsWith("https://") || name.startsWith("http://"))
        return name;
    else
        return toFileUrl(name);
}




// ─────────────────────────────────────────────────────────────────────────────
// In-app image preview lightbox
//
// Previously, open_popup() opened a SEPARATE OS window via
// window.open(..., '_blank', ...) — so clicking a generated image (or a history
// image) popped a second window OUTSIDE the app (frameless on macOS, and the
// file:// image embedded in a data: URI was not guaranteed to load at all).
// This is now a full-screen lightbox rendered inside the app window:
//
//   • click backdrop / Esc / ×  → close
//   • mouse wheel / + / −       → zoom (cursor-anchored)
//   • drag                      → pan (when zoomed in)
//   • ← / → arrow keys          → previous / next image in the same generation group
//   • 0                         → reset zoom
// ─────────────────────────────────────────────────────────────────────────────

let lightbox_state = null;
let lightbox_style_injected = false;

function ensure_lightbox_style() {
    if (lightbox_style_injected) return;
    lightbox_style_injected = true;
    const style = document.createElement('style');
    style.textContent = `
        .dbee-lightbox {
            position: fixed; inset: 0; z-index: 2147483000;
            background: rgba(6, 6, 10, 0.94);
            display: flex; align-items: center; justify-content: center;
            user-select: none; -webkit-user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, "Helvetica Neue", Arial, sans-serif;
            animation: dbee-lightbox-fade 0.18s ease-out;
        }
        @keyframes dbee-lightbox-fade { from { opacity: 0; } to { opacity: 1; } }
        .dbee-lightbox-stage {
            position: relative; width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            overflow: hidden; cursor: default;
        }
        .dbee-lightbox-img {
            display: block;
            max-width: 92%; max-height: 92%;
            object-fit: contain; border-radius: 6px;
            box-shadow: 0 12px 64px rgba(0, 0, 0, 0.65);
            transform-origin: 0 0; will-change: transform;
        }
        .dbee-lightbox-loading {
            position: absolute;
            width: 44px; height: 44px; border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.15);
            border-top-color: rgba(255, 255, 255, 0.85);
            animation: dbee-lightbox-spin 0.9s linear infinite;
        }
        @keyframes dbee-lightbox-spin { to { transform: rotate(360deg); } }
        .dbee-lightbox-error {
            position: absolute;
            color: #fff; background: rgba(190, 45, 45, 0.9);
            padding: 10px 18px; border-radius: 8px; font-size: 14px;
        }
        .dbee-lightbox-close {
            position: absolute; top: 16px; right: 16px;
            width: 40px; height: 40px; border-radius: 50%;
            border: none; background: rgba(255, 255, 255, 0.08); color: #fff;
            font-size: 24px; line-height: 1; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .dbee-lightbox-close:hover { background: rgba(255, 255, 255, 0.2); }
        .dbee-lightbox-toolbar {
            position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
            display: flex; align-items: center; gap: 6px; max-width: calc(100vw - 40px);
            background: rgba(0, 0, 0, 0.55); border: 1px solid rgba(255, 255, 255, 0.14);
            padding: 6px 12px; border-radius: 999px;
            color: rgba(255, 255, 255, 0.92); font-size: 13px;
            backdrop-filter: blur(6px);
        }
        .dbee-lightbox-btn {
            border: none; background: transparent; color: rgba(255, 255, 255, 0.85);
            font-size: 15px; line-height: 1; cursor: pointer;
            min-width: 26px; height: 26px; border-radius: 6px;
        }
        .dbee-lightbox-btn:hover { background: rgba(255, 255, 255, 0.16); }
        .dbee-lightbox-counter { min-width: 46px; text-align: center; opacity: 0.85; }
        .dbee-lightbox-caption {
            max-width: 34vw; overflow: hidden; text-overflow: ellipsis;
            white-space: nowrap; opacity: 0.72; border-left: 1px solid rgba(255, 255, 255, 0.2);
            padding-left: 10px; margin-left: 4px;
        }
        .dbee-lightbox-nav {
            position: absolute; top: 50%; transform: translateY(-50%);
            width: 44px; height: 44px; border-radius: 50%;
            border: none; background: rgba(255, 255, 255, 0.08); color: #fff;
            font-size: 28px; line-height: 1; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .dbee-lightbox-nav:hover { background: rgba(255, 255, 255, 0.22); }
        .dbee-lightbox-prev { left: 16px; }
        .dbee-lightbox-next { right: 16px; }
        .dbee-lightbox-nav[hidden] { display: none; }
        .dbee-lightbox-btn[hidden] { display: none; }
        .dbee-lightbox-text {
            max-width: 70vw; color: rgba(255, 255, 255, 0.92);
            font-size: 16px; line-height: 1.6; text-align: center;
            word-break: break-word;
        }
    `;
    document.head.appendChild(style);
}

function destroy_lightbox() {
    const state = lightbox_state;
    if (!state) return;
    lightbox_state = null;
    window.removeEventListener('mousemove', state.on_mousemove);
    window.removeEventListener('mouseup', state.on_mouseup);
    document.removeEventListener('keydown', state.on_keydown);
    document.body.style.overflow = state.prev_body_overflow;
    if (state.backdrop && state.backdrop.parentNode) {
        state.backdrop.parentNode.removeChild(state.backdrop);
    }
}

// Builds the list of sibling images of the same generation group for the
// lightbox's prev/next navigation. `image_item_data` is the GalleryImage
// component instance that was clicked; its parent GalleryPane exposes the
// full group image list.
function gallery_item_context(image_item_data) {
    const pane = (image_item_data && image_item_data.$parent) || null;
    const items = (pane && Array.isArray(pane.image_data)) ? pane.image_data : [];
    return items
        .filter(x => x && x.image_url && x.image_url !== 'ERROR')
        .map(x => ({ image_url: x.image_url, description: x.description }));
}

function open_popup(img_url, text, images) {
    if (lightbox_state) destroy_lightbox();
    ensure_lightbox_style();

    const norm = (u) => String(u || '').replace(/^file:\/\//, '');

    let imgs = (Array.isArray(images) ? images : [])
        .filter(x => x && x.image_url && x.image_url !== 'ERROR');
    if (!imgs.length && img_url) {
        imgs = [{ image_url: img_url, description: text }];
    }

    // Legacy text-only popup, rendered in-app instead of an OS window.
    // Folded into the same lightbox_state machinery so a later image popup
    // destroys it (and its Esc listener) instead of leaving it lingering.
    if (!imgs.length) {
        if (!text) return;
        const backdrop = document.createElement('div');
        backdrop.className = 'dbee-lightbox';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        const p = document.createElement('div');
        p.className = 'dbee-lightbox-text';
        p.textContent = text;
        backdrop.appendChild(p);
        const on_key = (e) => { if (e.key === 'Escape') destroy_lightbox(); };
        document.addEventListener('keydown', on_key);
        backdrop.addEventListener('click', () => destroy_lightbox());
        document.body.appendChild(backdrop);
        lightbox_state = {
            backdrop,
            on_keydown: on_key,
            on_mousemove: null,
            on_mouseup: null,
            prev_body_overflow: document.body.style.overflow,
        };
        return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'dbee-lightbox';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const stage = document.createElement('div');
    stage.className = 'dbee-lightbox-stage';

    const imgEl = new Image();
    imgEl.className = 'dbee-lightbox-img';
    imgEl.alt = '';

    const loading = document.createElement('div');
    loading.className = 'dbee-lightbox-loading';

    const errorEl = document.createElement('div');
    errorEl.className = 'dbee-lightbox-error';
    errorEl.style.display = 'none';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'dbee-lightbox-nav dbee-lightbox-prev';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.title = 'Previous (←)';
    const nextBtn = document.createElement('button');
    nextBtn.className = 'dbee-lightbox-nav dbee-lightbox-next';
    nextBtn.innerHTML = '&#8250;';
    nextBtn.title = 'Next (→)';

    const toolbar = document.createElement('div');
    toolbar.className = 'dbee-lightbox-toolbar';
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'dbee-lightbox-btn';
    zoomOutBtn.textContent = '−';
    zoomOutBtn.title = 'Zoom out (−)';
    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'dbee-lightbox-btn';
    zoomInBtn.textContent = '+';
    zoomInBtn.title = 'Zoom in (+)';
    const zoomResetBtn = document.createElement('button');
    zoomResetBtn.className = 'dbee-lightbox-btn';
    zoomResetBtn.textContent = '1:1';
    zoomResetBtn.title = 'Reset zoom (0)';
    // Only shown for local files (hidden for remote/data URLs) — lets the
    // user open the full-resolution file in the OS default viewer.
    const openBtn = document.createElement('button');
    openBtn.className = 'dbee-lightbox-btn dbee-lightbox-open';
    openBtn.textContent = 'Open';
    openBtn.title = 'Open in default viewer';
    const counter = document.createElement('span');
    counter.className = 'dbee-lightbox-counter';
    const caption = document.createElement('span');
    caption.className = 'dbee-lightbox-caption';
    caption.style.display = 'none';

    toolbar.appendChild(zoomOutBtn);
    toolbar.appendChild(zoomInBtn);
    toolbar.appendChild(zoomResetBtn);
    toolbar.appendChild(openBtn);
    toolbar.appendChild(counter);
    toolbar.appendChild(caption);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dbee-lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close (Esc)';
    closeBtn.setAttribute('aria-label', 'Close preview');

    stage.appendChild(loading);
    stage.appendChild(errorEl);
    stage.appendChild(imgEl);
    backdrop.appendChild(stage);
    backdrop.appendChild(prevBtn);
    backdrop.appendChild(nextBtn);
    backdrop.appendChild(toolbar);
    backdrop.appendChild(closeBtn);
    document.body.appendChild(backdrop);

    const state = {
        backdrop, stage, img: imgEl,
        images: imgs,
        index: 0,
        zoom: 1, panX: 0, panY: 0,
        dragging: false,
        prev_body_overflow: document.body.style.overflow,
    };
    document.body.style.overflow = 'hidden';

    function apply_transform() {
        state.img.style.transform =
            'translate(' + state.panX + 'px, ' + state.panY + 'px) scale(' + state.zoom + ')';
    }

    function update_cursor() {
        state.img.style.cursor = state.zoom > 1 ? 'grab' : 'zoom-in';
    }

    function set_zoom(next, anchor_client_x, anchor_client_y) {
        next = Math.min(8, Math.max(1, next));
        if (next === state.zoom) return;
        const ratio = next / state.zoom;
        if (anchor_client_x !== undefined && anchor_client_y !== undefined) {
            const rect = state.img.getBoundingClientRect();
            const px = anchor_client_x - rect.left;
            const py = anchor_client_y - rect.top;
            state.panX = px - px * ratio + state.panX * ratio;
            state.panY = py - py * ratio + state.panY * ratio;
        }
        state.zoom = next;
        apply_transform();
        update_cursor();
    }

    function zoom_by(factor) {
        const rect = state.img.getBoundingClientRect();
        set_zoom(state.zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function reset_zoom() {
        const rect = state.img.getBoundingClientRect();
        set_zoom(1, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function set_image(i, keep_zoom) {
        i = Math.max(0, Math.min(state.images.length - 1, i));
        state.index = i;
        if (!keep_zoom) {
            state.zoom = 1; state.panX = 0; state.panY = 0;
        }
        apply_transform();
        update_cursor();

        const item = state.images[i];
        loading.style.display = 'block';
        errorEl.style.display = 'none';
        imgEl.style.display = 'none';
        caption.style.display = item.description ? 'block' : 'none';
        if (item.description) caption.textContent = item.description;
        counter.textContent = (i + 1) + ' / ' + state.images.length;
        prevBtn.hidden = state.images.length < 2;
        nextBtn.hidden = state.images.length < 2;
        // 'Open in default viewer' only makes sense for local files.
        const curUrl = toFileUrl(item.image_url);
        openBtn.hidden = !(curUrl && curUrl.startsWith('file://'));

        imgEl.onload = () => {
            loading.style.display = 'none';
            imgEl.style.display = 'block';
        };
        imgEl.onerror = () => {
            loading.style.display = 'none';
            errorEl.textContent = 'Could not load image';
            errorEl.style.display = 'block';
        };
        imgEl.src = toFileUrl(item.image_url);
    }

    function nav(delta) {
        if (state.images.length < 2) return;
        set_image(state.index + delta, false);
    }

    function on_wheel(e) {
        e.preventDefault();
        // Cursor-anchored zoom (same factor as the +/- buttons).
        set_zoom(state.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
    }

    function on_mousedown(e) {
        if (state.zoom <= 1) return;
        e.preventDefault();
        state.dragging = true;
        state.drag_start_x = e.clientX;
        state.drag_start_y = e.clientY;
        state.pan_start_x = state.panX;
        state.pan_start_y = state.panY;
        state.img.style.cursor = 'grabbing';
    }

    function on_mousemove(e) {
        if (!state.dragging) return;
        state.panX = state.pan_start_x + (e.clientX - state.drag_start_x);
        state.panY = state.pan_start_y + (e.clientY - state.drag_start_y);
        apply_transform();
    }

    function on_mouseup() {
        if (!state.dragging) return;
        state.dragging = false;
        update_cursor();
        // A click that ends a pan (mouseup lands on the stage, not the image)
        // would otherwise synthesize a click on the stage and close the
        // lightbox — remember the pan so the next click is ignored.
        state.just_panned = true;
    }

    function on_keydown(e) {
        if (e.key === 'Escape') {
            destroy_lightbox();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            nav(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            nav(-1);
        } else if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            zoom_by(1.25);
        } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            zoom_by(1 / 1.25);
        } else if (e.key === '0') {
            e.preventDefault();
            reset_zoom();
        }
    }

    state.on_mousemove = on_mousemove;
    state.on_mouseup = on_mouseup;
    state.on_keydown = on_keydown;
    window.addEventListener('mousemove', on_mousemove);
    window.addEventListener('mouseup', on_mouseup);
    document.addEventListener('keydown', on_keydown);

    stage.addEventListener('wheel', on_wheel, { passive: false });
    stage.addEventListener('mousedown', on_mousedown);
    zoomInBtn.addEventListener('click', () => zoom_by(1.25));
    zoomOutBtn.addEventListener('click', () => zoom_by(1 / 1.25));
    zoomResetBtn.addEventListener('click', () => reset_zoom());
    closeBtn.addEventListener('click', () => destroy_lightbox());
    prevBtn.addEventListener('click', () => nav(-1));
    nextBtn.addEventListener('click', () => nav(1));
    openBtn.addEventListener('click', () => {
        const url = toFileUrl(state.images[state.index].image_url);
        if (!url || !url.startsWith('file://')) return;
        if (window.ipcRenderer && typeof window.ipcRenderer.sendSync === 'function') {
            window.ipcRenderer.sendSync('open_path', url);
        }
    });

    // Clicking the backdrop (outside the image) closes the preview.
    backdrop.addEventListener('click', (e) => {
        if (state.just_panned) {
            state.just_panned = false;
            return;
        }
        if (e.target === backdrop || e.target === stage) destroy_lightbox();
    });

    lightbox_state = state;
    const start_index = img_url ? imgs.findIndex(x => norm(x.image_url) === norm(img_url)) : 0;
    set_image(start_index < 0 ? 0 : start_index, false);
}


function addImageProcess(src){
    return new Promise((resolve, reject) => {
      let img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

// this will only be called when the user clicks to upload thier data for sharing. 
async function temp_upload_img(img_path) {
    let img_tag = await addImageProcess("file://" + img_path)
    let file = await fetch(img_tag.src);
    let blob = await file.blob()
    file =  await new File([blob], 'bee_file'+Math.random()+'.png', blob)

    try {
       let x = await fetch('https://bee.transfr.one/file.png', {
            method: 'PUT',
            body: file 
        });
        if(x.status != 200)
             throw 'Could not upload';
        x = await (await x.text()).toString().replaceAll("\n" , "");
        return x;
    } catch (error) {
        throw 'Could not upload';
    }
  
  }

// this will only be called when the user clicks to upload thier data for sharing. 
async function share_on_arthub(imgs , params,  prompt ) {
    let urls = [];

    for(let im of imgs)
        if(im != 'nsfw')
            urls.push( await temp_upload_img(im))

    console.log(urls.join(','))

    let share_url = "https://arthub.ai/upload?";

    params = JSON.parse(JSON.stringify(params))


    share_url += "description="+ prompt + "&";
    if(!params.model_version)
        params.model_version = ""
    params.model_version = "DiffusionBee" + params.model_version + (params.Model? "_"+params.Model : "") ;
    share_url += "params="+ JSON.stringify(params) + "&"
    share_url += "images="+ urls.join(',')
    window.ipcRenderer.sendSync('open_url', share_url );
}


function form_params_to_readable_dict(form_params){

    let r = {};
    let vals = {"seed" : "Seed" , "guidence_scale" : "Scale" , "num_steps":"Steps"  ,  "steps":"Steps"  ,  "guidance_scale": "Guidance Scale",
          "inp_img_strength" : "Image Strength" , "input_image_strength": "Image Strength"  , "img_width":"Img Width" , "img_height": "Img Height" , 
           "negative_prompt" : "Negative Prompt" , "model_version":"model_version", "scheduler":"Sampler" , 
           "selected_sd_model" : "Model", "controlnet_model" : "ControlNet" , "applet_name" : "Mode", 
           "small_mod_seed":"Small Modification Seed", "controlnet": "controlnet" , "controlnet_preprocess":"controlnet_preprocess" , "control_weight":"ControlNet Importance" , "is_clip_skip_2": "Clip Skip 2"}

    for(let k in vals)
        if( form_params[k])
            r[vals[k]] =  form_params[k];

    return r;
   
}


// convert the dict from the output of a form to readable text
function form_params_to_text(form_params){
    let t = ""
   let r = form_params_to_readable_dict(form_params)
    for(let k in r)
            t += " " +k  +  " : " + r[k] + " |";
    if(t.charAt(t.length - 1) == "|")
        t = t.slice(0, -1);
    return t;

}

function find_in_form_recursive(id , form_elements){
    for(let el of form_elements ){
        if(el.id == id){
            return el 
        }

        if(el.children){
            let ans =  find_in_form_recursive(id , el.children)
            if(ans)
                return ans
        }
    }
    return undefined
}


function migrate_history_only_once( current_new_history ){

    let v =  window.ipcRenderer.sendSync('load_data', 'migration_data.json');
    if(v.is_history_migrated){
        console.log("already migrated hisro")
         return {};
    }


    let app_data_v1 =  window.ipcRenderer.sendSync('load_data', 'data.json');
    let new_history = {}

    //todo make sure it only runs once 

    if(app_data_v1.history){
        let old_hisotry = app_data_v1.history
        console.log(old_hisotry)
        for(let k in old_hisotry){

            // let a = 2
            // if(a > 1)
            //     continue

            if(current_new_history[k])
                continue

    

            let new_item = {}
            let old_item = old_hisotry[k]
            let old_aux_img_url = undefined
            if(old_item.controlnet && old_item.controlnet_preprocess == "Yes" ){
                // remove first image 
                old_aux_img_url = old_item.imgs.shift();
            }

            new_item.group_id = k;
            new_item.img_height = old_item.img_h;
            new_item.img_width = old_item.img_w;
            new_item.key = k;
            new_item.num_imgs = old_item.imgs.length;
            new_item.prompt = old_item.prompt;
            new_item.params = {}
            new_item.params.applet_name = "txt2img"

            if(old_item.inp_img && !(old_item.controlnet) ){
                new_item.params.applet_name = "img2img"
                new_item.params.input_image_strength = old_item.inp_img_strength
                new_item.params.input_image_with_mask = old_item.inp_img
                new_item.params.input_img = old_item.inp_img
            }

            new_item.params.num_imgs = 1
            if(old_item.dif_steps)  
                new_item.params.num_steps = old_item.dif_steps
            new_item.params.img_height =  old_item.img_h;
            new_item.params.img_width =  old_item.img_w;
            new_item.params.is_adv_mode = true 
            new_item.params.job_state = "done"
            if( old_item.selected_sampler)
                new_item.params.scheduler = old_item.selected_sampler
            
            new_item.params.guidance_scale = old_item.guidence_scale 
            new_item.params.controlnet_model = old_item.controlnet
            if(old_item.controlnet){
                new_item.params.controlnet_input_image_path = old_item.inp_img

            }
            if(old_item.controlnet_preprocess == "Yes"){
                new_item.do_controlnet_preprocess = true
            }

            new_item.params.prompt = new_item.prompt

            new_item.params.seed = old_item.seed 
            new_item.params.selected_sd_model = old_item.model_version
            
            new_item.params.raw_form_options = JSON.parse(JSON.stringify(new_item.params))

            new_item.imgs = []
            for(let i=0; i< new_item.num_imgs ; i++ ){
                let img_item = {}
                img_item.description = new_item.prompt
                img_item.done_percentage = -1 
                img_item.image_url = old_item.imgs[i]
                img_item.params = JSON.parse(JSON.stringify(new_item.params))

                if(old_item.controlnet){
                    img_item.aux_img_url = old_aux_img_url
                }

                img_item.params.seed += 1234*i 
                img_item.params.raw_form_options = JSON.parse(JSON.stringify(img_item.params))
                new_item.imgs.push(img_item)
            }

            // add_to_history(k ,new_item  )
            console.log("migrated item")
            console.log(new_item)
            new_history[k] = new_item
        }
    }

    
    v.is_history_migrated = true;
    window.ipcRenderer.sendSync('save_data', v , "migration_data.json");


    return new_history;
}


export { compute_n_cols , compute_time_remaining , resolve_asset_illustration , toFileUrl , simple_hash , open_popup, gallery_item_context, share_on_arthub, form_params_to_text, find_in_form_recursive, form_params_to_readable_dict, migrate_history_only_once}