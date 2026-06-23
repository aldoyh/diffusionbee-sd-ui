/**
 * DiffusionBee GUI — Prompt Library
 *
 * A dramatically amazing, curated collection of high-quality prompts
 * organized by category/style. Each prompt is carefully crafted for
 * Stable Diffusion to produce stunning, detailed results.
 *
 * The library also persists user-generated prompts and tracks which
 * ones have been used for inference.
 */

// ─── Built-in Curated Prompts ───────────────────────────────────────────────

const CATEGORIES = {
  cinematic: {
    name: 'Cinematic',
    nameArabic: 'سينمائي',
    icon: '🎬',
    description: 'Epic, movie-quality scenes with dramatic lighting and composition',
  },
  fantasy: {
    name: 'Fantasy',
    nameArabic: 'خيالي',
    icon: '🐉',
    description: 'Magical realms, mythical creatures, and enchanted landscapes',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    nameArabic: 'سايبربانك',
    icon: '🌃',
    description: 'Neon-lit futures, tech-noir aesthetics, and dystopian cityscapes',
  },
  nature: {
    name: 'Nature & Landscapes',
    nameArabic: 'طبيعة ومناظر',
    icon: '🌄',
    description: 'Breathtaking natural scenery, forests, mountains, and oceans',
  },
  portraits: {
    name: 'Portraits',
    nameArabic: 'صور شخصية',
    icon: '👤',
    description: 'Stunning character portraits with rich detail and emotion',
  },
  surreal: {
    name: 'Surreal & Abstract',
    nameArabic: 'سريالية',
    icon: '🌀',
    description: 'Dreamlike, impossible scenes that bend reality',
  },
  architecture: {
    name: 'Architecture',
    nameArabic: 'هندسة معمارية',
    icon: '🏛️',
    description: 'Magnificent buildings, interiors, and urban environments',
  },
  'sci-fi': {
    name: 'Sci-Fi',
    nameArabic: 'خيال علمي',
    icon: '🚀',
    description: 'Futuristic technology, space exploration, and alien worlds',
  },
  steampunk: {
    name: 'Steampunk',
    nameArabic: 'ستيم بانك',
    icon: '⚙️',
    description: 'Victorian-era technology meets clockwork fantasy',
  },
  anime: {
    name: 'Anime',
    nameArabic: 'أنمي',
    icon: '🍱',
    description: 'Cel-shaded characters, vibrant skies, and detailed anime backgrounds',
  },
  illustration: {
    name: 'Illustration',
    nameArabic: 'رسم توضيحي',
    icon: '🎨',
    description: 'Painterly scenes, ink washes, and editorial illustration styles',
  },
  '3d_render': {
    name: '3D Render',
    nameArabic: 'رسم ثلاثي الأبعاد',
    icon: '🧊',
    description: 'Clean product renders, studio lighting, and stylized 3D scenes',
  },
  sketch: {
    name: 'Sketch',
    nameArabic: 'رسم يدوي',
    icon: '✏️',
    description: 'Pencil studies, ink linework, and gestural architectural drawings',
  },
  horror: {
    name: 'Horror & Dark',
    nameArabic: 'رعب',
    icon: '👻',
    description: 'Eerie, unsettling, and beautifully macabre atmospheres',
  },
  food: {
    name: 'Food & Drink',
    nameArabic: 'طعام وشراب',
    icon: '🍜',
    description: 'Mouth-watering culinary creations and elegant presentations',
  },
  animals: {
    name: 'Animals & Creatures',
    nameArabic: 'حيوانات',
    icon: '🦊',
    description: 'Majestic wildlife, fantastical beasts, and adorable pets',
  },
};

