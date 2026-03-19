const products = [
    {
        id: 1,
        name: "Стейк Рибай",
        price: 850,
        image: "images/food/steak.jpg",
        category: "main",
        description: "Сочный стейк из мраморной говядины зернового откорма. Готовится на гриле до идеальной степени прожарки. Подаётся с фирменным соусом. Вес порции: 350 г."
    },
    {
        id: 2,
        name: "Паста Карбонара",
        price: 450,
        image: "images/food/pasta.jpg",
        category: "main",
        description: "Классическая итальянская паста с гуанчиале, яичным желтком, сыром пекорино романо и чёрным перцем. Готовится без сливок, по традиционному римскому рецепту. Вес порции: 300 г."
    },
    {
        id: 3,
        name: "Цезарь с курицей",
        price: 380,
        image: "images/food/salad.jpg",
        category: "snack",
        description: "Свежий салат романо с нежным куриным филе гриль, хрустящими сухариками из белого хлеба, пармезаном и фирменным соусом Цезарь. Вес порции: 250 г."
    },
    {
        id: 4,
        name: "Суп Минестроне",
        price: 280,
        image: "images/food/soup.jpg",
        category: "main",
        description: "Традиционный итальянский овощной суп с сезонными овощами, белой фасолью и пастой. Подаётся с базиликом и пармезаном. Лёгкий и полезный. Вес порции: 350 мл."
    },
    {
        id: 5,
        name: "Фирменный бургер",
        price: 520,
        image: "images/food/burger.jpg",
        article: "BRG-005",
        category: "main",
        description: "Сочная котлета из мраморной говядины с сыром чеддер, свежими томатами, маринованными огурцами, красным луком и фирменным соусом на булочке бриошь. Вес порции: 400 г."
    },
    {
        id: 6,
        name: "Морской микс",
        price: 750,
        image: "images/food/seafood.jpg",
        article: "SEA-006",
        category: "snack",
        description: "Ассорти из морепродуктов: тигровые креветки, кальмары, мидии и осьминоги, обжаренные на гриле с чесноком и оливковым маслом. Подаётся с лимоном и соусом тартар. Вес порции: 300 г."
    }
];

let favorites = [];

function loadFavorites() {
    const saved = localStorage.getItem('favorites');
    if (saved) {
        favorites = JSON.parse(saved);
    }
    updateFavoritesCount();
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function updateFavoritesCount() {
    const count = favorites.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('favorites-count').textContent = count;
}

function toggleFavorite(productId) {
    const existingIndex = favorites.findIndex(f => f.id === productId);

    if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1);
    } else {
        const product = products.find(p => p.id === productId);
        favorites.push({
            ...product,
            quantity: 1
        });
    }

    saveFavorites();
    updateFavoritesCount();
    renderProducts(getFilteredAndSortedProducts());

    if (document.getElementById('favorites-modal').classList.contains('active')) {
        renderFavoritesModal();
    }
}

function increaseQuantity(productId) {
    const item = favorites.find(f => f.id === productId);
    if (item) {
        item.quantity++;
        saveFavorites();
        updateFavoritesCount();
        renderFavoritesModal();
    }
}

function decreaseQuantity(productId) {
    const index = favorites.findIndex(f => f.id === productId);
    if (index !== -1) {
        favorites[index].quantity--;
        if (favorites[index].quantity <= 0) {
            favorites.splice(index, 1);
        }
        saveFavorites();
        updateFavoritesCount();
        renderFavoritesModal();
    }
}

function removeFromFavorites(productId) {
    const index = favorites.findIndex(f => f.id === productId);
    if (index !== -1) {
        favorites.splice(index, 1);
        saveFavorites();
        updateFavoritesCount();
        renderProducts(getFilteredAndSortedProducts());
        renderFavoritesModal();
    }
}

function clearAllFavorites() {
    favorites = [];
    saveFavorites();
    updateFavoritesCount();
    renderProducts(getFilteredAndSortedProducts());
    renderFavoritesModal();
}

