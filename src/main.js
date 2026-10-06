import defaultProductsData from './data/products.json';

/* ============================================================
   STATE MANAGEMENT
   ============================================================ */
let storeData = defaultProductsData;
let activeCategory = 'todos';
let searchQuery = '';
let currentCustomizingProduct = null;
let modalQuantity = 1;
let selectedAdditions = [];
let selectedRemovals = [];

// Cart state loaded from localStorage or initialized empty
let cart = [];
try {
  const savedCart = localStorage.getItem('hooligans_cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
  }
} catch (e) {
  cart = [];
}

let orderType = 'delivery'; // 'delivery' | 'pickup'

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */
function formatCurrency(val) {
  return Number(val).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function saveCartToStorage() {
  try {
    localStorage.setItem('hooligans_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('Erro ao salvar carrinho:', e);
  }
}

function showToast(message, icon = '✨') {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = toast.querySelector('.toast-icon');

  if (iconEl) iconEl.textContent = icon;
  if (msgEl) msgEl.textContent = message;

  toast.classList.remove('hidden');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2800);
}

/* ============================================================
   INITIALIZATION & DATA LOADING
   ============================================================ */
async function initApp() {
  // Attempt to fetch fresh JSON if served, or fallback to bundled default
  try {
    const res = await fetch('./data/products.json');
    if (res.ok) {
      const liveData = await res.json();
      if (liveData && liveData.products) {
        storeData = liveData;
      }
    }
  } catch (err) {
    // Fallback to imported defaultProductsData
    console.log('Utilizando produtos locais importados.');
  }

  setupStoreHeader();
  renderCategoryTabs();
  renderProducts();
  updateCartUI();
  setupEventListeners();
}

/* ============================================================
   STORE HEADER SETUP
   ============================================================ */
function setupStoreHeader() {
  const { restaurant } = storeData;
  if (!restaurant) return;

  const storeNameEl = document.getElementById('storeName');
  const storeSloganEl = document.getElementById('storeSlogan');
  const metricTimeEl = document.getElementById('metricTime');
  const metricFeeEl = document.getElementById('metricFee');
  const metricPhoneEl = document.getElementById('metricPhone');
  const labelDeliveryFeeSub = document.getElementById('labelDeliveryFeeSub');

  if (storeNameEl) storeNameEl.textContent = restaurant.name;
  if (storeSloganEl) storeSloganEl.textContent = restaurant.slogan || `${restaurant.type} & Delivery`;
  if (metricTimeEl) metricTimeEl.textContent = restaurant.deliveryTime || '30-60 min';
  if (metricFeeEl) metricFeeEl.textContent = formatCurrency(restaurant.deliveryFee || 6.0);
  if (metricPhoneEl) metricPhoneEl.textContent = restaurant.phone || '(31) 99839-1633';
  if (labelDeliveryFeeSub) labelDeliveryFeeSub.textContent = `+ ${formatCurrency(restaurant.deliveryFee || 6.0)}`;
}

/* ============================================================
   CATEGORIES NAVIGATION
   ============================================================ */
function renderCategoryTabs() {
  const nav = document.getElementById('categoriesNav');
  if (!nav) return;

  const categories = storeData.categories || [];
  
  // Calculate count per category
  const counts = {};
  counts['todos'] = storeData.products.length;
  
  storeData.products.forEach(p => {
    const catId = p.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    counts[catId] = (counts[catId] || 0) + 1;
    counts[p.category] = (counts[p.category] || 0) + 1;
  });

  nav.innerHTML = categories.map(cat => {
    const isActive = cat.id === activeCategory;
    const count = cat.id === 'todos' ? counts['todos'] : (counts[cat.name] || counts[cat.id] || 0);

    return `
      <button 
        type="button" 
        class="category-tab ${isActive ? 'active' : ''}" 
        data-category-id="${cat.id}"
        data-category-name="${cat.name}"
      >
        <span class="category-icon">${cat.icon || '🍔'}</span>
        <span>${cat.name}</span>
        <span class="category-count">${count}</span>
      </button>
    `;
  }).join('');

  // Tab click events
  nav.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.categoryId;
      nav.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProducts();
    });
  });
}

