// Static metadata for all page components.
// Allows PagesRouter to build navigation without eagerly loading page components.
export const pageMeta = {
  Homepage: {
    title: 'Home',
    icon: 'home',
    home_category: undefined,
    sidebar_show: 'always'
  },
  Txt2Img: {
    title: 'Text to image',
    icon: 'file-image',
    description: 'Generate images with text descriptions',
    img_icon: require('../assets/imgs/page_icon_imgs/txt2img.png'),
    home_category: 'main',
    sidebar_show: 'always'
  },
  Img2Img: {
    title: 'Image to image',
    icon: 'images',
    description: 'Transform images with text descriptions',
    img_icon: require('../assets/imgs/page_icon_imgs/img2img.png'),
    home_category: 'main',
    sidebar_show: 'always'
  },
  Inpainting: {
    title: 'Inpainting',
    icon: 'paint-brush',
    description: 'Add or remove objects from an image',
    img_icon: require('../assets/imgs/page_icon_imgs/inpainting.png'),
    home_category: 'main',
    sidebar_show: 'always'
  },
  PostProcessImage: {
    title: 'Upscaler',
    icon: 'expand-arrows-alt',
    description: 'Use AI to increase the resolution of an image.',
    img_icon: require('../assets/imgs/page_icon_imgs/upscale.png'),
    home_category: 'main',
    sidebar_show: 'always'
  },
  ModelStore: {
    title: 'Models',
    icon: 'cubes',
    description: 'Download, imoport and manage models',
    img_icon: require('../assets/imgs/page_icon_imgs/models.png'),
    home_category: 'pages',
    sidebar_show: 'always'
  },
  History: {
    title: 'History',
    icon: 'history',
    description: 'View generated images',
    img_icon: require('../assets/imgs/page_icon_imgs/history.png'),
    home_category: 'pages',
    sidebar_show: 'always'
  },
  PromptLibrary: {
    title: 'Prompt Library',
    icon: 'magic',
    description: 'Browse, remix and generate prompts with Ollama',
    img_icon: require('../assets/imgs/page_icon_imgs/default.png'),
    home_category: 'pages',
    sidebar_show: 'always'
  },
  Training: {
    title: 'Training',
    icon: 'file',
    description: 'Train a model on your own images using DreamBooth.',
    img_icon: require('../assets/imgs/page_icon_imgs/training.png'),
    home_category: 'main'
  },
  Settings: {
    title: 'Settings',
    icon: 'tools',
    img_icon: require('../assets/imgs/page_icon_imgs/settings.png'),
    home_category: 'pages'
  },
  Logs: {
    title: 'Logs',
    icon: 'file',
    img_icon: require('../assets/imgs/page_icon_imgs/default.png'),
    home_category: undefined,
    sidebar_show: 'never'
  },
  ContactUs: {
    title: 'Contact Us',
    icon: 'file',
    img_icon: require('../assets/imgs/page_icon_imgs/default.png'),
    home_category: undefined,
    sidebar_show: 'never'
  }
}