function renderFavoritesModal() {
    const container = document.getElementById('favorites-items');
    const totalSumEl = document.getElementById('total-sum');

    if (favorites.length === 0) {
        container.innerHTML = '<p class="favorites-empty">В избранном нет товаров</p>';
        totalSumEl.textContent = '0 руб.';
        return;
    }

    container.innerHTML = '';
    let total = 0;

    favorites.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const itemEl = document.createElement('div');
        itemEl.className = 'favorites-item';
        itemEl.innerHTML = `
            <div class="favorites-item-info">
                <img src="${item.image}" alt="${item.name}" class="favorites-item-img">
                <div class="favorites-item-details">
                    <h4>${item.name}</h4>
                    <p class="favorites-item-price">${item.price} руб.</p>
                </div>
            </div>
            <div class="favorites-item-controls">
                <button class="quantity-btn" onclick="decreaseQuantity(${item.id})">−</button>
                <span class="quantity-value">${item.quantity}</span>
                <button class="quantity-btn" onclick="increaseQuantity(${item.id})">+</button>
                <button class="remove-btn" onclick="removeFromFavorites(${item.id})" title="Удалить">✕</button>
            </div>
            <div class="favorites-item-total">${itemTotal} руб.</div>
        `;

        container.appendChild(itemEl);
    });

    totalSumEl.textContent = `${total} руб.`;
}

function getFilteredAndSortedProducts() {
    let filtered = [...products];

    if (currentFilter === 'main') {
        filtered = products.filter(p => p.category === 'main');
    } else if (currentFilter === 'snack') {
        filtered = products.filter(p => p.category === 'snack');
    }

    if (currentSort === 'cheap') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'expensive') {
        filtered.sort((a, b) => b.price - a.price);
    }

    return filtered;
}

const container = document.getElementById('products-container');
const filterButtons = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sort-select');
const modal = document.getElementById('product-modal');
const modalClose = document.getElementById('modal-close');
const modalImg = document.getElementById('modal-img');
const modalName = document.getElementById('modal-name');
const modalArticle = document.getElementById('modal-article');
const modalPrice = document.getElementById('modal-price');
const modalDescription = document.getElementById('modal-description');

const favoritesBtn = document.getElementById('favorites-btn');
const favoritesModal = document.getElementById('favorites-modal');
const favoritesModalClose = document.getElementById('favorites-modal-close');
const clearFavoritesBtn = document.getElementById('clear-favorites');

let currentFilter = 'all';
let currentSort = 'default';

loadFavorites();

function openModal(product) {
    modalImg.src = product.image;
    modalImg.alt = product.name;
    modalName.textContent = product.name;
    modalArticle.textContent = product.article;
    modalPrice.textContent = `${product.price} руб.`;
    modalDescription.textContent = product.description;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

function renderProducts(items) {
    container.innerHTML = '';

    items.forEach(product => {
        const card = document.createElement('div');
        card.className = 'menu-item';

        const isFavorite = favorites.some(f => f.id === product.id);

        card.innerHTML = `
            <button class="favorite-btn" data-id="${product.id}" title="Добавить в избранное">
                <span class="heart-icon">${isFavorite ? '❤️' : '♡'}</span>
            </button>
            <h3 class="product-name" data-id="${product.id}">${product.name}</h3>
            <p class="price">${product.price} руб.</p>
            <img src="${product.image}" alt="${product.name}" width="200" height="150" class="product-image" data-id="${product.id}">
            <button class="details-btn" data-id="${product.id}">Подробнее</button>
        `;

        container.appendChild(card);
    });

    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id);
        });
    });

    document.querySelectorAll('.product-name').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) openModal(product);
        });
    });

    document.querySelectorAll('.product-image').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) openModal(product);
        });
    });

    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === id);
            if (product) openModal(product);
        });
    });
}

function applyFiltersAndSort() {
    renderProducts(getFilteredAndSortedProducts());
}

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        applyFiltersAndSort();
    });
});

sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    applyFiltersAndSort();
});

favoritesBtn.addEventListener('click', () => {
    renderFavoritesModal();
    favoritesModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

favoritesModalClose.addEventListener('click', () => {
    favoritesModal.classList.remove('active');
    document.body.style.overflow = '';
});

favoritesModal.addEventListener('click', (e) => {
    if (e.target === favoritesModal) {
        favoritesModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

clearFavoritesBtn.addEventListener('click', () => {
    if (favorites.length > 0) {
        clearAllFavorites();
    }
});

renderProducts(products);
