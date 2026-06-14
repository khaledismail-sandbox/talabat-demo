/* ===========================================================================
   talabat UAE — Amplitude demo
   Plain vanilla JS, hash-routed SPA. No build step.
   Every Amplitude event is fired through a real user interaction.
   =========================================================================== */

/* ---------- Amplitude init ---------- */
(function initAmplitude(){
  try {
    if (window.sessionReplay) amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
    if (window.engagement)    amplitude.add(window.engagement.plugin());
    amplitude.init("791d6c97320c5752f16c6b6e4a546f81", { fetchRemoteConfig: true, autocapture: false });
  } catch (e) {
    console.warn("Amplitude init skipped:", e);
  }
})();

/* track() wrapper — guards the SDK and logs to console for the demo */
function track(name, props){
  props = props || {};
  try { if (window.amplitude && amplitude.track) amplitude.track(name, props); }
  catch(e){ /* no-op */ }
  console.log("📊 [Amplitude]", name, props);
}

/* ---------- Money helpers ---------- */
const FREE_DELIVERY_THRESHOLD = 30;   // AED — basket over this gets free delivery
const STD_DELIVERY_FEE = 7.0;          // AED
const VAT_RATE = 0.05;                 // 5% UAE VAT
const money = n => "AED " + Number(n).toFixed(2);

function basketMath(){
  const subtotal = state.basket.reduce((s,i)=>s + i.dish_price, 0);
  const free_delivery_eligible = subtotal >= FREE_DELIVERY_THRESHOLD || state.promo.type === "free_delivery";
  let delivery_fee = free_delivery_eligible ? 0 : STD_DELIVERY_FEE;
  let discount_amount = 0;
  if (state.promo.applied && state.promo.type === "percentage_off") {
    discount_amount = +(subtotal * state.promo.discount_pct).toFixed(2);
  }
  const discounted = Math.max(0, subtotal - discount_amount);
  const vat_amount = +(discounted * VAT_RATE).toFixed(2);
  const order_total = +(discounted + delivery_fee + vat_amount).toFixed(2);
  return {
    basket_subtotal: +subtotal.toFixed(2),
    delivery_fee: +delivery_fee.toFixed(2),
    vat_amount,
    discount_amount,
    order_total,
    free_delivery_eligible
  };
}

/* ---------- State ---------- */
const state = {
  user: { loggedIn:false, name:"", demoNumber:1, userId:null, savedAddressConfirmed:false, isReturning:false },
  basket: [],
  favourites: new Set(),
  promo: { attempted:false, applied:false, type:null, discount_pct:0 },
  activeCuisine: null,
  checkoutInProgress: false,
  orderCounter: 1
};

/* ---------- Data: cuisines, restaurants, dishes ---------- */
const CUISINES = [
  { name:"Arabic",   key:"arabic",   emoji:"🥙" },
  { name:"Lebanese", key:"lebanese", emoji:"🧆" },
  { name:"Indian",   key:"indian",   emoji:"🍛" },
  { name:"Italian",  key:"italian",  emoji:"🍕" },
  { name:"Japanese", key:"japanese", emoji:"🍣" },
  { name:"Burgers",  key:"burgers",  emoji:"🍔" },
  { name:"Healthy",  key:"healthy",  emoji:"🥗" },
  { name:"Desserts", key:"desserts", emoji:"🍰" }
];