// 200+ hand-crafted prompts organized by category
const PROMPTS_BY_CATEGORY = {
  cinematic: [
    'A lone samurai standing on a misty mountain peak at dawn, golden sunlight piercing through clouds, epic cinematic composition, dramatic shadows, volumetric lighting, award-winning photography, 8K ultra detailed',
    'An old fisherman pulling his net from a stormy sea at twilight, lightning illuminating the waves, hyperrealistic, cinematic lighting, dramatic sky, moody atmosphere, masterpiece',
    'A vintage red telephone booth in a London fog, cobblestone street glistening after rain, warm amber street lamps, cinematic depth of field, film grain texture, nostalgic atmosphere, award-winning cinematography',
    'A spacecraft hovering above a neon-lit futuristic city at dusk, rain reflecting city lights, cinematic composition, blade runner aesthetic, dramatic clouds, ultra detailed',
    'A lone astronaut kneeling on an alien planet with two moons rising, bioluminescent flora glowing blue, cosmic dust in the atmosphere, cinematic lighting, breathtaking vista, hyperrealistic',
    'A desert caravan crossing endless golden dunes at golden hour, long shadows stretching across sand, warm amber tones, cinematic wide shot, atmospheric dust particles, national geographic photography',
    'A warrior woman standing on a clifftop, long hair whipping in the wind, dramatic sunset behind her, spear in hand, cinematic composition, heroic lighting, golden hour glow, epic fantasy aesthetic',
    'A submarine descending into a deep ocean trench, massive ancient ruins visible in the distance, bioluminescent creatures, dramatic lighting, cinematic perspective, mysterious atmosphere, ultra realistic',
    'Two lovers embracing in a rain-soaked street at midnight, neon signs reflecting in puddles, cinematic lighting, romantic atmosphere, film grain, shallow depth of field, emotional composition',
    'A lone helicopter approaching an abandoned oil rig in the middle of a stormy ocean, lightning strikes, towering waves, dramatic cinematic shot, moody atmosphere, photorealistic',
    'A medieval knight in full armor kneeling before an ancient cathedral altar, rays of light streaming through stained glass, dust particles dancing in light beams, cinematic composition, dramatic shadows',
    'A vintage muscle car speeding along an empty desert highway at sunset, dust kicked up behind it, vibrant orange and purple sky, cinematic tracking shot, motion blur, warm filmic tones',
    'A spy in a trench coat walking through a crowded night market in Hong Kong, red lanterns above, steam rising from food stalls, cinematic lighting, dense atmosphere, vibrant colors',
    'A rocket launch viewed from the beach at dawn, crowds silhouetted against the bright exhaust plume, dramatic clouds illuminated from below, epic scale, cinematic composition, inspiring moment',
    'An old lighthouse battered by waves during a violent storm, lone beam cutting through fog and rain, dramatic chiaroscuro lighting, cinematic shot, moody atmosphere, powerful ocean scene',
  ],

  fantasy: [
    'A majestic dragon with iridescent scales coiled around a crystal tower, bioluminescent runes glowing on the walls, magical atmosphere, ethereal lighting, fantasy art, intricate details, masterpiece',
    'A magical forest where giant mushrooms emit soft blue light, tiny fairy-like creatures with translucent wings floating between glowing spores, enchanted atmosphere, dreamlike, vibrant colors, ultra detailed',
    'An elven queen in a flowing gown of woven moonlight standing in an ancient forest clearing, trees glowing with golden magic, ethereal lighting, fantasy portrait, intricate jewelry, masterful composition',
    'A wizard casting a powerful spell in an ancient library, floating books swirling around him, magical energy crackling from his staff, dramatic lighting, intricate details, dusty atmosphere, epic fantasy',
    'A magical cottage nestled in an enchanted forest, smoke curling from the chimney, glowing windows, a winding path lined with luminescent flowers, cozy fantasy atmosphere, fairytale aesthetic',
    'An ancient stone circle under a aurora borealis-lit sky, mysterious glowing symbols on the monoliths, a hooded figure in the center, mystical atmosphere, fantasy landscape, ethereal light',
    'A phoenix rising from golden embers and flames, majestic wings spread wide, feathers of fire and light, dramatic composition, fantasy art, vibrant orange and gold colors, stunning detail',
    'An underwater kingdom of coral and crystal, mer-people swimming through sunlit waters, intricate architecture, schools of colorful fish, ethereal underwater lighting, fantasy seascape',
    'A giant ancient golem made of moss-covered stone, sitting motionless in a misty forest, vines and flowers growing over its shoulders, quiet atmosphere, mystical lighting, fantasy landscape',
    'A celestial being made of stardust and nebulae, floating in a cosmic void, galaxies swirling within translucent robes, ethereal beauty, cosmic fantasy art, vibrant colors, dreamlike composition',
    'A dark sorcerer in a throne room of black crystal, shadow magic swirling around him, glowing purple eyes under a hood, dramatic lighting, gothic fantasy atmosphere, intricate armor details',
    'A floating island with a crystal tower, waterfalls cascading off the edges into the clouds below, multiple moons in the sky, fantasy landscape, magical atmosphere, vibrant colors, epic scale',
    'A forest spirit made of intertwined branches and glowing moss, ancient and wise, standing guard in a misty woodland glade, mystical atmosphere, bioluminescent details, fantasy nature art',
    'A warrior angel with six wings standing on a cloud battlefield, golden armor gleaming, spear of light in hand, divine light breaking through dark storm clouds, epic fantasy composition',
    'A witch brewing potions in a cozy cottage laboratory, shelves lined with mysterious ingredients, floating candles illuminating the room, warm magical atmosphere, fantasy interior, intricate details',
  ],

  cyberpunk: [
    'A cybernetic samurai with neon red arm implants and a holographic katana, standing on a rain-soaked rooftop overlooking a neon-lit metropolis, blade runner aesthetic, cyberpunk, dramatic lighting',
    'A street-level view of a crowded night market in Neo-Tokyo, holographic advertisements towering above, vendors selling cybernetic enhancements, rain-slicked streets reflecting neon, dense cyberpunk atmosphere',
    'A hacker jacked into cyberspace, data streams and code flowing around their consciousness, digital landscape of geometric shapes and neon grids, cyberpunk, tron aesthetic, vibrant colors',
    'An android repair shop in a back alley, flickering neon signs, robotic parts hanging from the ceiling, a partly disassembled android sitting in the corner, gritty cyberpunk, detailed mechanical design',
    'A futuristic city skyline at dusk viewed through a rain-streaked window, neon signs and holographic billboards contrasting against the dark sky, cyberpunk aesthetic, cinematic mood, urban atmosphere',
    'A cybernetically enhanced street artist painting a massive mural with spray cans that leave trails of augmented reality light, futuristic street art, cyberpunk culture, vibrant graffiti, urban creativity',
    'The underside of a massive floating city, cascading waterfalls of recycled water, pipelines and scaffolding everywhere, tiny speeder bikes zipping between support columns, dystopian cyberpunk, epic scale',
    'A lone figure with a cybernetic eye and neural interface ports visible on their temple, walking through a neon-drenched alley, jacket collar turned up against the rain, cyberpunk noir, moody atmosphere',
    'An AI core chamber deep beneath a megacorp headquarters, massive crystalline processing units, blue holographic interfaces floating everywhere, a single technician dwarfed by the scale, sci-fi cyberpunk',
    'A futuristic motorcycle with holographic wheels parked outside a neon noodle bar, steam rising from street vents, reflections in puddles, cyberpunk aesthetic, detailed vehicle design, moody night scene',
    'A data broker in a trench coat and mirrored sunglasses at a virtual reality nightclub, holographic dancers, neon everything, cyberpunk social scene, vibrant colors, futuristic fashion, crowded atmosphere',
    'An abandoned factory repurposed into a underground fighting ring, spectators projected as holograms, two cyborg fighters in the ring sparks flying, gritty cyberpunk, dramatic lighting, action scene',
    'A rooftop garden in a vertical city, bioluminescent plants growing under artificial purple light, a solitary figure tending to the garden, nature meets technology, cyberpunk aesthetic, contemplative mood',
    'A cyberdeck interface floating in midair, holographic screens displaying code, data streams, and security system schematics, a gloved hand interacting with the display, cyberpunk UI, digital art',
    'An underground black market in a flooded subway station, vendors selling illegal neural implants and modded cyberware, underwater lights, makeshift stalls, gritty cyberpunk atmosphere, detailed scene',
  ],

  nature: [
    'A serene zen garden with cherry blossoms in full bloom, koi pond reflecting pink petals, morning mist hovering over the water, award-winning photography, peaceful atmosphere, vibrant colors',
    'A majestic waterfall plunging into a turquoise pool surrounded by lush tropical foliage, rays of sunlight piercing through the canopy, mist creating a rainbow, breathtaking natural landscape, ultra detailed',
    'A misty morning in a redwood forest, shafts of golden sunlight breaking through the tall trees, ferns and wildflowers covering the forest floor, ethereal atmosphere, national geographic photography',
    'A field of lavender stretching to the horizon at golden hour, rolling hills in the background, warm sunset light, dreamy atmosphere, vibrant purple and gold colors, peaceful countryside scene',
    'An aurora borealis dancing over a frozen lake in Iceland, snow-capped mountains silhouetted against the green and purple sky, starry night, breathtaking natural phenomenon, long exposure photography',
    'A coral reef teeming with colorful tropical fish, rays of sunlight filtering through crystal clear water, intricate coral formations, vibrant underwater scene, national geographic, aquatic paradise',
    'A desert oasis surrounded by golden sand dunes at sunset, palm trees reflected in still water, warm amber and orange tones, peaceful desert landscape, dramatic sky, incredible detail',
    'A snowy mountain peak catching the first light of dawn, clouds swirling around the summit, alpine meadow in the foreground with wildflowers, majestic landscape, dramatic lighting, pristine nature',
    'A secret garden hidden behind an old stone wall, overgrown with climbing roses and ivy, a stone fountain in the center, dappled sunlight filtering through leaves, romantic atmosphere, lush greenery',
    'A dramatic coastline with waves crashing against tall sea cliffs, spray catching the golden sunset light, a natural arch formation in the distance, powerful ocean scene, breathtaking view',
    'A bamboo forest path dappled with morning light, tall green stalks swaying gently, a small wooden bridge crossing a stream, peaceful and meditative atmosphere, Japanese garden aesthetic',
    'A volcanic landscape at twilight, glowing lava rivers flowing down the mountainside, starry sky above, dramatic contrast between fire and night, powerful natural forces, breathtaking scene',
    'A lotus flower blooming in a still pond at dawn, droplets of water on pink petals, soft morning mist, reflection in the water, serene and meditative, macro photography, exquisite detail',
    'A vast grassland with acacia trees silhouetted against an orange sunset, a giraffe family walking in the distance, warm African evening atmosphere, safari landscape, golden light, stunning vista',
    'An autumn forest path covered in fallen leaves in rich shades of red, orange, and gold, sunlight filtering through colorful canopy, peaceful seasonal atmosphere, vibrant colors, natural beauty',
  ],

  portraits: [
    'A portrait of an elderly Inuit woman with weathered face and kind eyes, traditional fur-lined parka, soft natural lighting from a window, wrinkles telling a lifetime of stories, intimate documentary portrait',
    'A young woman with vibrant blue hair and intricate floral tattoos, soft studio lighting, high fashion editorial style, bokeh background, striking eye contact, beauty portrait, flawless skin texture',
    'An old sailor with a white beard and weathered skin, deep blue eyes carrying ocean memories, worn captain hat, dramatic low-key lighting, character portrait, rich details, cinematic mood',
    'A geisha in traditional attire, red and gold kimono with intricate patterns, elegant updo with ornaments, soft diffused lighting, classical beauty, refined elegance, masterful portrait photography',
    'A street musician with a weathered face, playing guitar in a subway station, warm golden light illuminating him, steam rising from a coffee cup, candid portrait, urban atmosphere, authentic moment',
    'A proud Maasai warrior in traditional red shuka and beadwork, standing against a golden savanna sunset, dignified expression, warm rim lighting, cultural portrait, national geographic style',
    'A neon-lit portrait of a punk rocker with electric pink hair, leather jacket with patches, defiant expression, dramatic colored lighting, editorial fashion, vibrant contrast, bold attitude',
    'A ballet dancer mid-pose in a sunlit practice room, dust particles dancing in light beams, elegant form, graceful movement captured, soft natural lighting, artistic portrait, beautiful composition',
    'A close-up portrait of a person with striking heterochromia eyes (one blue one green), extreme detail showing iris patterns and skin texture, macro beauty shot, mesmerizing gaze, hyperrealistic',
    'A black and white portrait of a laughing elderly man, deep wrinkles around joyful eyes, genuine expression of happiness, classic film photography style, timeless emotional portrait, honest beauty',
    'A Bedouin man in traditional white robes and keffiyeh, standing in a desert landscape at golden hour, warm side lighting, dignified and proud, cultural portrait, dramatic desert atmosphere',
    'A cyberpunk character portrait with chrome facial implants, holographic eye display, high-tech collar, neon accent lighting, futuristic fashion, detailed sci-fi aesthetic, striking character design',
    'A portrait of a firefighter in full gear, face smudged with soot, tired but determined eyes, dramatic backlighting from emergency lights, heroic portrait, honest emotion, gritty realism',
    'A young child blowing dandelion seeds in a golden wheat field, soft dreamy lighting, warm summer atmosphere, innocence and wonder, candid moment, beautiful bokeh, nostalgic feeling',
    'A portrait of a scholarly librarian surrounded by towering bookshelves, round glasses, thoughtful expression, warm lamp light, cozy atmosphere, intellectual aesthetic, classic portrait composition',
  ],

  surreal: [
    'A clock melting over a tree branch in a desert landscape, inspired by Dalí, dreamlike atmosphere, impossible perspective, warm amber and cool blue contrast, surrealist art, thought-provoking',
    'A floating island with an upside-down waterfall flowing upward into the clouds, impossible architecture, vibrant color palette, dreamlike atmosphere, surreal landscape, magical realism, stunning detail',
    'An infinite library with shelves stretching endlessly in all directions, books floating like birds, a lone figure standing on a glass floor over a galaxy below, surreal scale, mind-bending perspective',
    'A giant hand made of clouds reaching down from the sky, fingers gently touching a tiny person standing on a hill, dreamlike scale contrast, soft golden lighting, surreal narrative, ethereal atmosphere',
    'An eye-shaped lake in a crystal forest, the pupil being a swirling galaxy, trees made of transparent crystal refracting light, surreal landscape, cosmic theme, vibrant colors, impossible geometry',
    'A staircase spiraling infinitely upward and downward through a starry void, doors floating at various levels, each door opening to a different season, surreal architecture, infinite dream, mesmerizing',
    'A tree growing from the inside of a grand piano, its roots wrapping around the strings, leaves sprouting from the keys, musical notes visible as golden particles in the air, surreal music art',
    'A city where buildings are made of stacked playing cards and dice, giant chess pieces in the streets, the sky checkered like a chessboard, surreal game-inspired landscape, playful atmosphere, vibrant colors',
    'A person whose silhouette is filled with a starry night sky, constellations visible within their form, standing on a cliff overlooking a cosmic landscape, surreal portrait, spiritual atmosphere, celestial theme',
    'An ocean where the waves are made of flowing fabric, a ship made of origami sailing on it, sky filled with floating paper lanterns, surreal seascape, origami aesthetic, dreamlike, beautiful colors',
    'A clock tower floating sideways in the sky, time visible as golden numbers floating away, an hourglass with sand flowing upward, surreal time-bending scene, impossible perspective, philosophical atmosphere',
    'A desert where cacti bloom with glowing neon flowers under a purple twilight sky with two suns, alien surreal landscape, vibrant bioluminescence, dreamlike atmosphere, otherworldly beauty',
    'A room where the floor is a frozen lake with stars visible beneath the ice, furniture floating upside down from the ceiling, a fireplace floating in the center, surreal interior, spatial disorientation',
    'A giant jellyfish floating through clouds, its tentacles trailing like ribbons, carrying tiny glowing ecosystems within its translucent body, surreal sky creature, dreamlike, ethereal beauty',
    'A portrait of a woman made entirely of flowers, petals forming her features, vines creating her hair, butterflies emerging from her eyes, surreal floral composition, vibrant colors, intricate detail',
  ],

  architecture: [
    'A massive gothic cathedral interior with towering stone columns, intricate rose window casting colorful light, vaulted ceilings disappearing into shadow, dramatic chiaroscuro, awe-inspiring scale',
    'A futuristic library with sweeping organic curves, walls lined with books that float in levitating shelves, warm wooden tones contrasted with cool natural light, innovative architecture, serene atmosphere',
    'An ancient roman amphitheater at sunset, weathered stone walls glowing golden, wildflowers growing through cracks, dramatic sky, historical grandeur, beautiful decay, atmospheric lighting',
    'A minimalist Japanese temple surrounded by a zen garden with raked sand patterns, clean geometric lines, warm wood and paper screens, peaceful atmosphere, traditional architecture, harmony with nature',
    'A brutalist concrete structure transformed by cascading green vines and hanging gardens, nature reclaiming architecture, dramatic shadows and geometric patterns, atmospheric, urban exploration aesthetic',
    'An ornate art nouveau metro station entrance with flowing ironwork, green patina, glowing glass lamps, intricate botanical motifs, elegant historical architecture, warm evening lighting, Parisian charm',
    'A futuristic city center with bubble-like transparent buildings connected by sky bridges, lush vertical gardens, people walking on multiple levels, utopian architecture, bright daylight, vibrant urban life',
    'An abandoned industrial factory hall, massive rusted machinery, rays of light piercing through broken roof panels, dramatic decay, atmospheric mood, post-industrial aesthetic, rich textures',
    'A palace interior in the style of the Alhambra, intricate geometric tilework, horseshoe arches, reflecting pools, ornate stucco carvings, warm ambient light, Islamic architecture, breathtaking detail',
    'A treehouse village in a giant ancient forest, wooden bridges connecting platforms and huts built around massive tree trunks, warm lantern light, whimsical architecture, cozy atmosphere, fantasy realism',
    'An art deco skyscraper lobby with geometric patterns, brass and marble details, stepped ceiling design, grand chandelier, elegant sophistication, 1920s glamour, warm golden lighting, luxurious',
    'A modern glass house nestled in a rocky desert landscape, floor-to-ceiling windows reflecting the sunset, minimalist interior visible, harmony between architecture and nature, dramatic location',
    'A steampunk airship dock tower, brass and copper construction, giant gears visible, zeppelins moored at various levels, Victorian-gothic details, complex mechanical design, cloudy sky background',
    'An underground city carved from crystal caves, translucent buildings glowing from within, crystal pillars supporting a massive cavern ceiling, magical atmosphere, otherworldly architecture, ethereal lighting',
    'A traditional Moroccan riad courtyard with central fountain, intricate zellige tilework, carved cedar screens, orange trees in planters, warm afternoon light, serene atmosphere, architectural beauty',
  ],

  'sci-fi': [
    'A massive ring-shaped space station orbiting a ringed gas giant, golden solar panels reflecting starlight, tiny spacecraft coming and going, epic scale, hard sci-fi aesthetic, cosmic background',
    'A colonized Mars landscape with glass domes containing cities, terraformed green areas contrasting with red desert, Earth visible in the sky, optimistic sci-fi, detailed colony infrastructure',
    'An alien marketplace on a space station, a wide variety of extraterrestrial species in colorful attire, exotic goods on display, holographic signs in alien scripts, vibrant sci-fi, crowded atmosphere',
    'A scientist in a clean white lab working on a quantum computer core, holographic schematics floating around, blue and white lighting, high-tech laboratory, hard sci-fi, focused atmosphere',
    'A massive generation ship interior with its own ecosystem, forests, rivers and fields under an artificial sky, distant habitation modules visible, utopian sci-fi, immense scale, hopeful atmosphere',
    'A derelict alien spacecraft crashed on a desolate moon, strange organic-mechanical hybrid architecture, eerie green glow from within, scifi horror aesthetic, mysterious atmosphere, detailed wreckage',
    'A cyborg soldier in advanced power armor with integrated weapon systems, HUD data visible in the helmet visor, futuristic military equipment, hard sci-fi, tactical pose, detailed armor design',
    'A terraforming operation on a barren world, massive atmospheric processors in the distance, lightning storms caused by the process, dramatic sci-fi landscape, industrial scale, stormy atmosphere',
    'A neural interface chamber where a person is connected to a vast computer network, data visualized as streams of light connecting to their mind, cybernetic imagery, digital consciousness concept',
    'An underground habitat on a lava planet, heat-resistant transparent domes, glowing lava flows visible outside, advanced geothermal technology, survival sci-fi, dramatic lighting, harsh environment',
    'A fleet of diverse alien spacecraft, some organic, some mechanical, approaching a mysterious cosmic anomaly, first contact scene, epic scale, vibrant colors against deep space, cinematic composition',
    'A quantum computing core floating in a vacuum chamber, pulses of light representing qubits, intricate cooling systems, advanced technology lab, blue and purple lighting, hard sci-fi aesthetic',
    'A virtual reality training simulator, warriors sparring in a digital arena that can morph into any environment, glitch effects at the edges, cyberpunk meets sci-fi, action scene, vibrant digital colors',
    'An asteroid mining facility with tunnels carved into the rock, zero-gravity processing chambers, workers in spacesuits, industrial sci-fi, detailed equipment, harsh lighting, realistic space infrastructure',
    'A post-human entity existing as pure energy and light, communicating with a human scientist through a holographic interface, transcendent sci-fi, ethereal beauty, cosmic scale, philosophical mood',
  ],

  steampunk: [
    'A majestic airship floating above Victorian London, brass and copper hull, massive propellers, canvas sails, steam vents, glowing lanterns hanging from the hull, detailed engineering, golden hour lighting',
    'A Victorian inventor workshop filled with intricate brass machines, gears of all sizes, steam pipes along the ceiling, a partially completed mechanical man on the workbench, warm lamplight, cozy chaos',
    'A steam-powered mechanical octopus with brass and copper tentacles, each ending in a different tool, glass dome observatory for a head, intricate gears visible, wasteland explorer, steampunk creation',
    'An elegant steam train with ornate brass fittings, luxurious velvet interiors, steam billowing as it crosses a towering bridge over a misty valley, Victorian grandeur, tea and crumpets atmosphere',
    'A steampunk airship battle above the clouds, multiple vessels exchanging cannon fire, propeller planes buzzing around, dramatic sky, adventure aesthetic, intricate vehicle designs, explosive action',
    'A clockwork heart made of interlocking brass gears and crystals, glowing with a warm inner light, delicate filigree work, intricate mechanical detail, steampunk art, beautiful craftsmanship, life metaphor',
    'A gentleman explorer in leather and brass goggles, holding a peculiar-looking scanning device, standing before an ancient temple door covered in gears, adventure aesthetic, mysterious atmosphere',
    'A steam-powered diving bell descending into an underwater city of brass and glass, giant mechanical sea creatures swimming past, Jules Verne aesthetic, underwater steampunk, blue-green atmosphere',
    'A Victorian-era street transformed with steam-powered street lamps and mechanical horses pulling carriages, cobblestone street, fog rolling in, elegant steampunk urban scene, moody atmosphere',
    'A mechanical dragon with brass scales and steam-exhaling nostrils, intricate gear joints visible, perched on a gothic tower, clockwork wings folded, steampunk fantasy, detailed metalwork, dramatic pose',
    'An eccentric scientist in a leather apron and goggles, surrounded by bubbling glass contraptions and Tesla coils, blue electricity arching between devices, mad scientist laboratory, dramatic lighting',
    'A steam-powered mechanical elephant used as a transport vehicle in an Indian-inspired steampunk setting, ornate brass howdah, intricate decorations, warm sunset, cultural fusion steampunk',
    'A clocktower interior with massive gears and pendulums, a lone clockmaker adjusting a delicate mechanism, warm dust-filled light, intricate machinery, steampunk atmosphere, focused craftsmanship',
    'A steam-powered battle mech with a pilot in the cockpit, brass armor plates, riveted joints, a massive steam cannon, Victorian military aesthetic, war machine, detailed mechanical design, imposing scale',
    'A tea shop run by an automaton, mechanical arms delicately pouring tea, brass and ceramic teapots, cozy steam-filled interior, Victorian elegance meets clockwork, whimsical steampunk, warm atmosphere',
  ],

  horror: [
    'An abandoned mental asylum hallway at night, flickering fluorescent lights, peeling paint, a wheelchair rocking gently by itself, deep shadows, eerie atmosphere, psychological horror, realistic textures',
    'A pale figure in a tattered white dress standing at the end of a foggy forest path, barefoot, head tilted unnaturally, trees like twisted fingers, dark atmospheric horror, misty moonlight, unsettling',
    'An antique Victorian doll with cracked porcelain face and missing button eye, sitting on a dusty nursery chair, dim candlelight, cobwebs, creepy atmosphere, horror still life, photorealistic',
    'A gothic cemetery under a blood-red moon, twisted dead trees, fog rolling between gravestones, a mausoleum door slightly ajar, dark horror atmosphere, dramatic lighting, eerie and beautiful',
    'A humanoid figure made entirely of shadow and smoke, two glowing red eyes, reaching out with clawed hands from a dark corner, supernatural horror, dramatic contrast, terrifying presence',
    'An abandoned carnival at night, rusty ferris wheel creaking in the wind, a carousel playing distorted music, tattered circus tents, creepy clown face peeking from behind a booth, atmospheric horror',
    'A mirror reflecting a person who looks exactly like them but with a sinister smile and completely black eyes, the reflection moving slightly out of sync, psychological horror, unsettling image',
    'A decrepit Victorian mansion on a stormy night, lightning illuminating its crumbling facade, a single lit window on the top floor, gothic horror atmosphere, dramatic sky, haunted house aesthetic',
    'A underground crypt with rows of stone sarcophagi, ancient symbols carved into walls, a strange mist seeping from cracks in the floor, torchlight casting dancing shadows, dark fantasy horror',
    'A group of mannequins in an abandoned department store, all facing the same direction except one that is turning its head, dim emergency lighting, liminal space horror, uncanny valley, tense atmosphere',
    'A forest where the trees have faces twisted in agony, roots that look like grasping hands, fog swirling around, pale ghostly figures between the trees, folk horror, dark fairytale, terrifying woodland',
    'An abandoned underwater research facility, algae-covered corridors, murky water, a divers flashlight revealing a shadowy figure in the distance, deep sea horror, claustrophobic, cosmic dread atmosphere',
    'A vintage photograph from 1890 showing a group of aristocrats, one figure in the background has completely black eyes and an impossibly wide smile, analog horror, found footage aesthetic, deeply unsettling',
    'A child nursery room at night, mobiles hanging from the ceiling, a rocking chair moving by itself, a closet door slightly open with something watching from the darkness, subtle horror, psychological dread',
    'A dark forest swamp with glowing will-o-wisps leading deeper into the marsh, gnarled cypress trees draped in Spanish moss, mist hovering over black water, southern gothic horror, eerie atmosphere',
  ],

  food: [
    'A gourmet sushi platter arranged like an art piece on a black slate board, vibrant tuna sashimi, glistening salmon roe, delicate microgreens, professional food photography, top-down view, exquisite detail',
    'A perfectly seared steak with herb butter melting on top, grilled asparagus, roasted baby potatoes, steam rising, dramatic dark background, warm amber lighting, food photography, mouth-watering',
    'A decadent chocolate lava cake being broken open, molten center flowing out, vanilla ice cream melting beside it, dusted with powdered sugar, macro food shot, warm dessert atmosphere, irresistible',
    'A colorful acai bowl with perfect symmetry, topped with fresh berries, sliced banana, granola, coconut flakes, and chia seeds, bright natural lighting, healthy food photography, vibrant aesthetic',
    'An artisanal wood-fired pizza with blistered crust, fresh mozzarella, basil leaves, cherry tomatoes, olive oil drizzle, captured pulling apart with cheese stretch, warm pizzeria atmosphere, authentic italian',
    'A high-end cocktail with a dramatic presentation, smoke trapped under a glass dome, citrus twist, edible flowers, dramatic bar lighting, craft cocktail photography, elegant and sophisticated',
    'A French patisserie display case filled with colorful macarons, delicate fruit tarts, cream puffs, and petit fours, glass and brass reflections, elegant lighting, pastry perfection, sweet temptation',
    'A steaming bowl of tonkotsu ramen with chashu pork, soft-boiled egg with runny yolk, nori, green onions, and sesame seeds, rich broth visible, steam swirling, comforting food photography',
    'A rustic charcuterie board with cured meats, aged cheeses, honeycomb, fig jam, fresh baguette slices, and wine grapes, wooden board texture, warm ambient lighting, entertaining spread, artisanal abundance',
    'A vibrant rainbow layer cake with cream cheese frosting, a slice removed revealing colorful layers, sprinkles scattered around, pastel celebration aesthetic, joyful food photography, party atmosphere',
    'A flat lay of Mediterranean mezze dishes, hummus with olive oil swirl, baba ganoush, stuffed grape leaves, warm pita bread, feta cheese and olives, bright natural lighting, travel food aesthetic',
    'A matcha latte with intricate latte art of a bamboo forest, vibrant green color, steam rising, ceramic cup, minimalist Japanese aesthetic, zen food photography, warm and soothing atmosphere',
    'A butcher paper shot of crispy fried chicken, golden waffles, butter melting, maple syrup drizzle, southern comfort food, warm golden lighting, indulgent aesthetic, crispy texture visible',
    'A molecular gastronomy dessert sphere being broken open, revealing layers of mousse, gel, and crumble, liquid nitrogen vapor spilling over, dramatic dark background, avant-garde food art, scientific precision',
    'A farmers market stall overflowing with colorful fresh produce, heirloom tomatoes, rainbow carrots, purple cauliflower, sunny morning lighting, organic abundance, rustic natural food photography',
  ],

  animals: [
    'A majestic snow leopard perched on a rocky cliff in the Himalayas, fur blending with the snowy background, piercing blue eyes, misty mountains in the distance, wildlife photography, incredible detail',
    'A curious red fox in a snowy forest, frost on its whiskers, morning sunlight filtering through snow-covered branches, winter wildlife, beautiful warm eyes, pristine natural setting, magical atmosphere',
    'A pod of orcas swimming in crystal clear turquoise water, sunlight streaming through the surface, dramatic perspective from below, majestic marine wildlife, powerful composition, breathtaking moment',
    'A great horned owl in flight at dusk, massive wings spread, golden eyes locked on target, soft feathers detailed, forest bokeh background, bird photography, dynamic action, beautiful lighting',
    'A mother elephant and her calf walking across the African savanna at golden hour, warm orange light silhouetting them, acacia trees in the background, emotional wildlife scene, stunning landscape',
    'A peacock displaying its magnificent tail feathers in a sunlit garden, iridescent blues and greens shimmering, intricate eye patterns, full display, stunning bird, vibrant colors, symmetrical composition',
    'A sea turtle gliding through a coral reef, sunlight dappling through clear water, colorful corals and fish around it, peaceful marine scene, underwater photography, serene atmosphere, beautiful detail',
    'A wolf pack running through a snow-covered forest, breath visible in the cold air, dynamic motion, majestic wilderness, dramatic lighting through trees, powerful wildlife composition, winter atmosphere',
    'A sloth hanging from a branch, slow peaceful expression, lush green rainforest background, dappled sunlight, cute wildlife portrait, relaxed atmosphere, beautiful bokeh, adorable creature',
    'A pair of majestic white swans forming a heart shape with their necks on a misty lake at dawn, still water reflecting the pink sky, romantic wildlife scene, elegant birds, serene atmosphere',
    'A tiger walking through tall grass in the Indian jungle, stripes creating camouflage, intense amber eyes looking directly at camera, golden light, powerful predator, national geographic style wildlife',
    'A colorful chameleon with intricate scales and patterns, curled tail, big expressive eyes, macro wildlife photography, incredible texture detail, vibrant green and blue colors, fascinating reptile',
    'A polar bear and her cubs on a melting ice floe, arctic blue water around them, moody sky, climate change narrative, emotional wildlife scene, stark beauty, powerful environmental message',
    'A flock of flamingos taking off from a pink salt lake at sunrise, wings spread wide, soft pink and orange reflections, synchronized motion, beautiful bird photography, vibrant colors, serene landscape',
    'A close-up of a bumblebee collecting pollen from a purple flower, wings in motion blur, pollen baskets full, macro insect photography, incredible detail, golden hour light, busy nature scene',
  ],

  anime: [
    'Anime key visual of a schoolgirl running through a Tokyo alley at sunset, cherry petals in the wind, cel shading, vibrant sky gradient, detailed background, Makoto Shinkai atmosphere',
    'Studio Ghibli meadow with wind in tall grass, a distant cottage, soft watercolor sky, gentle clouds, peaceful countryside, hand-painted anime background',
    'Cyberpunk anime street market at night, ramen stalls steaming, holographic ads in Japanese, neon pink and cyan, detailed crowd silhouettes, cinematic anime composition',
    'Magical girl transformation sequence in a starlit city rooftop, ribbons of light swirling, dynamic pose, sparkles and lens flare, shoujo anime style, vivid colors',
    'Samurai anime duel on a wooden bridge over a misty gorge, motion lines, dramatic wind, ink-brush influenced shading, intense eye contact, action key frame',
    'Cozy anime café interior, cat sleeping on the counter, rain on the window, warm interior lights, slice-of-life mood, soft cel shading, detailed props',
    'Mecha anime hangar bay with a giant robot being repaired, sparks flying, engineers in orange suits, industrial scale, detailed mechanical panels, dramatic perspective',
    'Fantasy anime witch brewing potions in a cluttered tower room, floating books, glowing ingredients, whimsical details, warm candlelight, charming character design',
    'Sports anime moment: sprinter crossing the finish line, sweat droplets frozen mid-air, stadium crowd blur, speed lines, emotional triumph, dynamic camera angle',
    'Underwater anime scene with a diver discovering a sunken temple, sun rays through water, schools of fish, ethereal blue palette, detailed ruins, serene wonder',
  ],

  illustration: [
    'Oil painting still life: copper kettle, sliced citrus on a linen cloth, Rembrandt-style chiaroscuro, visible brushstrokes, rich impasto highlights, classical composition',
    'Watercolor illustration of a Mediterranean hillside village, terracotta roofs, olive trees, loose pigment blooms, travel journal aesthetic, warm afternoon light',
    'Editorial illustration of a jazz musician in a smoky club, bold graphic shapes, limited palette of deep blue and gold, mid-century poster style, expressive linework',
    'Ink wash painting of a lone pine on a foggy mountain, minimalist composition, soft gray gradients, East Asian brush aesthetic, tranquil negative space',
    'Children\'s book illustration of a fox reading under a mushroom lamp, whimsical forest, soft textures, cozy bedtime mood, gentle pastel colors',
    'Art nouveau poster of a woman surrounded by peacock feathers and flowing hair, ornate borders, gold leaf accents, Alphonse Mucha inspired, decorative symmetry',
    'Gouache illustration of a rainy Paris street with umbrellas and cafés, impressionistic color blocks, reflective wet pavement, romantic European atmosphere',
    'Scientific botanical illustration of exotic orchids, precise linework, labeled petals, vintage naturalist plate style, cream paper background, educational beauty',
    'Dark fantasy illustration of a knight facing a mirror that shows a different world, gothic framing, muted jewel tones, storybook mystery, detailed engraving texture',
    'Flat vector illustration of a remote workspace on a cliff overlooking the ocean, geometric shapes, sunset gradient, modern editorial tech lifestyle aesthetic',
  ],

  '3d_render': [
    '3D render of a futuristic electric motorcycle in a white studio, brushed titanium body, soft HDRI lighting, octane render, product visualization, ultra clean materials',
    'Isometric 3D diorama of a cozy ramen shop in the rain, tiny neon sign, steam from bowls, low-poly charm, soft global illumination, playful miniature world',
    '3D architectural visualization of a glass pavilion in a snowy birch forest, warm interior glow against blue twilight, photoreal materials, clean modern lines',
    'Stylized 3D character bust of an astronaut with reflective visor showing a nebula, subsurface scattering on suit fabric, studio rim light, collectible figurine quality',
    '3D render of floating geometric crystals above a desert plateau, iridescent surfaces, dramatic sunset skybox, surreal product art, crisp reflections',
    'Cute 3D clay render of a sleeping red panda on a mossy stump, soft matte materials, pastel lighting, toy-like proportions, adorable studio scene',
    'Hard-surface 3D render of a retro sci-fi ray gun on a velvet display stand, chrome and bakelite materials, museum lighting, nostalgic future aesthetic',
    '3D food visualization of a gourmet burger with melting cheese and sesame bun, macro studio lighting, appetizing steam, commercial advertising quality',
  ],

  sketch: [
    'Pencil sketch of a medieval cathedral facade, loose cross-hatching for shadows, gestural lines, architectural study on textured paper, graphite drawing',
    'Ink sketch of a bustling fish market, quick confident strokes, selective wash of gray tone, travel sketchbook style, energetic urban scene',
    'Charcoal portrait sketch of an elderly craftsman, smudged shadows, expressive eyes, life drawing energy, rough paper grain visible',
    'Pen and ink sketch of a Japanese garden bridge over koi pond, fine linework, minimal shading, zen composition, sketchbook margin notes',
    'Gesture sketch of a dancer mid-leap, dynamic flowing lines, minimal detail, figure drawing study, movement captured in few strokes',
    'Urban sketch of a Brooklyn brownstone street, watercolor wash over ink lines, parked bicycles, fire escapes, plein air reportage style',
    'Technical sketch of a vintage camera exploded view, precise line weights, annotation arrows, industrial design drawing, blueprint aesthetic',
    'Rough concept sketch of a fantasy airship with sails and brass propellers, whiteboard marker style, ideation phase, loose exploratory linework',
  ],
};

