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

function openModal(product) {
    modalImg.src = product.image;
    modalImg.alt = product.name;
    modalName.textContent = product.name;
    modalArticle.textContent = product.article || '';
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

        const isFav = isFavorite(product.id);

        card.innerHTML = `
            <button class="favorite-btn" data-id="${product.id}" title="Добавить в избранное">
                <span class="heart-icon">${isFav ? '❤️' : '♡'}</span>
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
            renderProducts(getFilteredAndSortedProducts());
            if (favoritesModal.classList.contains('active')) {
                renderFavoritesModal();
            }
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

function renderFavoritesModal() {
    const container = document.getElementById('favorites-items');
    const totalSumEl = document.getElementById('total-sum');
    const favs = getFavorites();

    if (favs.length === 0) {
        container.innerHTML = '<p class="favorites-empty">В избранном нет товаров</p>';
        totalSumEl.textContent = '0 руб.';
        return;
    }

    container.innerHTML = '';
    let total = 0;

    favs.forEach(item => {
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

function applyFiltersAndSort() {
    renderProducts(getFilteredAndSortedProducts());
}

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setFilter(btn.dataset.filter);
        applyFiltersAndSort();
    });
});

sortSelect.addEventListener('change', () => {
    setSort(sortSelect.value);
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
    if (getFavorites().length > 0) {
        clearAllFavorites();
        renderProducts(getFilteredAndSortedProducts());
        renderFavoritesModal();
    }
});

renderProducts(products);