const RESTAURANTS = [
  { id:"REST_01", name:"Al Safadi", cuisine:"lebanese", cuisineLabel:"Lebanese · Grills",
    rating:4.7, eta:"25–35 min", deliveryFee:0, freeDelivery:true, emoji:"🧆", cover:"linear-gradient(135deg,#ff8a3d,#ff5a00)",
    dishes:[
      { dish_id:"DISH_001", name:"Mixed Grill Platter", desc:"Shish taouk, kofta, lamb chops", price:78.50, emoji:"🍢" },
      { dish_id:"DISH_002", name:"Hummus Beiruti",      desc:"Creamy hummus, chilli & parsley", price:24.00, emoji:"🥣" },
      { dish_id:"DISH_003", name:"Chicken Shawarma Wrap",desc:"Garlic toum, pickles, fries",     price:22.00, emoji:"🌯" },
      { dish_id:"DISH_004", name:"Fattoush Salad",      desc:"Sumac, crispy bread, veg",        price:28.00, emoji:"🥗" }
    ]},
  { id:"REST_02", name:"Operitivo Pizzeria", cuisine:"italian", cuisineLabel:"Italian · Pizza",
    rating:4.5, eta:"30–40 min", deliveryFee:7, freeDelivery:false, emoji:"🍕", cover:"linear-gradient(135deg,#c0392b,#e67e22)",
    dishes:[
      { dish_id:"DISH_010", name:"Margherita Pizza",  desc:"San Marzano, mozzarella, basil", price:46.00, emoji:"🍕" },
      { dish_id:"DISH_011", name:"Truffle Pasta",     desc:"Tagliatelle, cream, truffle",    price:62.00, emoji:"🍝" },
      { dish_id:"DISH_012", name:"Garlic Bread",      desc:"Wood-fired, herb butter",        price:18.00, emoji:"🥖" },
      { dish_id:"DISH_013", name:"Tiramisu",          desc:"Mascarpone, espresso, cocoa",    price:26.00, emoji:"🍰" }
    ]},
  { id:"REST_03", name:"Bombay Chowk", cuisine:"indian", cuisineLabel:"Indian · Curries",
    rating:4.6, eta:"35–45 min", deliveryFee:0, freeDelivery:true, emoji:"🍛", cover:"linear-gradient(135deg,#e67e22,#f1c40f)",
    dishes:[
      { dish_id:"DISH_020", name:"Butter Chicken",    desc:"Tomato, cream, fenugreek",      price:42.00, emoji:"🍛" },
      { dish_id:"DISH_021", name:"Lamb Biryani",      desc:"Basmati, saffron, fried onion", price:48.00, emoji:"🍚" },
      { dish_id:"DISH_022", name:"Garlic Naan",       desc:"Tandoor-baked, butter",         price:12.00, emoji:"🫓" },
      { dish_id:"DISH_023", name:"Mango Lassi",       desc:"Yoghurt, alphonso mango",       price:16.00, emoji:"🥭" }
    ]},
  { id:"REST_04", name:"Sushi Art", cuisine:"japanese", cuisineLabel:"Japanese · Sushi",
    rating:4.8, eta:"30–40 min", deliveryFee:7, freeDelivery:false, emoji:"🍣", cover:"linear-gradient(135deg,#2c3e50,#16a085)",
    dishes:[
      { dish_id:"DISH_030", name:"Salmon Sashimi (8pc)", desc:"Fresh Atlantic salmon",       price:58.00, emoji:"🍣" },
      { dish_id:"DISH_031", name:"Dragon Roll",          desc:"Prawn tempura, eel, avocado",  price:54.00, emoji:"🍙" },
      { dish_id:"DISH_032", name:"Chicken Katsu Bento",  desc:"Rice, salad, miso soup",       price:49.00, emoji:"🍱" },
      { dish_id:"DISH_033", name:"Edamame",              desc:"Sea salt steamed soy beans",   price:18.00, emoji:"🫛" }
    ]},
  { id:"REST_05", name:"Pickl Burgers", cuisine:"burgers", cuisineLabel:"American · Burgers",
    rating:4.4, eta:"20–30 min", deliveryFee:0, freeDelivery:true, emoji:"🍔", cover:"linear-gradient(135deg,#d35400,#f39c12)",
    dishes:[
      { dish_id:"DISH_040", name:"Classic Cheeseburger", desc:"Wagyu patty, cheddar, pickles", price:38.00, emoji:"🍔" },
      { dish_id:"DISH_041", name:"Buffalo Chicken Burger",desc:"Crispy chicken, hot sauce",     price:36.00, emoji:"🍗" },
      { dish_id:"DISH_042", name:"Loaded Fries",         desc:"Cheese, jalapeño, ranch",       price:24.00, emoji:"🍟" },
      { dish_id:"DISH_043", name:"Oreo Shake",           desc:"Thick vanilla & cookies",       price:22.00, emoji:"🥤" }
    ]},
  { id:"REST_06", name:"Kcal Healthy Kitchen", cuisine:"healthy", cuisineLabel:"Healthy · Bowls",
    rating:4.3, eta:"25–35 min", deliveryFee:7, freeDelivery:false, emoji:"🥗", cover:"linear-gradient(135deg,#27ae60,#2ecc71)",
    dishes:[
      { dish_id:"DISH_050", name:"Grilled Chicken Bowl", desc:"Quinoa, avocado, greens",      price:39.00, emoji:"🥗" },
      { dish_id:"DISH_051", name:"Salmon Poke",          desc:"Brown rice, edamame, mango",   price:45.00, emoji:"🥙" },
      { dish_id:"DISH_052", name:"Acai Bowl",            desc:"Granola, berries, banana",     price:32.00, emoji:"🍓" },
      { dish_id:"DISH_053", name:"Green Detox Juice",    desc:"Kale, apple, ginger, lemon",   price:20.00, emoji:"🥤" }
    ]},
  { id:"REST_07", name:"Reem Al Bawadi", cuisine:"arabic", cuisineLabel:"Arabic · Emirati",
    rating:4.5, eta:"30–40 min", deliveryFee:0, freeDelivery:true, emoji:"🥙", cover:"linear-gradient(135deg,#8e5a2d,#d4a23c)",
    dishes:[
      { dish_id:"DISH_060", name:"Lamb Ouzi",        desc:"Slow-cooked lamb, spiced rice",  price:72.00, emoji:"🍖" },
      { dish_id:"DISH_061", name:"Mixed Mezze",      desc:"Hummus, moutabel, vine leaves",  price:38.00, emoji:"🥙" },
      { dish_id:"DISH_062", name:"Manakish Zaatar",  desc:"Thyme, olive oil flatbread",     price:16.00, emoji:"🫓" },
      { dish_id:"DISH_063", name:"Umm Ali",          desc:"Emirati bread pudding",          price:24.00, emoji:"🍮" }
    ]},
  { id:"REST_08", name:"Sugar Daddy's Bakery", cuisine:"desserts", cuisineLabel:"Desserts · Bakery",
    rating:4.9, eta:"20–30 min", deliveryFee:7, freeDelivery:false, emoji:"🍰", cover:"linear-gradient(135deg,#e84393,#fd79a8)",
    dishes:[
      { dish_id:"DISH_070", name:"Red Velvet Slice",  desc:"Cream cheese frosting",        price:28.00, emoji:"🍰" },
      { dish_id:"DISH_071", name:"Belgian Brownie",   desc:"Warm, fudgy, walnuts",         price:24.00, emoji:"🍫" },
      { dish_id:"DISH_072", name:"Cinnamon Roll",     desc:"Cream cheese glaze",           price:20.00, emoji:"🥐" },
      { dish_id:"DISH_073", name:"Cheesecake",        desc:"New York style, berry coulis", price:30.00, emoji:"🧁" }
    ]}
];