// ─── Rotating inspiration hints (short, shown under the welcome title) ───────

const INSPIRE_LINES = {
  en: [
    'Portrait of a violinist mid-performance, stage lights catching rosin dust',
    'Brutalist library carved into a desert cliff at golden hour',
    'Studio Ghibli meadow — wind in tall grass, distant cottage, soft watercolor sky',
    'Macro shot: dew on a spiderweb at dawn, bokeh forest behind',
    'Isometric pixel art of a cozy ramen shop in the rain',
    'Art deco hotel lobby, marble floors, brass elevator doors, 1920s glamour',
    'Viking longship cutting through arctic fog, aurora overhead',
    'Street food stall at night — sizzling wok, neon menu, steam and chili oil',
    'Clay stop-motion forest spirit emerging from mossy roots',
    'Minimalist ink wash: lone pine on a foggy mountain',
    'Underwater kelp forest with sun rays and a sea turtle gliding through',
    'Retro 1950s diner, checkerboard floor, milkshake on chrome counter',
  ],
  ar: [
    'صورة لعازف كمان أثناء العزف، أضواء المسرح تلتقط غبار الصمغ',
    'مكتبة بروتالية منحوتة في جرف صحراوي عند الساعة الذهبية',
    'مرج بأسلوب استوديو جيبلي، ريح في العشب الطويل، كوخ بعيد، سماء مائية ناعمة',
    'لقطة ماكرو: ندى على شبكة عنكبوت عند الفجر، غابة ضبابية بالخلفية',
    'فن بكسل متساوي القياس لمتجر رامن مريح تحت المطر',
    'بهو فندق آرت ديكو، رخام، أبواب مصعد نحاسية، أناقة العشرينيات',
    'سفينة فايكنغ تقطع ضباب القطب الشمالي، وشفق يعلو السماء',
    'كشك طعام ليلي، مقلاة تطقطق، قائمة نيون، بخار وزيت فلفل حار',
    'روح غابة بأسلوب ستوب موشن طيني تخرج من جذور مغطاة بالطحالب',
    'غسل حبر بسيط: شجرة صنوبر وحيدة على جبل ضبابي',
    'غابة أعشاب بحرية تحت الماء مع أشعة شمس وسلحفاة تسبح',
    'مطعم خمسينيات، أرضية مربعات، ميلك شيك على طاولة كروم',
  ],
};