/* ============================================================
   PRODUCTS FEED RENDERING
   ============================================================ */
function renderProducts() {
  const feed = document.getElementById('productsFeed');
  const emptyState = document.getElementById('emptySearchState');
  const searchInfo = document.getElementById('searchInfo');
  const searchQueryText = document.getElementById('searchQueryText');

  if (!feed) return;

  let filtered = storeData.products.filter(p => p.available !== false);

  // Search filter
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );

    if (searchInfo) {
      searchInfo.classList.remove('hidden');
      searchQueryText.textContent = searchQuery;
    }
  } else {
    if (searchInfo) searchInfo.classList.add('hidden');

    // Category filter
    if (activeCategory !== 'todos') {
      const selectedCatObj = storeData.categories.find(c => c.id === activeCategory);
      const catName = selectedCatObj ? selectedCatObj.name.toLowerCase() : activeCategory;

      filtered = filtered.filter(p => {
        const pCatNormalized = p.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const targetNormalized = catName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return pCatNormalized === targetNormalized || p.category.toLowerCase() === catName;
      });
    }
  }

  if (filtered.length === 0) {
    feed.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Group by category if viewing 'todos' and not searching
  if (activeCategory === 'todos' && searchQuery.trim() === '') {
    const categoriesMap = {};
    filtered.forEach(prod => {
      if (!categoriesMap[prod.category]) {
        categoriesMap[prod.category] = [];
      }
      categoriesMap[prod.category].push(prod);
    });

    let html = '';
    for (const [catName, prods] of Object.entries(categoriesMap)) {
      html += `
        <section class="category-section" id="cat-sec-${catName}">
          <h2 class="category-section-title">
            <span class="cat-dot"></span>
            ${catName}
          </h2>
          <div class="products-grid">
            ${prods.map(renderProductCardHtml).join('')}
          </div>
        </section>
      `;
    }
    feed.innerHTML = html;
  } else {
    feed.innerHTML = `
      <div class="products-grid">
        ${filtered.map(renderProductCardHtml).join('')}
      </div>
    `;
  }

  // Attach card click handlers
  feed.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const productId = card.dataset.productId;
      openProductCustomizationModal(productId);
    });
  });
}