/* recommended dishes shown on home (subset across restaurants) */
const RECOMMENDED = [
  { restId:"REST_01", dish_id:"DISH_001" },
  { restId:"REST_05", dish_id:"DISH_040" },
  { restId:"REST_03", dish_id:"DISH_020" },
  { restId:"REST_04", dish_id:"DISH_031" },
  { restId:"REST_08", dish_id:"DISH_070" },
  { restId:"REST_02", dish_id:"DISH_010" }
];

/* reviews per restaurant */
const REVIEWS = {
  default:[
    { name:"Aisha M.",   stars:5, text:"Food arrived hot and on time. Portions were generous!" },
    { name:"Omar K.",    stars:4, text:"Tasty as always, though delivery took a little longer." },
    { name:"Priya S.",   stars:5, text:"Best in the area. The rider was super polite." },
    { name:"James W.",   stars:4, text:"Solid quality. Will order again this weekend." }
  ]
};

function findRestaurant(id){ return RESTAURANTS.find(r => r.id === id); }
function findDish(restId, dishId){
  const r = findRestaurant(restId);
  return r ? r.dishes.find(d => d.dish_id === dishId) : null;
}

/* ===========================================================================
   Persistence (localStorage keyed to today's date)
   =========================================================================== */
function todayKey(){ return new Date().toISOString().split("T")[0]; }
const LS_KEY = "talabat_demo_" + todayKey();

function saveSession(){
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      user: state.user,
      favourites: [...state.favourites],
      orderCounter: state.orderCounter
    }));
  } catch(e){}
}
function loadSession(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw){
      const d = JSON.parse(raw);
      if (d.user){ state.user = Object.assign(state.user, d.user); }
      if (d.favourites) state.favourites = new Set(d.favourites);
      if (d.orderCounter) state.orderCounter = d.orderCounter;
    }
    // returning-user flag persists across days
    state.user.isReturning = localStorage.getItem("talabat_demo_seen") === "1";
    localStorage.setItem("talabat_demo_seen", "1");
  } catch(e){}
}

/* ===========================================================================
   Identity
   =========================================================================== */
function generateUserId(name, demoNumber){
  const clean = (name || 'user').trim().toLowerCase().replace(/[^a-z0-9]+/g, '') || 'user';
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${clean}_${demoNumber}_${today}`;
}

function applyUserProperties(){
  try{
    if (window.amplitude && amplitude.Identify){
      const id = new amplitude.Identify();
      id.set("saved_address_confirmed", !!state.user.savedAddressConfirmed);
      id.set("is_returning_user", !!state.user.isReturning);
      amplitude.identify(id);
    }
  }catch(e){}
}

function doLogin(name, demoNumber){
  state.user.loggedIn = true;
  state.user.name = name;
  state.user.demoNumber = demoNumber;
  state.user.userId = generateUserId(name, demoNumber);
  try { if (window.amplitude) amplitude.setUserId(state.user.userId); } catch(e){}
  applyUserProperties();
  saveSession();
  updateHeader();
  toast(`Signed in as ${name} 👋`);
}

function doLogout(){
  try { if (window.amplitude) amplitude.reset(); } catch(e){}
  state.user = { loggedIn:false, name:"", demoNumber:1, userId:null, savedAddressConfirmed:false, isReturning:state.user.isReturning };
  saveSession();
  updateHeader();
  toast("Signed out");
}

/* ===========================================================================
   Small UI helpers
   =========================================================================== */
const $ = sel => document.querySelector(sel);
const view = () => document.getElementById("view");

let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2600);
}

function updateHeader(){
  document.getElementById("basketCount").textContent = state.basket.length;
  const loginBtn = document.getElementById("loginBtn");
  if (state.user.loggedIn){
    loginBtn.textContent = state.user.name.split(" ")[0] || "Account";
  } else {
    loginBtn.textContent = "Sign in";
  }
  const loc = document.getElementById("locValue");
  loc.textContent = state.user.savedAddressConfirmed ? "Home · Jumeirah" : "Set location";
}

/* ===========================================================================
   Router
   =========================================================================== */
function router(){
  const hash = location.hash || "#/";
  const [path, param] = hash.replace(/^#\//,"").split("/");
  if (path === "" )                 return renderHome();
  if (path === "restaurant" && param) return renderRestaurant(param);
  if (path === "order" && param)    return renderOrderConfirmation(param);
  if (path === "account")           return renderAccount();
  return renderHome();
}
window.addEventListener("hashchange", router);

/* ===========================================================================
   HOME
   =========================================================================== */
function renderHome(){
  state.activeCuisine = null;
  const v = view();
  v.innerHTML = `
    <section class="hero">
      <div class="promo-banner" id="promoBanner">
        <h1>30% off your first order 🎉</h1>
        <p>New to talabat? Get 30% off (up to AED 30) on us.</p>
        <span class="promo-code-pill">TALABAT20</span>
        <span class="burst">🍔</span>
      </div>
      <div class="promo-side">
        <span class="emoji">🛵</span>
        <h2>Free delivery over AED 30</h2>
        <p class="muted" style="color:#ddd">On hundreds of restaurants near you in Dubai.</p>
      </div>
    </section>

    <h2 class="section-title first">What are you craving?</h2>
    <div class="cuisines" id="cuisines"></div>

    <h2 class="section-title">Recommended for you</h2>
    <div class="dish-row" id="dishRow"></div>

    <h2 class="section-title" id="restListTitle">Restaurants near you</h2>
    <div class="rest-grid" id="restGrid"></div>
  `;

  renderCuisines();
  renderDishRow();
  renderRestaurants(RESTAURANTS);

  // Core funnel #1
  track("Home Screen Viewed", {
    is_returning_user: state.user.isReturning,
    restaurants_shown: RESTAURANTS.length,
    saved_address_confirmed: state.user.savedAddressConfirmed
  });

  // Promo Banner Viewed — fire when the banner scrolls into view
  observePromoBanner();
}

function renderCuisines(){
  const el = document.getElementById("cuisines");
  el.innerHTML = CUISINES.map(c => `
    <button class="cuisine-chip ${state.activeCuisine===c.key?'active':''}" data-cuisine="${c.key}">
      <span class="c-emoji">${c.emoji}</span>
      <span class="c-name">${c.name}</span>
    </button>`).join("");
  el.querySelectorAll("[data-cuisine]").forEach(btn=>{
    btn.addEventListener("click", ()=> browseCuisine(btn.dataset.cuisine));
  });
}

function browseCuisine(key){
  const cuisine = CUISINES.find(c=>c.key===key);
  const filtered = RESTAURANTS.filter(r=>r.cuisine===key);
  state.activeCuisine = (state.activeCuisine===key) ? null : key;
  const list = state.activeCuisine ? filtered : RESTAURANTS;
  renderCuisines();
  renderRestaurants(list);
  document.getElementById("restListTitle").textContent =
    state.activeCuisine ? `${cuisine.name} restaurants` : "Restaurants near you";

  if (state.activeCuisine){
    // Cuisine Category Browsed
    track("Cuisine Category Browsed", {
      cuisine_name: cuisine.name,
      cuisine_type: key,
      restaurants_shown: filtered.length
    });
  }
}

function renderDishRow(){
  const el = document.getElementById("dishRow");
  el.innerHTML = RECOMMENDED.map(rec=>{
    const r = findRestaurant(rec.restId);
    const d = findDish(rec.restId, rec.dish_id);
    if(!r||!d) return "";
    return `
      <div class="dish-card" data-rest="${r.id}" data-dish="${d.dish_id}">
        <div class="d-cover" style="background:${r.cover}">${d.emoji}</div>
        <div class="d-body">
          <div class="d-name">${d.name}</div>
          <div class="d-rest">${r.name}</div>
          <div class="d-price">${money(d.price)}</div>
        </div>
      </div>`;
  }).join("");
  el.querySelectorAll(".dish-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      const r = findRestaurant(card.dataset.rest);
      const d = findDish(card.dataset.rest, card.dataset.dish);
      // Recommended Dish Clicked
      track("Recommended Dish Clicked", {
        dish_id: d.dish_id,
        cuisine_type: r.cuisine,
        dish_price: d.price,
        restaurant_rating: r.rating
      });
      location.hash = `#/restaurant/${r.id}`;
    });
  });
}

