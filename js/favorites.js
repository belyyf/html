let favorites = [];

function loadFavorites() {
    if (DEBUG_MODE) {
        debugLog.time("loadFavorites");
        debugLog.info("Загрузка избранного из localStorage");
    }

    try {
        const saved = localStorage.getItem("favorites");
        if (saved) {
            favorites = JSON.parse(saved);
            if (DEBUG_MODE) {
                debugLog.info("Загружено элементов:", favorites.length);
            }
        }
    } catch (error) {
        if (DEBUG_MODE) {
            debugLog.error("Ошибка загрузки избранного:", error.message);
        }
        favorites = [];
    }

    updateFavoritesCount();

    if (DEBUG_MODE) {
        debugLog.timeEnd("loadFavorites");
    }
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function updateFavoritesCount() {
    const count = favorites.reduce((sum, item) => sum + item.quantity, 0);
    const countEl = document.getElementById('favorites-count');
    if (countEl) {
        countEl.textContent = count;
    }
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
}

function increaseQuantity(productId) {
    const item = favorites.find(f => f.id === productId);
    if (item) {
        item.quantity++;
        saveFavorites();
        updateFavoritesCount();
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
    }
}

function removeFromFavorites(productId) {
    const index = favorites.findIndex(f => f.id === productId);
    if (index !== -1) {
        favorites.splice(index, 1);
        saveFavorites();
        updateFavoritesCount();
    }
}

function clearAllFavorites() {
    favorites = [];
    saveFavorites();
    updateFavoritesCount();
}

function getFavorites() {
    return favorites;
}

function isFavorite(productId) {
    return favorites.some(f => f.id === productId);
}