function renderProductCardHtml(product) {
  let badgeHtml = '';
  if (product.badge && product.badge.trim() !== '') {
    const badgeText = product.badge.toUpperCase();
    let badgeClass = 'badge-mais-pedido';
    if (badgeText.includes('NOVO')) badgeClass = 'badge-novo';
    else if (badgeText.includes('PROMO')) badgeClass = 'badge-promocao';

    badgeHtml = `<span class="product-badge ${badgeClass}">${product.badge}</span>`;
  }

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-card-info">
        <div class="product-top-info">
          ${badgeHtml}
          <h3 class="product-title">${product.name}</h3>
          <p class="product-desc">${product.description}</p>
        </div>
        <div class="product-bottom-row">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <button type="button" class="product-add-mini-btn" aria-label="Adicionar ${product.name}">
            +
          </button>
        </div>
      </div>
      <div class="product-card-thumb-wrap">
        <img 
          src="${product.image}" 
          alt="${product.name}" 
          class="product-card-thumb" 
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'"
        />
      </div>
    </article>
  `;
}

/* ============================================================
   PRODUCT CUSTOMIZATION MODAL
   ============================================================ */
function openProductCustomizationModal(productId) {
  const product = storeData.products.find(p => p.id === productId);
  if (!product) return;

  currentCustomizingProduct = product;
  modalQuantity = 1;
  selectedAdditions = [];
  selectedRemovals = [];

  const modalOverlay = document.getElementById('productModalOverlay');
  const imgEl = document.getElementById('modalProductImage');
  const badgeEl = document.getElementById('modalProductBadge');
  const categoryEl = document.getElementById('modalProductCategory');
  const titleEl = document.getElementById('modalProductTitle');
  const descEl = document.getElementById('modalProductDesc');
  const basePriceEl = document.getElementById('modalProductPrice');
  const obsInput = document.getElementById('productObsInput');
  const obsCharCount = document.getElementById('obsCharCount');
  const qtyValEl = document.getElementById('modalQtyVal');

  // Fill Header Data
  imgEl.src = product.image;
  imgEl.onerror = () => { imgEl.src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80'; };
  categoryEl.textContent = product.category;
  titleEl.textContent = product.name;
  descEl.textContent = product.description;
  basePriceEl.textContent = formatCurrency(product.price);
  obsInput.value = '';
  obsCharCount.textContent = '0/140';
  qtyValEl.textContent = '1';

  // Badge
  if (product.badge && product.badge.trim() !== '') {
    badgeEl.textContent = product.badge;
    badgeEl.className = 'product-badge modal-badge';
    const badgeText = product.badge.toUpperCase();
    if (badgeText.includes('NOVO')) badgeEl.classList.add('badge-novo');
    else if (badgeText.includes('PROMO')) badgeEl.classList.add('badge-promocao');
    else badgeEl.classList.add('badge-mais-pedido');
    badgeEl.classList.remove('hidden');
  } else {
    badgeEl.classList.add('hidden');
  }

  // Removals Section
  const removalsSection = document.getElementById('removalsSection');
  const removalsList = document.getElementById('removalsList');
  if (product.removals && product.removals.length > 0) {
    removalsSection.classList.remove('hidden');
    removalsList.innerHTML = product.removals.map((rem, index) => `
      <div class="option-row" data-type="removal" data-index="${index}">
        <div class="option-row-left">
          <div class="custom-checkbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="option-name">${rem}</span>
        </div>
      </div>
    `).join('');

    removalsList.querySelectorAll('.option-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = Number(row.dataset.index);
        const remItem = product.removals[idx];
        const isSelected = selectedRemovals.includes(remItem);

        if (isSelected) {
          selectedRemovals = selectedRemovals.filter(r => r !== remItem);
          row.classList.remove('selected');
        } else {
          selectedRemovals.push(remItem);
          row.classList.add('selected');
        }
      });
    });
  } else {
    removalsSection.classList.add('hidden');
    removalsList.innerHTML = '';
  }

  // Additions Section
  const additionsSection = document.getElementById('additionsSection');
  const additionsList = document.getElementById('additionsList');
  if (product.additions && product.additions.length > 0) {
    additionsSection.classList.remove('hidden');
    additionsList.innerHTML = product.additions.map((add, index) => `
      <div class="option-row" data-type="addition" data-index="${index}">
        <div class="option-row-left">
          <div class="custom-checkbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="option-name">${add.name}</span>
        </div>
        <span class="option-price">+ ${formatCurrency(add.price)}</span>
      </div>
    `).join('');

    additionsList.querySelectorAll('.option-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = Number(row.dataset.index);
        const addItem = product.additions[idx];
        const exists = selectedAdditions.some(a => a.id === addItem.id);

        if (exists) {
          selectedAdditions = selectedAdditions.filter(a => a.id !== addItem.id);
          row.classList.remove('selected');
        } else {
          selectedAdditions.push(addItem);
          row.classList.add('selected');
        }

        updateModalPriceSummary();
      });
    });
  } else {
    additionsSection.classList.add('hidden');
    additionsList.innerHTML = '';
  }

  updateModalPriceSummary();
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modalOverlay = document.getElementById('productModalOverlay');
  modalOverlay.classList.add('hidden');
  currentCustomizingProduct = null;
  document.body.style.overflow = '';
}

function updateModalPriceSummary() {
  if (!currentCustomizingProduct) return;

  const additionsTotal = selectedAdditions.reduce((sum, item) => sum + Number(item.price), 0);
  const singleItemTotal = Number(currentCustomizingProduct.price) + additionsTotal;
  const overallTotal = singleItemTotal * modalQuantity;

  const priceEl = document.getElementById('modalAddTotalPrice');
  if (priceEl) {
    priceEl.textContent = formatCurrency(overallTotal);
  }
}

/* ============================================================
   CART OPERATIONS & CHECKOUT
   ============================================================ */
function addItemToCart() {
  if (!currentCustomizingProduct) return;

  const obsInput = document.getElementById('productObsInput');
  const observation = obsInput ? obsInput.value.trim() : '';

  const additionsSum = selectedAdditions.reduce((s, a) => s + Number(a.price), 0);
  const unitPrice = Number(currentCustomizingProduct.price) + additionsSum;

  const cartItem = {
    cartItemId: Date.now() + Math.random().toString(36).substring(2, 7),
    productId: currentCustomizingProduct.id,
    name: currentCustomizingProduct.name,
    category: currentCustomizingProduct.category,
    basePrice: Number(currentCustomizingProduct.price),
    unitPrice: unitPrice,
    quantity: modalQuantity,
    additions: [...selectedAdditions],
    removals: [...selectedRemovals],
    observation: observation
  };

  // Check if identical item already exists (same product, additions, removals, observation)
  const existingIndex = cart.findIndex(item => 
    item.productId === cartItem.productId &&
    item.observation === cartItem.observation &&
    JSON.stringify(item.additions.map(a => a.id).sort()) === JSON.stringify(cartItem.additions.map(a => a.id).sort()) &&
    JSON.stringify(item.removals.sort()) === JSON.stringify(cartItem.removals.sort())
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += cartItem.quantity;
  } else {
    cart.push(cartItem);
  }

  saveCartToStorage();
  updateCartUI();
  closeProductModal();
  showToast(`${cartItem.name} adicionado à sacola! 🛍️`);
}

function updateCartItemQuantity(cartItemId, delta) {
  const itemIndex = cart.findIndex(i => i.cartItemId === cartItemId);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  saveCartToStorage();
  updateCartUI();
  renderCartDrawerItems();
}

function removeCartItem(cartItemId) {
  cart = cart.filter(i => i.cartItemId !== cartItemId);
  saveCartToStorage();
  updateCartUI();
  renderCartDrawerItems();
}

function getCartCalculations() {
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee = orderType === 'delivery' ? Number(storeData.restaurant.deliveryFee || 6.0) : 0;
  const grandTotal = subtotal + deliveryFee;

  return { subtotal, totalItems, deliveryFee, grandTotal };
}

function updateCartUI() {
  const { subtotal, totalItems, deliveryFee, grandTotal } = getCartCalculations();

  const floatingCartBar = document.getElementById('floatingCartBar');
  const cartCountBadge = document.getElementById('cartCountBadge');
  const cartItemsSummary = document.getElementById('cartItemsSummary');
  const cartBarTotal = document.getElementById('cartBarTotal');

  if (totalItems > 0) {
    floatingCartBar.classList.remove('hidden');
    cartCountBadge.textContent = totalItems;
    cartItemsSummary.textContent = totalItems === 1 ? '1 item adicionado' : `${totalItems} itens adicionados`;
    cartBarTotal.textContent = formatCurrency(subtotal);
  } else {
    floatingCartBar.classList.add('hidden');
  }

  // Update Drawer Financial Summary
  const summarySubtotal = document.getElementById('summarySubtotal');
  const summaryDeliveryFee = document.getElementById('summaryDeliveryFee');
  const summaryGrandTotal = document.getElementById('summaryGrandTotal');
  const summaryDeliveryRow = document.getElementById('summaryDeliveryRow');

  if (summarySubtotal) summarySubtotal.textContent = formatCurrency(subtotal);
  if (summaryDeliveryFee) summaryDeliveryFee.textContent = orderType === 'delivery' ? formatCurrency(deliveryFee) : 'Grátis (Retirada)';
  if (summaryGrandTotal) summaryGrandTotal.textContent = formatCurrency(grandTotal);

  if (summaryDeliveryRow) {
    if (orderType === 'pickup') {
      summaryDeliveryFee.style.color = '#16a34a';
      summaryDeliveryFee.style.fontWeight = 'bold';
    } else {
      summaryDeliveryFee.style.color = '';
      summaryDeliveryFee.style.fontWeight = '';
    }
  }
}

/* ============================================================
   CART DRAWER VIEW
   ============================================================ */
function openCartDrawer() {
  renderCartDrawerItems();
  updateCartUI();

  const overlay = document.getElementById('cartModalOverlay');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const overlay = document.getElementById('cartModalOverlay');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderCartDrawerItems() {
  const listEl = document.getElementById('cartItemsList');
  const emptyView = document.getElementById('emptyCartView');
  const formSection = document.getElementById('checkoutFormSection');
  const footerAction = document.getElementById('drawerFooterAction');

  if (!listEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = '';
    emptyView.classList.remove('hidden');
    formSection.classList.add('hidden');
    footerAction.classList.add('hidden');
    return;
  }

  emptyView.classList.add('hidden');
  formSection.classList.remove('hidden');
  footerAction.classList.remove('hidden');

  listEl.innerHTML = cart.map(item => {
    let metaHtml = '';

    if (item.additions && item.additions.length > 0) {
      metaHtml += `<span class="cart-item-meta-item additions">➕ Adicionais: ${item.additions.map(a => `${a.name} (+${formatCurrency(a.price)})`).join(', ')}</span>`;
    }

    if (item.removals && item.removals.length > 0) {
      metaHtml += `<span class="cart-item-meta-item removals">❌ ${item.removals.join(', ')}</span>`;
    }

    if (item.observation) {
      metaHtml += `<span class="cart-item-meta-item obs">📝 Obs: ${item.observation}</span>`;
    }

    const itemTotal = item.unitPrice * item.quantity;

    return `
      <div class="cart-item-row" data-cart-item-id="${item.cartItemId}">
        <div class="cart-item-details">
          <div class="cart-item-title-line">
            <span class="cart-item-qty-tag">${item.quantity}x</span>
            <strong class="cart-item-name">${item.name}</strong>
          </div>
          ${metaHtml ? `<div class="cart-item-meta">${metaHtml}</div>` : ''}
        </div>
        <div class="cart-item-actions">
          <span class="cart-item-price">${formatCurrency(itemTotal)}</span>
          <div class="cart-item-controls">
            <button type="button" class="cart-item-btn btn-minus" data-action="minus" aria-label="Diminuir">
              -
            </button>
            <span class="qty-number" style="font-size: 0.95rem;">${item.quantity}</span>
            <button type="button" class="cart-item-btn btn-plus" data-action="plus" aria-label="Aumentar">
              +
            </button>
            <button type="button" class="cart-item-btn btn-remove" data-action="remove" aria-label="Remover">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Cart item events
  listEl.querySelectorAll('.cart-item-row').forEach(row => {
    const id = row.dataset.cartItemId;
    row.querySelector('[data-action="minus"]').addEventListener('click', () => updateCartItemQuantity(id, -1));
    row.querySelector('[data-action="plus"]').addEventListener('click', () => updateCartItemQuantity(id, 1));
    row.querySelector('[data-action="remove"]').addEventListener('click', () => removeCartItem(id));
  });
}