function renderRestaurants(list){
  const el = document.getElementById("restGrid");
  if(!list.length){ el.innerHTML = `<p class="muted">No restaurants found.</p>`; return; }
  el.innerHTML = list.map(r=>`
    <div class="rest-card" data-rest="${r.id}">
      <div class="rest-cover" style="background:${r.cover}">
        ${r.emoji}
        ${r.freeDelivery?`<span class="rest-badge">FREE DELIVERY</span>`:``}
        <button class="rest-fav ${state.favourites.has(r.id)?'on':''}" data-fav="${r.id}" aria-label="Favourite">
          ${state.favourites.has(r.id)?'❤️':'🤍'}
        </button>
      </div>
      <div class="rest-body">
        <h3 class="rest-name">${r.name}</h3>
        <p class="rest-cuisine">${r.cuisineLabel}</p>
        <div class="rest-meta">
          <span class="rating">★ ${r.rating.toFixed(1)}</span>
          <span class="dot">•</span>
          <span>${r.eta}</span>
          <span class="dot">•</span>
          <span class="${r.freeDelivery?'free-del':''}">${r.freeDelivery?'Free delivery':money(r.deliveryFee)+' delivery'}</span>
        </div>
      </div>
    </div>`).join("");

  el.querySelectorAll(".rest-card").forEach(card=>{
    card.addEventListener("click", e=>{
      if (e.target.closest("[data-fav]")) return;
      location.hash = `#/restaurant/${card.dataset.rest}`;
    });
  });
  el.querySelectorAll("[data-fav]").forEach(btn=>{
    btn.addEventListener("click", e=>{ e.stopPropagation(); toggleFavourite(btn.dataset.fav); });
  });
}

function toggleFavourite(restId){
  const r = findRestaurant(restId);
  const nowOn = !state.favourites.has(restId);
  if (nowOn) state.favourites.add(restId); else state.favourites.delete(restId);
  saveSession();
  // re-render whatever favourite buttons are visible
  document.querySelectorAll(`[data-fav="${restId}"]`).forEach(b=>{
    b.classList.toggle("on", nowOn); b.textContent = nowOn?'❤️':'🤍';
  });
  document.querySelectorAll(`.mh-fav[data-fav="${restId}"]`).forEach(b=>{
    b.classList.toggle("on", nowOn); b.textContent = nowOn?'❤️':'🤍';
  });
  if (nowOn){
    // Restaurant Favourited
    track("Restaurant Favourited", {
      cuisine_type: r.cuisine,
      restaurant_rating: r.rating
    });
    toast(`${r.name} added to favourites ❤️`);
  }
}