// ─── Welcome carousel samples (shown when history is empty) ─────────────────

const WELCOME_SAMPLES = [
  {
    image_url: 'welcome_anime_tokyo_alley.png',
    prompt: 'Anime key visual of a Tokyo alley at sunset, cherry petals in the wind, cel shading, vibrant sky gradient, detailed background',
  },
  {
    image_url: 'welcome_glass_pavilion.png',
    prompt: 'Contemporary glass pavilion in a snowy birch forest, warm interior glow against blue twilight, architectural photography, clean lines',
  },
  {
    image_url: 'welcome_oil_still_life.png',
    prompt: 'Oil painting still life: copper kettle, sliced citrus, linen tablecloth, Rembrandt chiaroscuro, visible brushstrokes, classical composition',
  },
  {
    image_url: 'welcome_street_food.png',
    prompt: 'Street food stall at night, sizzling wok, neon menu signs, steam and chili oil, vibrant night market atmosphere, editorial food photography',
  },
  {
    image_url: 'welcome_pixel_ramen.png',
    prompt: 'Isometric pixel art of a cozy ramen shop in the rain, tiny neon sign, steam from bowls, retro game aesthetic, charming details',
  },
  {
    image_url: 'welcome_underwater_kelp.png',
    prompt: 'Underwater kelp forest with sun rays piercing the surface, sea turtle gliding through, crystal clear water, serene marine scene',
  },
  {
    image_url: 'welcome_samurai_peak.png',
    prompt: 'Epic cinematic wide landscape, lone samurai on a misty mountain peak at dawn, golden sunlight piercing clouds, dramatic volumetric light, award-winning photography, ultra detailed, 8k',
  },
  {
    image_url: 'welcome_desert_highway.png',
    prompt: 'Cinematic wide landscape, empty desert highway at sunset, long straight road vanishing into red rock canyons, dramatic clouds, golden hour, road-trip photography, ultra sharp, 8k',
  },
  {
    image_url: 'welcome_northern_lights.png',
    prompt: 'Cinematic wide landscape, aurora borealis over a Norwegian fjord, snow-covered pines, mirror-still water reflection, astrophotography, vivid green curtains of light, 8k',
  },
  {
    image_url: 'welcome_lavender_fields.png',
    prompt: 'Cinematic wide landscape, endless lavender fields in Provence at golden hour, lone tree on the horizon, soft purple rows, dreamy atmosphere, fine art landscape photography, 8k',
  },
  {
    image_url: 'welcome_cyberpunk_city.png',
    prompt: 'Cinematic wide landscape, cyberpunk megacity at night, neon kanji signs, rain-slick streets, flying cars in distance, blade runner atmosphere, moody teal and magenta, ultra detailed, 8k',
  },
  {
    image_url: 'welcome_coastal_lighthouse.png',
    prompt: 'Cinematic wide landscape, dramatic coastal lighthouse during a storm, crashing waves, beam cutting through rain, moody seascape, long exposure photography, powerful atmosphere, 8k',
  },
];