/* ============================================================
   CHECKOUT & WHATSAPP MESSAGE GENERATION
   ============================================================ */
function handleFinishOrderWhatsApp() {
  if (cart.length === 0) {
    alert('Sua sacola está vazia! Escolha itens no cardápio.');
    return;
  }

  // Customer validations
  const custNameInput = document.getElementById('custName');
  const custPhoneInput = document.getElementById('custPhone');

  const custName = custNameInput ? custNameInput.value.trim() : '';
  const custPhone = custPhoneInput ? custPhoneInput.value.trim() : '';

  if (!custName) {
    alert('Por favor, informe o seu Nome Completo.');
    custNameInput?.focus();
    return;
  }

  if (!custPhone) {
    alert('Por favor, informe o seu número de WhatsApp / Telefone.');
    custPhoneInput?.focus();
    return;
  }

  // Address validation if Delivery
  let addressDetails = {};
  if (orderType === 'delivery') {
    const street = document.getElementById('addrStreet')?.value.trim();
    const number = document.getElementById('addrNumber')?.value.trim();
    const neighborhood = document.getElementById('addrNeighborhood')?.value.trim();
    const complement = document.getElementById('addrComplement')?.value.trim();
    const reference = document.getElementById('addrReference')?.value.trim();

    if (!street) {
      alert('Por favor, informe a Rua / Logradouro para entrega.');
      document.getElementById('addrStreet')?.focus();
      return;
    }
    if (!number) {
      alert('Por favor, informe o Número do endereço.');
      document.getElementById('addrNumber')?.focus();
      return;
    }
    if (!neighborhood) {
      alert('Por favor, informe o Bairro.');
      document.getElementById('addrNeighborhood')?.focus();
      return;
    }

    addressDetails = { street, number, neighborhood, complement, reference };
  }

  // Payment method
  const selectedPaymentEl = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = selectedPaymentEl ? selectedPaymentEl.value : 'PIX';
  const cashChangeVal = document.getElementById('cashChangeInput')?.value.trim();

  // Financial calculations
  const { subtotal, deliveryFee, grandTotal } = getCartCalculations();

  // Assemble WhatsApp message formatted with markdown
  const store = storeData.restaurant;
  let msg = `🍔 *NOVO PEDIDO - ${store.name.toUpperCase()}* 🍔\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 *Cliente:* ${custName}\n`;
  msg += `📱 *Telefone:* ${custPhone}\n`;
  msg += `🛵 *Tipo:* ${orderType === 'delivery' ? 'Entrega (Delivery)' : 'Retirada no Balcão'}\n`;

  if (orderType === 'delivery') {
    msg += `📍 *Endereço:* ${addressDetails.street}, ${addressDetails.number} - ${addressDetails.neighborhood}\n`;
    if (addressDetails.complement) {
      msg += `🏢 *Complemento:* ${addressDetails.complement}\n`;
    }
    if (addressDetails.reference) {
      msg += `📌 *Ponto de ref.:* ${addressDetails.reference}\n`;
    }
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📋 *ITENS DO PEDIDO:*\n\n`;

  cart.forEach(item => {
    const itemTotal = item.unitPrice * item.quantity;
    msg += `• *${item.quantity}x ${item.name}* — ${formatCurrency(itemTotal)}\n`;

    if (item.additions && item.additions.length > 0) {
      const addText = item.additions.map(a => `${a.name} (+${formatCurrency(a.price)})`).join(', ');
      msg += `  ➕ Adicionais: ${addText}\n`;
    }

    if (item.removals && item.removals.length > 0) {
      msg += `  ❌ ${item.removals.join(', ')}\n`;
    }

    if (item.observation) {
      msg += `  📝 Obs: ${item.observation}\n`;
    }

    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💵 *RESUMO DE VALORES:*\n`;
  msg += `Subtotal: ${formatCurrency(subtotal)}\n`;
  if (orderType === 'delivery') {
    msg += `Taxa de entrega: ${formatCurrency(deliveryFee)}\n`;
  } else {
    msg += `Taxa de entrega: Grátis (Retirada)\n`;
  }
  msg += `*TOTAL A PAGAR: ${formatCurrency(grandTotal)}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

  let payStr = paymentMethod;
  if (paymentMethod === 'Dinheiro' && cashChangeVal) {
    payStr += ` (Troco para: ${cashChangeVal})`;
  } else if (paymentMethod === 'Dinheiro') {
    payStr += ` (Não precisa de troco)`;
  }
  msg += `💳 *Forma de pagamento:* ${payStr}\n`;
  msg += `⏰ *Tempo estimado:* ${store.deliveryTime || '30-60 min'}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Pedido gerado pelo Cardápio Digital Hooligans_`;

  // WhatsApp wa.me Link
  const targetNumber = store.whatsapp || '5531998391633';
  const encodedMsg = encodeURIComponent(msg);
  const waUrl = `https://wa.me/${targetNumber}?text=${encodedMsg}`;

  // Open WhatsApp in new tab/window
  window.open(waUrl, '_blank');

  // Confirmation feedback
  showToast('Redirecionando para o WhatsApp... 📲', '🟢');
}

/* ============================================================
   GLOBAL EVENT LISTENERS
   ============================================================ */
function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const resetSearchLink = document.getElementById('resetSearchLink');
  const emptyStateResetBtn = document.getElementById('emptyStateResetBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchQuery.trim() !== '') {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      renderProducts();
    });
  }

  function clearSearch() {
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    renderProducts();
  }

  if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
  if (resetSearchLink) resetSearchLink.addEventListener('click', clearSearch);
  if (emptyStateResetBtn) emptyStateResetBtn.addEventListener('click', clearSearch);

  // Product Modal Controls
  const closeProductModalBtn = document.getElementById('closeProductModalBtn');
  const productModalOverlay = document.getElementById('productModalOverlay');
  const modalQtyMinusBtn = document.getElementById('modalQtyMinusBtn');
  const modalQtyPlusBtn = document.getElementById('modalQtyPlusBtn');
  const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');
  const productObsInput = document.getElementById('productObsInput');
  const obsCharCount = document.getElementById('obsCharCount');

  if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', closeProductModal);
  if (productModalOverlay) {
    productModalOverlay.addEventListener('click', (e) => {
      if (e.target === productModalOverlay) closeProductModal();
    });
  }

  if (modalQtyMinusBtn) {
    modalQtyMinusBtn.addEventListener('click', () => {
      if (modalQuantity > 1) {
        modalQuantity--;
        document.getElementById('modalQtyVal').textContent = modalQuantity;
        updateModalPriceSummary();
      }
    });
  }

  if (modalQtyPlusBtn) {
    modalQtyPlusBtn.addEventListener('click', () => {
      modalQuantity++;
      document.getElementById('modalQtyVal').textContent = modalQuantity;
      updateModalPriceSummary();
    });
  }

  if (productObsInput) {
    productObsInput.addEventListener('input', (e) => {
      obsCharCount.textContent = `${e.target.value.length}/140`;
    });
  }

  if (modalAddToCartBtn) {
    modalAddToCartBtn.addEventListener('click', addItemToCart);
  }

  // Cart Drawer Controls
  const openCartBtn = document.getElementById('openCartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartModalOverlay = document.getElementById('cartModalOverlay');
  const startShoppingBtn = document.getElementById('startShoppingBtn');

  if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
  if (startShoppingBtn) startShoppingBtn.addEventListener('click', closeCartDrawer);
  if (cartModalOverlay) {
    cartModalOverlay.addEventListener('click', (e) => {
      if (e.target === cartModalOverlay) closeCartDrawer();
    });
  }

  // Delivery vs Pickup Toggle
  const btnTypeDelivery = document.getElementById('btnTypeDelivery');
  const btnTypePickup = document.getElementById('btnTypePickup');
  const deliveryAddressSection = document.getElementById('deliveryAddressSection');
  const paymentStepLabel = document.getElementById('paymentStepLabel');

  if (btnTypeDelivery && btnTypePickup) {
    btnTypeDelivery.addEventListener('click', () => {
      orderType = 'delivery';
      btnTypeDelivery.classList.add('active');
      btnTypePickup.classList.remove('active');
      deliveryAddressSection.classList.remove('hidden');
      if (paymentStepLabel) paymentStepLabel.textContent = '3. Forma de Pagamento';
      updateCartUI();
    });

    btnTypePickup.addEventListener('click', () => {
      orderType = 'pickup';
      btnTypePickup.classList.add('active');
      btnTypeDelivery.classList.remove('active');
      deliveryAddressSection.classList.add('hidden');
      if (paymentStepLabel) paymentStepLabel.textContent = '2. Forma de Pagamento';
      updateCartUI();
    });
  }

  // Payment Method Radios (show/hide cash change input)
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  const cashChangeSection = document.getElementById('cashChangeSection');
  const pixNotice = document.getElementById('pixNotice');

  paymentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'Dinheiro') {
        cashChangeSection.classList.remove('hidden');
        pixNotice.classList.add('hidden');
      } else if (radio.value === 'PIX') {
        cashChangeSection.classList.add('hidden');
        pixNotice.classList.remove('hidden');
      } else {
        cashChangeSection.classList.add('hidden');
        pixNotice.classList.add('hidden');
      }
    });
  });

  // Finish Order Button
  const finishOrderBtn = document.getElementById('finishOrderWhatsAppBtn');
  if (finishOrderBtn) {
    finishOrderBtn.addEventListener('click', handleFinishOrderWhatsApp);
  }

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCartDrawer();
    }
  });
}

// Start app on DOM load
window.addEventListener('DOMContentLoaded', initApp);