/* Promo Banner Viewed via IntersectionObserver (fires once) */
let promoSeen = false;
function observePromoBanner(){
  const banner = document.getElementById("promoBanner");
  if(!banner) return;
  if (!("IntersectionObserver" in window)){
    if(!promoSeen){ promoSeen=true; firePromoBanner(); } return;
  }
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if (en.isIntersecting && !promoSeen){
        promoSeen = true;
        firePromoBanner();
        obs.disconnect();
      }
    });
  }, { threshold:0.6 });
  obs.observe(banner);
}
function firePromoBanner(){
  track("Promo Banner Viewed", {
    promo_type: "percentage_off",
    discount_pct: 0.20,
    cuisine_name: "all"
  });
}

/* ===========================================================================
   SEARCH (in header)
   =========================================================================== */
document.getElementById("headerSearchForm").addEventListener("submit", e=>{
  e.preventDefault();
  const q = document.getElementById("searchInput").value.trim();
  if(!q) return;
  const ql = q.toLowerCase();
  const matches = RESTAURANTS.filter(r =>
    r.name.toLowerCase().includes(ql) ||
    r.cuisine.includes(ql) ||
    r.cuisineLabel.toLowerCase().includes(ql) ||
    r.dishes.some(d=>d.name.toLowerCase().includes(ql))
  );
  // Restaurant Search Performed
  track("Restaurant Search Performed", {
    search_query: q,
    results_returned: matches.length
  });

  // make sure we're on home, then show results
  if (location.hash !== "#/" && location.hash !== ""){
    location.hash = "#/";
    setTimeout(()=>showSearchResults(q, matches), 60);
  } else {
    showSearchResults(q, matches);
  }
});

function showSearchResults(q, matches){
  const title = document.getElementById("restListTitle");
  if (title) title.textContent = `Results for “${q}” (${matches.length})`;
  renderRestaurants(matches);
  const grid = document.getElementById("restGrid");
  if (grid) grid.scrollIntoView({behavior:"smooth", block:"start"});
}

/* ===========================================================================
   RESTAURANT MENU
   =========================================================================== */
function renderRestaurant(id){
  const r = findRestaurant(id);
  if(!r){ location.hash="#/"; return; }
  const v = view();
  v.innerHTML = `
    <a class="back-link" href="#/">← Back to restaurants</a>
    <div class="menu-hero" style="background:${r.cover}">
      ${r.emoji}
      <button class="mh-fav ${state.favourites.has(r.id)?'on':''}" data-fav="${r.id}" aria-label="Favourite">
        ${state.favourites.has(r.id)?'❤️':'🤍'}
      </button>
    </div>
    <div class="menu-head">
      <div>
        <h1>${r.name}</h1>
        <p class="muted">${r.cuisineLabel} · ★ ${r.rating.toFixed(1)} · ${r.eta} · ${r.freeDelivery?'<span class="free-del">Free delivery</span>':money(r.deliveryFee)+' delivery'}</p>
      </div>
    </div>

    <div class="menu-tabs">
      <button class="menu-tab active" data-tab="menu">Menu</button>
      <button class="menu-tab" data-tab="reviews">Reviews</button>
    </div>

    <div id="menuPanel"></div>
  `;

  // favourite button on hero
  v.querySelector(".mh-fav").addEventListener("click", ()=>toggleFavourite(r.id));

  // tabs
  const tabs = v.querySelectorAll(".menu-tab");
  tabs.forEach(t=>t.addEventListener("click", ()=>{
    tabs.forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    if (t.dataset.tab==="menu") renderMenuPanel(r); else renderReviewsPanel(r);
  }));

  renderMenuPanel(r);

  // Core funnel #2
  track("Restaurant Menu Viewed", {
    cuisine_type: r.cuisine,
    restaurant_rating: r.rating
  });
}

function renderMenuPanel(r){
  const panel = document.getElementById("menuPanel");
  panel.innerHTML = `
    <div class="menu-list">
      ${r.dishes.map(d=>`
        <div class="menu-item">
          <span class="mi-emoji">${d.emoji}</span>
          <div class="mi-info">
            <div class="mi-name">${d.name}</div>
            <div class="mi-desc">${d.desc}</div>
            <div class="mi-price">${money(d.price)}</div>
          </div>
          <button class="add-btn" data-add="${d.dish_id}">Add +</button>
        </div>`).join("")}
    </div>`;
  panel.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const d = findDish(r.id, btn.dataset.add);
      addToBasket(r, d);
    });
  });
}

function renderReviewsPanel(r){
  const panel = document.getElementById("menuPanel");
  const reviews = REVIEWS.default;
  panel.innerHTML = `
    <p class="muted">${reviews.length} reviews · ★ ${r.rating.toFixed(1)} average</p>
    ${reviews.map(rv=>`
      <div class="review">
        <div class="r-head"><span>${rv.name}</span><span class="r-stars">${'★'.repeat(rv.stars)}${'☆'.repeat(5-rv.stars)}</span></div>
        <p style="margin:6px 0 0">${rv.text}</p>
      </div>`).join("")}
  `;
  // Restaurant Reviews Read
  track("Restaurant Reviews Read", {
    cuisine_type: r.cuisine,
    restaurant_rating: r.rating
  });
}

/* ===========================================================================
   BASKET
   =========================================================================== */
function addToBasket(r, d){
  state.basket.push({
    dish_id: d.dish_id,
    name: d.name,
    emoji: d.emoji,
    dish_price: d.price,
    cuisine_type: r.cuisine,
    restaurantId: r.id,
    cover: r.cover
  });
  updateHeader();
  const m = basketMath();
  // Core funnel #3
  track("Item Added to Basket", {
    dish_id: d.dish_id,
    cuisine_type: r.cuisine,
    dish_price: d.price,
    basket_subtotal: m.basket_subtotal
  });
  toast(`${d.name} added to basket 🛒`);
  renderBasket();
}

