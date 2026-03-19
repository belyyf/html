let currentFilter = 'all';
let currentSort = 'default';

function setFilter(filter) {
    currentFilter = filter;
}

function setSort(sort) {
    currentSort = sort;
}

function getCurrentFilter() {
    return currentFilter;
}

function getCurrentSort() {
    return currentSort;
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
