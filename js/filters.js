let currentFilter = "all";
let currentSort = "default";

function setFilter(filter) {
    currentFilter = filter;
}

function setSort(sort) {
    currentSort = sort;
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

// ========== МОДУЛЬНЫЕ ТЕСТЫ ==========
function runFilterTests() {
    console.log("\n=== МОДУЛЬНЫЕ ТЕСТЫ: Фильтрация ===");
    
    console.log("\nТест 1: Фильтрация по категории");
    
    // Тест: все блюда
    setFilter("all");
    const allProducts = getFilteredAndSortedProducts();
    const test1 = allProducts.length === products.length;
    console.log(`  1. ${test1 ? "✅ PASS" : "❌ FAIL"} - Все блюда (ожид: ${products.length}, факт: ${allProducts.length})`);
    
    // Тест: главные блюда
    setFilter("main");
    const mainProducts = getFilteredAndSortedProducts();
    const test2 = mainProducts.every(p => p.category === "main");
    console.log(`  2. ${test2 ? "✅ PASS" : "❌ FAIL"} - Только главные блюда (${mainProducts.length} шт)`);
    
    // Тест: закуски
    setFilter("snack");
    const snackProducts = getFilteredAndSortedProducts();
    const test3 = snackProducts.every(p => p.category === "snack");
    console.log(`  3. ${test3 ? "✅ PASS" : "❌ FAIL"} - Только закуски (${snackProducts.length} шт)`);
    
    console.log("\nТест 2: Сортировка по цене");
    setFilter("all");
    
    // По возрастанию
    setSort("cheap");
    const cheapSorted = getFilteredAndSortedProducts();
    let isSortedAsc = true;
    for (let i = 0; i < cheapSorted.length - 1; i++) {
        if (cheapSorted[i].price > cheapSorted[i + 1].price) {
            isSortedAsc = false;
            break;
        }
    }
    console.log(`  1. ${isSortedAsc ? "✅ PASS" : "❌ FAIL"} - От дешевых к дорогим`);
    
    // По убыванию
    setSort("expensive");
    const expensiveSorted = getFilteredAndSortedProducts();
    let isSortedDesc = true;
    for (let i = 0; i < expensiveSorted.length - 1; i++) {
        if (expensiveSorted[i].price < expensiveSorted[i + 1].price) {
            isSortedDesc = false;
            break;
        }
    }
    console.log(`  2. ${isSortedDesc ? "✅ PASS" : "❌ FAIL"} - От дорогих к дешевым`);
    
    // Без сортировки
    setSort("default");
    const defaultSorted = getFilteredAndSortedProducts();
    const test6 = defaultSorted.length === products.length;
    console.log(`  3. ${test6 ? "✅ PASS" : "❌ FAIL"} - Без сортировки (${defaultSorted.length} шт)`);
    
    console.log("\nТест 3: Комбинация фильтр + сортировка");
    setFilter("main");
    setSort("cheap");
    const combined = getFilteredAndSortedProducts();
    const test7 = combined.every(p => p.category === "main");
    let isSortedCombined = true;
    for (let i = 0; i < combined.length - 1; i++) {
        if (combined[i].price > combined[i + 1].price) {
            isSortedCombined = false;
            break;
        }
    }
    console.log(`  1. ${test7 && isSortedCombined ? "✅ PASS" : "❌ FAIL"} - Главные блюда, отсортированные по цене`);
    
    // Сброс
    setFilter("all");
    setSort("default");
    
    console.log("====================================\n");
}

// Автоматический запуск тестов в режиме DEBUG
if (typeof DEBUG_MODE !== "undefined" && DEBUG_MODE) {
    // Небольшая задержка чтобы продукты загрузились
    setTimeout(runFilterTests, 150);
}