function removeFromBasket(index){
  state.basket.splice(index,1);
  // recompute promo eligibility if basket emptied
  if(!state.basket.length){ state.promo = { attempted:false, applied:false, type:null, discount_pct:0 }; }
  updateHeader();
  renderBasket();
}

function renderBasket(){
  const itemsEl = document.getElementById("basketItems");
  const summaryEl = document.getElementById("basketSummary");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if(!state.basket.length){
    itemsEl.innerHTML = `<div class="empty-basket">🛒<br>Your basket is empty.<br><span class="muted">Add dishes from a restaurant to get started.</span></div>`;
    summaryEl.innerHTML = "";
    checkoutBtn.disabled = true;
    return;
  }

  itemsEl.innerHTML = state.basket.map((i,idx)=>`
    <div class="basket-line">
      <span class="bl-emoji">${i.emoji}</span>
      <div class="bl-info">
        <div class="bl-name">${i.name}</div>
        <div class="bl-price">${money(i.dish_price)}</div>
      </div>
      <button class="bl-remove" data-remove="${idx}" aria-label="Remove">✕</button>
    </div>`).join("");
  itemsEl.querySelectorAll("[data-remove]").forEach(b=>{
    b.addEventListener("click", ()=>removeFromBasket(+b.dataset.remove));
  });

  const m = basketMath();
  summaryEl.innerHTML = `
    <div class="row"><span>Subtotal</span><span>${money(m.basket_subtotal)}</span></div>
    ${m.discount_amount>0?`<div class="row save"><span>Promo discount</span><span>− ${money(m.discount_amount)}</span></div>`:``}
    <div class="row"><span>Delivery fee</span><span>${m.delivery_fee===0?'<span class="free-del">FREE</span>':money(m.delivery_fee)}</span></div>
    <div class="row"><span>VAT (5%)</span><span>${money(m.vat_amount)}</span></div>
    <div class="row total"><span>Total</span><span>${money(m.order_total)}</span></div>
  `;
  checkoutBtn.disabled = false;
}

/* basket drawer open/close */
function openBasket(){
  document.getElementById("basketDrawer").setAttribute("aria-hidden","false");
  renderBasket();
}
function closeBasket(){
  // If there are items and the user dismisses checkout without ordering → Basket Abandoned
  document.getElementById("basketDrawer").setAttribute("aria-hidden","true");
}
document.getElementById("basketBtn").addEventListener("click", openBasket);
document.querySelectorAll("[data-close-basket]").forEach(el=>el.addEventListener("click", closeBasket));

/* ===========================================================================
   PROMO CODE
   =========================================================================== */
document.getElementById("applyPromoBtn").addEventListener("click", applyPromo);
document.getElementById("promoInput").addEventListener("keydown", e=>{ if(e.key==="Enter") applyPromo(); });

const PROMO_CODES = {
  "TALABAT20": { type:"percentage_off", discount_pct:0.20, label:"20% off your order" },
  "FREEDEL":   { type:"free_delivery",  discount_pct:0,    label:"Free delivery" }
};

function applyPromo(){
  const input = document.getElementById("promoInput");
  const msg = document.getElementById("promoMsg");
  const code = input.value.trim().toUpperCase();
  if(!code) return;
  const found = PROMO_CODES[code];
  const m = basketMath();

  state.promo.attempted = true;

  if (found){
    state.promo.applied = true;
    state.promo.type = found.type;
    state.promo.discount_pct = found.discount_pct;
    msg.className = "promo-msg ok";
    msg.textContent = `✓ ${found.label} applied!`;
    renderBasket();
  } else {
    state.promo.applied = false;
    state.promo.type = null;
    state.promo.discount_pct = 0;
    msg.className = "promo-msg err";
    msg.textContent = "Invalid promo code. Try TALABAT20 or FREEDEL.";
    renderBasket();
  }

  const after = basketMath();
  // Promo Code Entered
  track("Promo Code Entered", {
    promo_attempted: true,
    promo_applied: !!found,
    promo_type: found ? found.type : "invalid",
    discount_pct: found ? found.discount_pct : 0,
    discount_amount: after.discount_amount,
    basket_subtotal: after.basket_subtotal
  });
}

/* ===========================================================================
   CHECKOUT  → friction step → order
   =========================================================================== */
document.getElementById("checkoutBtn").addEventListener("click", startCheckout);

function startCheckout(){
  if(!state.basket.length) return;
  const m = basketMath();
  // Core funnel #4
  track("Checkout Started", {
    basket_subtotal: m.basket_subtotal,
    delivery_fee: m.delivery_fee,
    vat_amount: m.vat_amount,
    order_total: m.order_total,
    free_delivery_eligible: m.free_delivery_eligible,
    promo_applied: state.promo.applied
  });

  closeBasket();

  // Users with a confirmed saved address skip the friction step
  if (state.user.savedAddressConfirmed){
    toast("Delivering to your saved address 🏠");
    placeOrder("saved_address");
  } else {
    openLocationStep(m);
  }
}

/* ---- The friction step: Delivery Location Reconfirmation ---- */
function openLocationStep(m){
  state.checkoutInProgress = true;
  pinPlaced = false;
  const modal = document.getElementById("locationModal");
  modal.setAttribute("aria-hidden","false");
  document.getElementById("locConfirmBtn").disabled = true;
  const addr = document.getElementById("locAddr");
  addr.className = "loc-addr";
  addr.textContent = "📍 Pin not placed yet — drag it onto your building";
  // reset pin to centre
  const pin = document.getElementById("mapPin");
  pin.style.left = "48%"; pin.style.top = "46%";
  // reset the manual address form
  ["locBuilding","locStreet","locArea","locFirstName","locEmail"].forEach(id=>{
    const f = document.getElementById(id); if(f) f.value = "";
  });
  document.getElementById("locFormHint").textContent = "";
  validateLocationStep();

  // THE friction event
  track("Delivery Location Reconfirmation Prompted", {
    basket_subtotal: m.basket_subtotal,
    delivery_fee: m.delivery_fee,
    vat_amount: m.vat_amount,
    order_total: m.order_total,
    free_delivery_eligible: m.free_delivery_eligible,
    saved_address_confirmed: false
  });
}

