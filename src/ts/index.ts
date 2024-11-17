import { Product } from "./Product";

const serverUrl = "http://localhost:5000/products";

let displayedProducts = 0;
const PRODUCTS_PER_LOAD = 6;
const INITIAL_PRODUCTS = 6;

//  Busca os produtos da API
async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(serverUrl);
  if (!response.ok) {
    throw new Error("Erro ao buscar os produtos");
  }
  return response.json();
}

//  Formatar o preço em Real (BRL)
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

//  Criar o HTML de um produto
function createProductCard(product: Product): string {
  const { name, price, parcelamento, image } = product;
  const [installments, installmentValue] = parcelamento;

  return `
    <article class="product-card">
      <img src="./assets/${image}" alt="${name}" class="product-card__image">
      <div class="product-card__details">
        <h2 class="product-card__title">${name}</h2>
        <strong class="product-card__price">${formatCurrency(price)}</strong>
        <span class="product-card__installments">
          até ${installments}x de ${formatCurrency(installmentValue)}
        </span>
      </div>
      <button class="product-card__button">Comprar</button>
    </article>
  `;
}

//  Capturar valores únicos de um array
function getUniqueValues<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

//  Gerar os filtros dinamicamente com base no JSON de produtos
async function generateFilters() {
  const filtersSidebar = document.querySelector(".filters-sidebar");
  if (!filtersSidebar) {
    console.error("Elemento de filtros não encontrado.");
    return;
  }

  try {
    const products = await fetchProducts();

    const colors = getUniqueValues(products.map((product) => product.color));
    const sizes = getUniqueValues(products.flatMap((product) => product.size));
    const prices = getUniqueValues(products.map((product) => product.price)).sort((a, b) => a - b);

    filtersSidebar.innerHTML = `
      <div class="filter-group">
        <h3 class="filter-group__title">Cores</h3>
        <div class="filter-options">
          ${colors
            .map(
              (color) => `
              <label class="filter-label">
                <input type="checkbox" name="${color}" id="cor-${color}" class="filter-input">
                <span class="filter-text">${color}</span>
              </label>
            `
            )
            .join("")}
        </div>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__title">Tamanhos</h3>
        <div class="filter-options  filter-options__tamanho">
          ${sizes
            .map(
              (size) => `
              <label class="filter-label filter-label__tamanho">
                <input type="checkbox" name="${size}" id="tamanho-${size}" class="filter-input  filter-input__tamanho">
                <span class="filter-text filter-text__tamanho">${size}</span>
              </label>
            `
            )
            .join("")}
        </div>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__title">Faixa de preço</h3>
        <div class="filter-options">
          ${prices
            .map(
              (price, index) =>
                `<label class="filter-label">
                  <input type="checkbox" name="${price}" id="preco-${index}" class="filter-input">
                  <span class="filter-text filter-text-price">
                    ${index === 0 ? `de 0 até ${formatCurrency(price)}` : `de ${formatCurrency(prices[index - 1])} até ${formatCurrency(price)}`}
                  </span>
                </label>`
            )
            .join("")}
        </div>
      </div>
    `;

    setupFilterEvents();
  } catch (error) {
    console.error("Erro ao gerar filtros:", error);
  }
}

//  Ordenar os produtos com base no critério selecionado
function sortProducts(products: Product[], orderBy: string): Product[] {
  switch (orderBy) {
    case "Menor preço":
      return products.sort((a, b) => a.price - b.price);
    case "Maior preço":
      return products.sort((a, b) => b.price - a.price);
    case "Mais recentes":
      return products.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    default:
      return products;
  }
}

//  Capturar os valores selecionados dos filtros
function getSelectedFilters(): { colors: string[]; sizes: string[]; priceRange: number[] } {
  const selectedColors = Array.from(document.querySelectorAll('input[id^="cor-"]:checked'))
    .map((input) => (input as HTMLInputElement).name);

  const selectedSizes = Array.from(document.querySelectorAll('input[id^="tamanho-"]:checked'))
    .map((input) => (input as HTMLInputElement).name);

  const selectedPrices = Array.from(document.querySelectorAll('input[id^="preco-"]:checked'))
    .map((input) => parseInt((input as HTMLInputElement).name, 10))
    .sort((a, b) => a - b);

  const priceRange = selectedPrices.length > 0 ? [selectedPrices[0], selectedPrices[selectedPrices.length - 1]] : [];

  return { colors: selectedColors, sizes: selectedSizes, priceRange };
}


