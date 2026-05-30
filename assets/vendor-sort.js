class VendorSort {
  constructor() {
    this.vendorOrder = [
      'DNA',
      'Termignoni',
      'QD',
      'Ixil',
      'UpMap',
      'Puig Motoplastics DNA',
      'Ixrace',
      'Ironhead'
    ];
    this.normalizedVendorOrder = this.vendorOrder.map((v) => this.normalizeVendor(v));
    this.isApplying = false;
    const urlParams = new URLSearchParams(window.location.search);
    const sortBy = urlParams.get('sort_by');
    this.isActive = (!sortBy || sortBy === 'vendor-custom');
    this.init();
  }

  init() {
    this.preventFormSubmission();
    this.attachSortListener();
    this.attachCustomSelectListener();
    this.populateManufacturerGrid();
    this.updateActiveState();

    setTimeout(() => {
      if (this.isActive) {
        this.sortByVendor();
      }
    }, 300);

    document.addEventListener('on:facet-filters:updated', () => {
      if (this.isActive || this.isVendorSortSelected()) {
        this.isActive = true;
        this.populateManufacturerGrid();
        this.updateActiveState();
        // Small delay to ensure new DOM products are fully rendered
        setTimeout(() => this.sortByVendor(), 50);
      } else {
        this.isActive = false;
      }
    });
  }

  populateManufacturerGrid() {
    const manufacturerGrid = document.getElementById('manufacturer-grid');
    if (!manufacturerGrid) return;

    // Get all unique vendors from products on the page
    const productGrid = this.getProductGrid();
    if (!productGrid) return;

    const products = Array.from(productGrid.children);
    const vendorsSet = new Set();

    products.forEach(product => {
      const vendor = this.getProductVendor(product);
      if (vendor) {
        vendorsSet.add(vendor);
      }
    });

    const vendors = Array.from(vendorsSet);

    // Sort vendors according to vendorOrder
    const sortedVendors = vendors.sort((a, b) => {
      const indexA = this.getVendorIndex(a);
      const indexB = this.getVendorIndex(b);

      if (indexA === indexB) {
        return a.localeCompare(b);
      }

      return indexA - indexB;
    });

    // Populate the grid with sorted vendors
    manufacturerGrid.innerHTML = '';
    sortedVendors.forEach(vendor => {
      const link = document.createElement('a');
      link.href = `/collections/vendors?q=${encodeURIComponent(vendor)}`;
      link.className = 'manufacturer-item';
      link.textContent = vendor;
      manufacturerGrid.appendChild(link);
    });
  }

  preventFormSubmission() {
    const forms = document.querySelectorAll('#FacetFiltersForm, #FacetSortForm, #FacetSortDrawerForm');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        const sortBy = form.querySelector('input[name="sort_by"]:checked');
        if (sortBy && sortBy.value === 'vendor-custom') {
          // Allow theme to handle sort change normally
          this.isActive = true;
          this.sortByVendor();
          return true;
        }
      });

      form.addEventListener('input', (e) => {
        if (e.target.name === 'sort_by' && e.target.value === 'vendor-custom') {
          this.isActive = true;
          this.sortByVendor();
        }
      });
    });
  }

  attachCustomSelectListener() {
    const customSelect = document.getElementById('products-sort-by');
    const nativeSelect = document.getElementById('products-sort-by-native');

    const handleSelection = (value) => {
      if (value === 'vendor-custom') {
        this.isActive = true;
        this.sortByVendor();
      } else {
        this.isActive = false;
      }
    };

    if (customSelect) {
      customSelect.addEventListener('change', (event) => {
        const selectedValue = event.detail?.selectedValue || event.target?.value;
        handleSelection(selectedValue);
      });
    }

    if (nativeSelect) {
      nativeSelect.addEventListener('change', (event) => handleSelection(event.target.value));
    }
  }

  getProductGrid() {
    return document.querySelector('#filter-results ul[role="list"]') || document.querySelector('[data-product-column]');
  }

  attachSortListener() {
    document.addEventListener('click', (event) => {
      const label = event.target.closest('label[for*="vendor-sort"]');
      const input = event.target.closest('input[value="vendor-custom"]');

      if (label || input) {
        event.preventDefault();
        event.stopPropagation();

        document.querySelectorAll('input[name="sort_by"]').forEach(inp => {
          inp.checked = false;
          inp.classList.remove('checked');
        });

        document.querySelectorAll('input[value="vendor-custom"]').forEach(inp => {
          inp.checked = true;
          inp.classList.add('checked');
        });

        this.isActive = true;
        this.sortByVendor();
        return false;
      }
    }, true);

    document.addEventListener('change', (event) => {
      if (event.target.name === 'sort_by') {
        if (event.target.value === 'vendor-custom') {
          this.isActive = true;
          this.sortByVendor();
        } else {
          this.isActive = false;
        }
      }
    }, true);
  }

  sortByVendor() {
    const productGrid = this.getProductGrid();
    if (!productGrid) return;

    const children = Array.from(productGrid.children);
    const products = [];
    const nonProducts = [];

    children.forEach((child, index) => {
      const vendor = this.getProductVendor(child);
      if (vendor) {
        const productType = this.getProductType(child);
        products.push({
          node: child,
          vendor,
          productType,
          title: this.getProductTitle(child),
          originalIndex: index
        });
      } else {
        nonProducts.push(child);
      }
    });

    const sortedProducts = products.sort((a, b) => {
      const indexA = this.getVendorIndex(a.vendor);
      const indexB = this.getVendorIndex(b.vendor);

      if (indexA === indexB) {
        const typeRankA = this.getProductTypeRank(a.productType);
        const typeRankB = this.getProductTypeRank(b.productType);
        if (typeRankA !== typeRankB) return typeRankA - typeRankB;
        return a.originalIndex - b.originalIndex;
      }

      return indexA - indexB;
    });

    productGrid.innerHTML = '';
    sortedProducts.forEach(({ node }) => productGrid.appendChild(node));
    nonProducts.forEach(node => productGrid.appendChild(node));

    this.updateActiveState();
  }

  getProductVendor(productElement) {
    if (productElement?.dataset?.vendor) {
      return productElement.dataset.vendor;
    }
    const productCard = productElement.querySelector('.product__card');
    if (productCard && productCard.dataset.vendor) {
      return productCard.dataset.vendor;
    }

    const vendorElement = productElement.querySelector('.product__vendor, .card__vendor');
    if (vendorElement) {
      return vendorElement.textContent.trim();
    }

    return '';
  }

  getProductTitle(productElement) {
    const titleElement = productElement.querySelector('.product__title, .card__heading, .card__title, h3, h2');
    return titleElement ? titleElement.textContent.trim() : '';
  }

  getProductType(productElement) {
    if (productElement?.dataset?.productType) return productElement.dataset.productType;
    const typeEl = productElement.querySelector('[data-product-type]');
    if (typeEl?.dataset?.productType) return typeEl.dataset.productType;
    return '';
  }

  getProductTypeRank(productType) {
    const normalizedType = this.normalizeVendor(productType);
    if (normalizedType.includes('exhaust')) return 0;
    if (
      normalizedType.includes('performance')
      || normalizedType.includes('upmap')
      || normalizedType.includes('air filter')
      || normalizedType.includes('intake')
    ) {
      return 1;
    }
    if (normalizedType.includes('accessor')) return 2;
    return 3;
  }

  getVendorIndex(vendor) {
    const normalizedVendor = this.normalizeVendor(vendor);

    for (let i = 0; i < this.normalizedVendorOrder.length; i++) {
      if (normalizedVendor === this.normalizedVendorOrder[i]) {
        return i;
      }
    }

    for (let i = 0; i < this.normalizedVendorOrder.length; i++) {
      const needle = this.normalizedVendorOrder[i];
      if (normalizedVendor.startsWith(needle) || needle.startsWith(normalizedVendor)) {
        return i;
      }
    }

    for (let i = 0; i < this.normalizedVendorOrder.length; i++) {
      const needle = this.normalizedVendorOrder[i];
      if (normalizedVendor.includes(needle) || needle.includes(normalizedVendor)) {
        return i;
      }
    }

    return 999;
  }

  normalizeVendor(vendor) {
    return (vendor || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  updateActiveState() {
    if (!this.isActive) return;

    document.querySelectorAll('input[name="sort_by"]').forEach(input => {
      if (input.value === 'vendor-custom') {
        input.classList.add('checked');
        input.checked = true;
      } else {
        input.classList.remove('checked');
        input.checked = false;
      }
    });

    const sortButtons = document.querySelectorAll('.sortby__button strong');
    sortButtons.forEach(button => {
      button.textContent = 'Sort By: Manufacturers';
    });

    const customSelectButton = document.getElementById('products-sort-by-button');
    if (customSelectButton) {
      const labelSpan = customSelectButton.querySelector('span');
      if (labelSpan) labelSpan.textContent = 'Manufacturers';
    }

    const customSelectOption = document.querySelector('#products-sort-by [data-value="vendor-custom"]');
    if (customSelectOption) {
      document.querySelectorAll('#products-sort-by [data-value]').forEach((opt) => {
        if (opt === customSelectOption) {
          opt.setAttribute('aria-selected', 'true');
          opt.classList.add('is-focused');
        } else {
          opt.setAttribute('aria-selected', 'false');
          opt.classList.remove('is-focused');
        }
      });

      const customSelectEl = document.getElementById('products-sort-by');
      if (customSelectEl) {
        customSelectEl.selectedOption = customSelectOption;
      }
    }
  }

  isVendorSortSelected() {
    const radioChecked = document.querySelector('input[name="sort_by"][value="vendor-custom"]:checked');
    const customSelectSelected = document.querySelector('#products-sort-by [data-value="vendor-custom"][aria-selected="true"]');
    return !!radioChecked || !!customSelectSelected;
  }
}

let vendorSortInstance = null;

if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!vendorSortInstance) {
      vendorSortInstance = new VendorSort();
    }
  });
} else if (typeof window !== 'undefined') {
  if (!vendorSortInstance) {
    vendorSortInstance = new VendorSort();
  }
}