function closeLocationStep(){
  document.getElementById("locationModal").setAttribute("aria-hidden","true");
  state.checkoutInProgress = false;
}

/* cancel / back = abandon */
document.getElementById("locCancelBtn").addEventListener("click", abandonAtLocation);
document.getElementById("locBackBtn").addEventListener("click", abandonAtLocation);

function abandonAtLocation(){
  const m = basketMath();
  // Basket Abandoned — the key drop-off
  track("Basket Abandoned", {
    basket_subtotal: m.basket_subtotal,
    order_total: m.order_total,
    free_delivery_eligible: m.free_delivery_eligible,
    saved_address_confirmed: false
  });
  closeLocationStep();
  toast("Order cancelled — your basket was kept.");
  openBasket();
}

/* ---- Manual address form: every field required before continuing ---- */
const LOC_FORM_FIELDS = ["locBuilding","locStreet","locArea","locFirstName","locEmail"];
function locFormComplete(){
  for (const id of LOC_FORM_FIELDS){
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) return false;
  }
  const email = document.getElementById("locEmail").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return true;
}
function validateLocationStep(){
  const ready = pinPlaced && locFormComplete();
  document.getElementById("locConfirmBtn").disabled = !ready;
  return ready;
}
LOC_FORM_FIELDS.forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", validateLocationStep);
});

/* confirm placement → place order */
document.getElementById("locConfirmBtn").addEventListener("click", ()=>{
  if(!validateLocationStep()){
    document.getElementById("locFormHint").textContent =
      "Please place the map pin and complete all required fields to continue.";
    return;
  }
  closeLocationStep();
  placeOrder("pin_confirmed");
});

/* ---- Draggable map pin ---- */
let pinPlaced = false;
(function setupPinDrag(){
  const map = document.getElementById("map");
  const pin = document.getElementById("mapPin");
  if(!map||!pin) return;
  let dragging = false;

  function setFromPoint(clientX, clientY){
    const rect = map.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    x = Math.max(6, Math.min(94, x));
    y = Math.max(14, Math.min(96, y));
    pin.style.left = x + "%";
    pin.style.top = y + "%";
    markPinPlaced(x, y);
  }
  function markPinPlaced(x,y){
    pinPlaced = true;
    const addr = document.getElementById("locAddr");
    addr.className = "loc-addr placed";
    const bldg = 100 + Math.round((x+y)); // pseudo building number
    addr.textContent = `✓ Pinned: Building ${bldg}, Jumeirah Beach Road, Dubai`;
    validateLocationStep();
  }

  // pointer events (mouse + touch)
  pin.addEventListener("pointerdown", e=>{ dragging=true; pin.setPointerCapture(e.pointerId); e.preventDefault(); });
  window.addEventListener("pointermove", e=>{ if(dragging) setFromPoint(e.clientX, e.clientY); });
  window.addEventListener("pointerup", ()=>{ dragging=false; });

  // tap-to-place anywhere on the map
  map.addEventListener("pointerdown", e=>{
    if (e.target === pin || pin.contains(e.target)) return;
    setFromPoint(e.clientX, e.clientY);
  });

  // keyboard nudge for accessibility
  pin.addEventListener("keydown", e=>{
    const rect = map.getBoundingClientRect();
    let x = parseFloat(pin.style.left)||48, y = parseFloat(pin.style.top)||46;
    if(e.key==="ArrowLeft")  x-=3;
    else if(e.key==="ArrowRight") x+=3;
    else if(e.key==="ArrowUp")    y-=3;
    else if(e.key==="ArrowDown")  y+=3;
    else if(e.key==="Enter"){ document.getElementById("locConfirmBtn").click(); return; }
    else return;
    e.preventDefault();
    x=Math.max(6,Math.min(94,x)); y=Math.max(14,Math.min(96,y));
    pin.style.left=x+"%"; pin.style.top=y+"%";
    markPinPlaced(x,y);
  });
})();

/* ===========================================================================
   ORDER PLACED + confirmation
   =========================================================================== */
function placeOrder(method){
  const m = basketMath();
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g,"");
  const seq = String(state.orderCounter).padStart(3,"0");
  const order_id = `ORD_${dateStr}_${seq}`;
  state.orderCounter++;

  const is_first_order = state.orderCounter === 2 && !state.user.isReturning;

  // Core funnel #5
  track("Order Placed", {
    order_id,
    basket_subtotal: m.basket_subtotal,
    delivery_fee: m.delivery_fee,
    vat_amount: m.vat_amount,
    order_total: m.order_total,
    free_delivery_eligible: m.free_delivery_eligible,
    is_first_order,
    promo_applied: state.promo.applied,
    saved_address_confirmed: !!state.user.savedAddressConfirmed
  });

  // stash the order for the confirmation page
  lastOrder = { order_id, math:m, items:[...state.basket], method };
  // clear basket
  state.basket = [];
  state.promo = { attempted:false, applied:false, type:null, discount_pct:0 };
  document.getElementById("promoMsg").textContent = "";
  document.getElementById("promoInput").value = "";
  updateHeader();
  saveSession();

  location.hash = `#/order/${order_id}`;
}