// ─── Default Prompts for First-Run Users ────────────────────────────────────

const DEFAULT_PROMPTS = WELCOME_SAMPLES.map((s) => s.prompt);

// ─── Storage Key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'user_prompt_library';
const RECENT_RANDOM_KEY = 'recent_random_prompts';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get all categories with their metadata
 */
function getCategories() {
  return CATEGORIES;
}

/**
 * Get prompts for a specific category
 */
function getPromptsByCategory(categoryId) {
  return PROMPTS_BY_CATEGORY[categoryId] || [];
}

function getRecentRandomPrompts() {
  try {
    const data = window.localStorage.getItem(RECENT_RANDOM_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function rememberRecentRandomPrompt(prompt) {
  try {
    const recent = getRecentRandomPrompts().filter((p) => p !== prompt);
    recent.unshift(prompt);
    window.localStorage.setItem(RECENT_RANDOM_KEY, JSON.stringify(recent.slice(0, 12)));
  } catch (e) {
    // ignore storage errors
  }
}

function clearRecentRandomPrompts() {
  try {
    window.localStorage.removeItem(RECENT_RANDOM_KEY);
  } catch (e) {
    console.warn('Failed to clear recent random prompts:', e);
  }
}

/**
 * Get a single random prompt from the entire library (built-in + user-saved)
 */
function getRandomPrompt() {
  const userPrompts = getUserPrompts();
  const recent = getRecentRandomPrompts();

  // 15% user-saved, 85% built-in with de-duplication of recent picks
  const useUserPool = userPrompts.length > 0 && Math.random() < 0.15;
  if (useUserPool) {
    return userPrompts[Math.floor(Math.random() * userPrompts.length)];
  }

  const prompt = getFreshRandomPrompt(recent, 8);
  rememberRecentRandomPrompt(prompt);
  return prompt;
}

/**
 * Get a random prompt from a specific category
 */
function getRandomPromptFromCategory(categoryId) {
  const prompts = PROMPTS_BY_CATEGORY[categoryId];
  if (!prompts || prompts.length === 0) return getRandomPrompt();
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Get a random prompt that hasn't been used recently
 */
function getFreshRandomPrompt(recentPrompts, count = 5) {
  const allBuiltIn = Object.values(PROMPTS_BY_CATEGORY).flat();
  const recent = recentPrompts || [];
  const recentSet = new Set(recent.slice(-count));
  
  // Filter out recently used prompts
  const fresh = allBuiltIn.filter(p => !recentSet.has(p));
  
  // If all prompts have been used recently, just pick a random one
  const pool = fresh.length > 0 ? fresh : allBuiltIn;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Load user-saved prompts from localStorage
 */
function getUserPrompts() {
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('Failed to load user prompts:', e);
    return [];
  }
}

/**
 * Save a prompt to the user library in localStorage
 */
function saveUserPrompt(prompt) {
  try {
    const existing = getUserPrompts();
    // Avoid duplicates
    if (!existing.includes(prompt)) {
      existing.unshift(prompt);
      // Keep max 200 user prompts
      const trimmed = existing.slice(0, 200);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch (e) {
    console.warn('Failed to save user prompt:', e);
  }
}

/**
 * Save a batch of prompts (e.g., after generation) and avoid duplicates
 */
function saveMultiplePrompts(prompts) {
  prompts.forEach(p => saveUserPrompt(p));
}

function rememberPrompt(prompt) {
  if (!prompt) return;
  saveUserPrompt(prompt);
  rememberRecentRandomPrompt(prompt);
}

/**
 * Clear user-saved prompts
 */
function clearUserPrompts() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear user prompts:', e);
  }
}

/**
 * Get total count of built-in prompts
 */
function getBuiltInCount() {
  return Object.values(PROMPTS_BY_CATEGORY).flat().length;
}

/**
 * Get default initial prompts for first-time users
 */
function getDefaultPrompts() {
  return DEFAULT_PROMPTS;
}

function getInspireLines(locale = 'en') {
  return locale === 'ar' ? INSPIRE_LINES.ar : INSPIRE_LINES.en;
}

function getWelcomeSamples() {
  return WELCOME_SAMPLES;
}

function getAllBuiltInPrompts() {
  return Object.values(PROMPTS_BY_CATEGORY).flat();
}

// ─── Export ──────────────────────────────────────────────────────────────────

export {
  CATEGORIES,
  PROMPTS_BY_CATEGORY,
  DEFAULT_PROMPTS,
  INSPIRE_LINES,
  WELCOME_SAMPLES,
  getCategories,
  getPromptsByCategory,
  getRandomPrompt,
  getRandomPromptFromCategory,
  getFreshRandomPrompt,
  getUserPrompts,
  getRecentRandomPrompts,
  saveUserPrompt,
  saveMultiplePrompts,
  clearUserPrompts,
  clearRecentRandomPrompts,
  rememberRecentRandomPrompt,
  rememberPrompt,
  getBuiltInCount,
  getDefaultPrompts,
  getInspireLines,
  getWelcomeSamples,
  getAllBuiltInPrompts,
};