//  filtrar os produtos com base nos critérios selecionados
function filterProducts(products: Product[]): Product[] {
  const { colors, sizes, priceRange } = getSelectedFilters();
  console.log('>22>>',colors, sizes, priceRange )
  return products.filter((product) => {
    const matchesColor = colors.length === 0 || colors.includes(product.color);
    const matchesSize = sizes.length === 0 || product.size.some((size) => sizes.includes(size));
    const matchesPrice =
      priceRange.length === 0 || (product.price >= priceRange[0] && product.price <= priceRange[1]);

    return matchesColor && matchesSize && matchesPrice;
  });
}

// principal para renderizar os produtos
async function renderProducts(orderBy: string = "") {
  const productList = document.getElementById("product-list");
  const loadMoreButton = document.querySelector(".load-more") as HTMLButtonElement;

  if (!productList) {
    console.error("Elemento da lista de produtos não encontrado.");
    return;
  }

  try {
    let products = await fetchProducts();

    // Aplicar a ordenação
    products = sortProducts(products, orderBy);

    // Atualizar a contagem inicial de produtos exibidos
    displayedProducts = Math.min(displayedProducts || INITIAL_PRODUCTS, products.length);

    // Renderizar apenas os produtos dentro do limite
    productList.innerHTML = products
      .slice(0, displayedProducts)
      .map(createProductCard)
      .join("");

    // Atualizar estado do botão "Carregar mais"
    if (displayedProducts >= products.length) {
      loadMoreButton.disabled = true;
    } else {
      loadMoreButton.disabled = false;
    }
  } catch (error) {
    console.error("Erro ao renderizar os produtos:", error);
    productList.innerHTML = "<p>Não foi possível carregar os produtos.</p>";
  }
}

//  aplicar os filtros e atualizar a exibição dos produtos
async function applyFilters() {
  try {
    const products = await fetchProducts();
    const filteredProducts = filterProducts(products);

    // Renderizar os produtos filtrados
    const productList = document.getElementById("product-list");
    if (productList) {
      productList.innerHTML = filteredProducts.map(createProductCard).join("");

      // Atualizar estado do botão "Carregar mais"
      const loadMoreButton = document.querySelector(".load-more") as HTMLButtonElement;
      loadMoreButton.disabled = filteredProducts.length <= displayedProducts;
    }
  } catch (error) {
    console.error("Erro ao aplicar os filtros:", error);
  }
}

//  carregar mais produtos
async function loadMoreProducts() {
  const productList = document.getElementById("product-list");
  const loadMoreButton = document.querySelector(".load-more") as HTMLButtonElement;

  if (!productList) return;

  try {
    const products = await fetchProducts();

    // Atualizar o limite de produtos exibidos
    const nextDisplayLimit = displayedProducts + PRODUCTS_PER_LOAD;

    // Adiciona os próximos produtos ao DOM
    const newProducts = filterProducts(products).slice(displayedProducts, nextDisplayLimit);
    productList.innerHTML += newProducts.map(createProductCard).join("");

    displayedProducts = nextDisplayLimit;

    // Desativa o botão se todos os produtos foram carregados
    if (displayedProducts >= products.length) {
      loadMoreButton.disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar mais produtos:", error);
  }
}

// Adicionar eventos aos checkboxes dos filtros
function setupFilterEvents() {
  const filterInputs = document.querySelectorAll(".filter-input");
  if (!filterInputs) {
    console.error("Filtros não encontrados.");
    return;
  }

  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      console.log("Filtros alterados"); // Debug
      applyFilters();
    });
  });
}

// Modificar o evento DOMContentLoaded para incluir os filtros
document.addEventListener("DOMContentLoaded", () => {
  const selectElement = document.getElementById("Ordenar") as HTMLSelectElement;
  const loadMoreButton = document.querySelector(".load-more") as HTMLButtonElement;

  generateFilters();
  renderProducts();
  setupFilterEvents();

  // Ordenar produtos ao alterar o select
  selectElement?.addEventListener("change", (event) => {
    const selectedValue = (event.target as HTMLSelectElement).value;
    displayedProducts = INITIAL_PRODUCTS; 
    renderProducts(selectedValue);
  });

  // Carregar mais produtos ao clicar no botão
  loadMoreButton?.addEventListener("click", loadMoreProducts);
});