let lastOrder = null;
function renderOrderConfirmation(orderId){
  const v = view();
  const o = lastOrder;
  if(!o){
    v.innerHTML = `<div class="order-confirm"><div class="big">✅</div><h1>Order placed</h1>
      <p class="muted">Order <strong>${orderId}</strong> is on its way.</p>
      <a class="primary-btn" href="#/" style="display:inline-block;margin-top:14px">Back to home</a></div>`;
    return;
  }
  const m = o.math;
  v.innerHTML = `
    <div class="order-confirm">
      <div class="big">🎉</div>
      <h1>Order placed!</h1>
      <p class="muted">Your food is being prepared and a rider is on the way.</p>
      <span class="order-id">${o.order_id}</span>
      <div class="receipt">
        ${o.items.map(i=>`<div class="row"><span>${i.emoji} ${i.name}</span><span>${money(i.dish_price)}</span></div>`).join("")}
        <div class="row"><span>Delivery fee</span><span>${m.delivery_fee===0?'FREE':money(m.delivery_fee)}</span></div>
        <div class="row"><span>VAT (5%)</span><span>${money(m.vat_amount)}</span></div>
        ${m.discount_amount>0?`<div class="row save" style="color:var(--green)"><span>Discount</span><span>− ${money(m.discount_amount)}</span></div>`:``}
        <div class="row total"><span>Total paid</span><span>${money(m.order_total)}</span></div>
      </div>
      <a class="primary-btn" href="#/" style="display:inline-block">Order again</a>
    </div>`;
}

/* ===========================================================================
   ACCOUNT PAGE
   =========================================================================== */
function renderAccount(){
  const v = view();
  const u = state.user;
  v.innerHTML = `
    <div class="account-card">
      <h1>Account</h1>
      ${u.loggedIn ? `
        <div class="acc-row"><span class="k">Name</span><span class="v">${u.name}</span></div>
        <div class="acc-row"><span class="k">Demo number</span><span class="v">${u.demoNumber}</span></div>
        <div class="acc-row"><span class="k">Amplitude user id</span><span class="v"><code>${u.userId}</code></span></div>
      ` : `
        <div class="acc-row"><span class="k">You're browsing as a guest</span>
          <button class="primary-btn" id="accSignIn">Sign in</button></div>
      `}
      <div class="acc-row"><span class="k">Returning user</span><span class="v">${u.isReturning?'Yes':'No (first visit)'}</span></div>
      <div class="acc-row">
        <div>
          <div class="k">Saved delivery address confirmed</div>
          <div class="muted" style="font-size:13px">On = skip the map pin step at checkout. Off = hit the reconfirmation prompt (drop-off path).</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="savedAddrToggle" ${u.savedAddressConfirmed?'checked':''}>
          <span class="slider"></span>
        </label>
      </div>
      ${u.loggedIn?`<button class="ghost-btn full" id="logoutBtn" style="margin-top:18px">Sign out</button>`:``}
    </div>`;

  const acc = document.getElementById("accSignIn");
  if (acc) acc.addEventListener("click", openLoginModal);

  const toggle = document.getElementById("savedAddrToggle");
  toggle.addEventListener("change", ()=>{
    state.user.savedAddressConfirmed = toggle.checked;
    applyUserProperties();
    saveSession();
    updateHeader();
    toast(toggle.checked ? "Saved address ON — checkout will skip the pin step" : "Saved address OFF — you'll hit the reconfirmation prompt");
  });

  const logout = document.getElementById("logoutBtn");
  if (logout) logout.addEventListener("click", ()=>{ doLogout(); renderAccount(); });
}

/* ===========================================================================
   LOGIN MODAL
   =========================================================================== */
function openLoginModal(){
  const modal = document.getElementById("loginModal");
  modal.setAttribute("aria-hidden","false");
  const nameI = document.getElementById("loginName");
  const demoI = document.getElementById("loginDemo");
  nameI.value = state.user.name || "";
  demoI.value = state.user.demoNumber || 1;
  updateUseridPreview();
}
function closeLoginModal(){ document.getElementById("loginModal").setAttribute("aria-hidden","true"); }
function updateUseridPreview(){
  const name = document.getElementById("loginName").value;
  const demo = document.getElementById("loginDemo").value || 1;
  document.getElementById("useridPreview").textContent = generateUserId(name, demo);
}
document.getElementById("loginBtn").addEventListener("click", ()=>{
  if (state.user.loggedIn) location.hash = "#/account"; else openLoginModal();
});
document.querySelectorAll("[data-close-login]").forEach(el=>el.addEventListener("click", closeLoginModal));
document.getElementById("loginName").addEventListener("input", updateUseridPreview);
document.getElementById("loginDemo").addEventListener("input", updateUseridPreview);
document.getElementById("confirmLoginBtn").addEventListener("click", ()=>{
  const name = document.getElementById("loginName").value.trim() || "Guest";
  const demo = parseInt(document.getElementById("loginDemo").value,10) || 1;
  doLogin(name, demo);
  closeLoginModal();
  if (location.hash === "#/account") renderAccount();
});

/* location chip → account (to set saved address) */
document.getElementById("locationChip").addEventListener("click", ()=>{ location.hash = "#/account"; });
document.getElementById("accountLink").addEventListener("click", e=>{ /* hash handles nav */ });

/* ===========================================================================
   Boot
   =========================================================================== */
loadSession();
if (state.user.loggedIn && state.user.userId){
  try { if (window.amplitude) amplitude.setUserId(state.user.userId); } catch(e){}
}
applyUserProperties();
updateHeader();
router();
