const STORAGE_KEYS = {
    products: 'zenz_products',
    waNumber: 'zenz_wa',
    adminSecret: 'zenz_admin_secret',
    codeExpiry: 'zenz_code_expiry'
};

function defaultData() {
    if (!localStorage.getItem(STORAGE_KEYS.products)) {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.waNumber)) {
        localStorage.setItem(STORAGE_KEYS.waNumber, '6281234567890');
    }
    if (!localStorage.getItem(STORAGE_KEYS.adminSecret)) {
        localStorage.setItem(STORAGE_KEYS.adminSecret, 'zenzkece2434');
    }
    if (!localStorage.getItem(STORAGE_KEYS.codeExpiry)) {
        localStorage.setItem(STORAGE_KEYS.codeExpiry, '5');
    }
}

function generateAccessCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function isCodeValid(createdAt, expiryMinutes) {
    const now = Date.now();
    const expiryTime = createdAt + (expiryMinutes * 60 * 1000);
    return now < expiryTime;
}

function renderStore() {
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.products)) || [];

    const productGrid = document.getElementById('productGrid');
    if (products.length) {
        productGrid.innerHTML = products.map(p => {
            let priceHtml = `<span class="product-price">${formatRupiah(p.price)}</span>`;
            if (p.discount && p.discount > 0) {
                const discountedPrice = p.price - (p.price * p.discount / 100);
                priceHtml = `
                    <span class="product-price">${formatRupiah(discountedPrice)}</span>
                    <span class="product-discount">${formatRupiah(p.price)}</span>
                    <span style="color:#00cccc; font-size:0.7rem; margin-left:0.5rem;">-${p.discount}%</span>
                `;
            }
            
            const hasFile = p.fileData && p.fileName;
            
            return `
                <div class="product-card">
                    <img src="${p.image}" class="product-img" onerror="this.src='https://placehold.co/400x400/1a1e26/5a7a8a?text=File'">
                    <div class="product-info">
                        <div class="product-name">${escapeHtml(p.name)}</div>
                        <div class="product-code">ID: ${escapeHtml(p.uniqueCode)}</div>
                        <div class="product-desc">${escapeHtml(p.description)}</div>
                        ${priceHtml}
                        <button class="btn-take ${!hasFile ? 'disabled' : ''}" data-id="${p.id}" data-name="${escapeHtml(p.name)}" ${!hasFile ? 'disabled' : ''}>
                            ${hasFile ? 'Ambil File' : 'File belum tersedia'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.btn-take:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = btn.dataset.id;
                const productName = btn.dataset.name;
                openCodeModal(productId, productName);
            });
        });
    } else {
        productGrid.innerHTML = '<div class="empty-state">Belum ada file, tambah via admin panel</div>';
    }

    const waFloatBtn = document.getElementById('waFloatBtn');
    if (waFloatBtn) {
        waFloatBtn.onclick = () => {
            const waNum = localStorage.getItem(STORAGE_KEYS.waNumber);
            window.open(`https://wa.me/${waNum}`, '_blank');
        };
    }
}

let currentProductId = null;

function openCodeModal(productId, productName) {
    currentProductId = productId;
    const modal = document.getElementById('codeModal');
    const modalTitle = document.getElementById('modalProductName');
    const expiryMinutes = parseInt(localStorage.getItem(STORAGE_KEYS.codeExpiry)) || 5;
    
    modalTitle.textContent = `Kode Akses: ${productName}`;
    document.getElementById('expiryTime').textContent = expiryMinutes;
    document.getElementById('accessCodeInput').value = '';
    modal.classList.add('show');
}

function verifyAndDownload() {
    const inputCode = document.getElementById('accessCodeInput').value.trim().toUpperCase();
    if (!inputCode || !currentProductId) {
        alert('Masukkan kode akses');
        return;
    }
    
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.products));
    const product = products.find(p => p.id == currentProductId);
    
    if (!product) {
        alert('Produk tidak ditemukan');
        closeCodeModal();
        return;
    }
    
    const expiryMinutes = parseInt(localStorage.getItem(STORAGE_KEYS.codeExpiry)) || 5;
    const validCode = product.accessCodes?.find(code => 
        code.code === inputCode && isCodeValid(code.createdAt, expiryMinutes)
    );
    
    if (validCode) {
        if (product.fileData && product.fileName) {
            downloadFile(product.fileData, product.fileName);
            closeCodeModal();
        } else {
            alert('File belum diupload oleh admin');
        }
    } else {
        alert('Kode akses tidak valid atau sudah expired');
    }
}

function downloadFile(base64Data, fileName) {
    try {
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Download error:', error);
        alert('Gagal mendownload file');
    }
}

function closeCodeModal() {
    const modal = document.getElementById('codeModal');
    modal.classList.remove('show');
    currentProductId = null;
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function loadAdminPanels() {
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.products)) || [];
    const wa = localStorage.getItem(STORAGE_KEYS.waNumber) || '6281234567890';
    const adminSecret = localStorage.getItem(STORAGE_KEYS.adminSecret) || 'zenzkece2434';
    const expiryMinutes = localStorage.getItem(STORAGE_KEYS.codeExpiry) || '5';

    const productContainer = document.getElementById('adminProductList');
    if (productContainer) {
        productContainer.innerHTML = products.map(p => {
            const expiryMinutesNum = parseInt(expiryMinutes);
            const validCodes = (p.accessCodes || []).filter(code => isCodeValid(code.createdAt, expiryMinutesNum));
            const expiredCodes = (p.accessCodes || []).filter(code => !isCodeValid(code.createdAt, expiryMinutesNum));
            
            return `
                <div class="item-card">
                    <div style="flex:1;">
                        <strong>${escapeHtml(p.name)}</strong><br>
                        <span style="font-size:0.7rem; color:#00cccc;">ID: ${escapeHtml(p.uniqueCode)}</span><br>
                        <span style="font-size:0.75rem;">${escapeHtml(p.description)}</span><br>
                        <span>Harga: Rp ${formatRupiah(p.price)}</span>
                        ${p.discount ? `<span style="color:#ff6b6b;"> Diskon ${p.discount}%</span>` : ''}<br>
                        <span class="file-info">${p.fileName ? `File: ${p.fileName}` : 'Belum upload file'}</span>
                        <div class="code-list">
                            <strong>Kode Aktif:</strong>
                            ${validCodes.map(c => `
                                <span class="code-item">${c.code}</span>
                            `).join('') || '<span class="code-expired">Tidak ada kode aktif</span>'}
                            ${expiredCodes.length > 0 ? `<br><span class="code-expired">Kode expired: ${expiredCodes.length} kode</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                        <button class="gen-code" data-id="${p.id}">Buat Kode</button>
                        <button class="upload-file" data-id="${p.id}">Upload File</button>
                        <button class="edit-prod" data-id="${p.id}">Edit</button>
                        <button class="del-prod" data-id="${p.id}">Hapus</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    const waNumberInput = document.getElementById('waNumberInput');
    const adminSecretInput = document.getElementById('adminSecretInput');
    const codeExpiryInput = document.getElementById('codeExpiryMinutes');
    
    if (waNumberInput) waNumberInput.value = wa;
    if (adminSecretInput) adminSecretInput.value = adminSecret;
    if (codeExpiryInput) codeExpiryInput.value = expiryMinutes;

    attachAdminEvents();
}

function attachAdminEvents() {
    document.querySelectorAll('.del-prod').forEach(btn => {
        btn.onclick = () => {
            if (confirm('Yakin hapus produk ini?')) {
                let prods = JSON.parse(localStorage.getItem(STORAGE_KEYS.products));
                prods = prods.filter(p => p.id != btn.dataset.id);
                localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(prods));
                loadAdminPanels();
                renderStore();
            }
        };
    });
    
    document.querySelectorAll('.gen-code').forEach(btn => {
        btn.onclick = () => {
            const productId = parseInt(btn.dataset.id);
            let prods = JSON.parse(localStorage.getItem(STORAGE_KEYS.products));
            const idx = prods.findIndex(p => p.id == productId);
            if (idx !== -1) {
                const newCode = generateAccessCode();
                if (!prods[idx].accessCodes) prods[idx].accessCodes = [];
                prods[idx].accessCodes.push({
                    code: newCode,
                    createdAt: Date.now()
                });
                localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(prods));
                loadAdminPanels();
                alert(`Kode baru: ${newCode}\nBerlaku ${localStorage.getItem(STORAGE_KEYS.codeExpiry) || 5} menit`);
            }
        };
    });
    
    document.querySelectorAll('.upload-file').forEach(btn => {
        btn.onclick = () => {
            const productId = btn.dataset.id;
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64Data = event.target.result;
                        let prods = JSON.parse(localStorage.getItem(STORAGE_KEYS.products));
                        const idx = prods.findIndex(p => p.id == productId);
                        if (idx !== -1) {
                            prods[idx].fileData = base64Data;
                            prods[idx].fileName = file.name;
                            localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(prods));
                            loadAdminPanels();
                            renderStore();
                            alert(`File "${file.name}" berhasil diupload`);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        };
    });
    
    document.querySelectorAll('.edit-prod').forEach(btn => {
        btn.onclick = () => {
            let prods = JSON.parse(localStorage.getItem(STORAGE_KEYS.products));
            const idx = prods.findIndex(p => p.id == btn.dataset.id);
            if (idx !== -1) {
                let newName = prompt('Nama file baru', prods[idx].name);
                let newCode = prompt('ID unik baru', prods[idx].uniqueCode);
                let newDesc = prompt('Deskripsi file', prods[idx].description);
                let newPrice = prompt('Harga baru', prods[idx].price);
                let newDiscount = prompt('Diskon (%) - 0 jika tidak ada diskon', prods[idx].discount || 0);
                let newImage = prompt('URL gambar baru', prods[idx].image);
                if (newName && newCode && newDesc && newPrice) {
                    prods[idx].name = newName;
                    prods[idx].uniqueCode = newCode;
                    prods[idx].description = newDesc;
                    prods[idx].price = parseInt(newPrice);
                    prods[idx].discount = parseInt(newDiscount) || 0;
                    if (newImage) prods[idx].image = newImage;
                    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(prods));
                    loadAdminPanels();
                    renderStore();
                    alert('Produk berhasil diupdate');
                }
            }
        };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    defaultData();
    renderStore();

    const adminTrigger = document.getElementById('adminAccessBtn');
    const modal = document.getElementById('secretModal');
    const secretInput = document.getElementById('secretInput');
    const verifyBtn = document.getElementById('verifySecretBtn');
    const adminPanel = document.getElementById('adminPanel');
    const closeAdminBtn = document.getElementById('closeAdminBtn');

    let correctSecret = localStorage.getItem(STORAGE_KEYS.adminSecret);

    adminTrigger.onclick = () => {
        if (modal) modal.classList.add('show');
        if (secretInput) secretInput.value = '';
    };

    verifyBtn.onclick = () => {
        if (secretInput.value === correctSecret) {
            if (modal) modal.classList.remove('show');
            if (adminPanel) adminPanel.style.display = 'block';
            loadAdminPanels();
            if (secretInput) secretInput.value = '';
        } else {
            if (secretInput) secretInput.value = '';
            alert('Kode admin salah');
        }
    };

    if (closeAdminBtn) {
        closeAdminBtn.onclick = () => {
            if (adminPanel) adminPanel.style.display = 'none';
        };
    }

    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.onclick = () => {
            let name = prompt('Nama file');
            let uniqueCode = prompt('ID unik untuk file ini (contoh: FILE-001)');
            let description = prompt('Deskripsi file (jelaskan isi filenya)');
            let price = prompt('Harga (Rp)');
            let discount = prompt('Diskon (%) - ketik 0 jika tidak ada diskon', '0');
            let image = prompt('URL gambar (optional)', 'https://placehold.co/400x400/1a1e26/5a7a8a?text=File');
            if (name && uniqueCode && description && price) {
                let prods = JSON.parse(localStorage.getItem(STORAGE_KEYS.products));
                const newId = Date.now();
                prods.push({ 
                    id: newId, 
                    name: name, 
                    uniqueCode: uniqueCode,
                    description: description,
                    price: parseInt(price),
                    discount: parseInt(discount) || 0,
                    image: image || 'https://placehold.co/400x400/1a1e26/5a7a8a?text=File',
                    fileData: null,
                    fileName: null,
                    accessCodes: []
                });
                localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(prods));
                loadAdminPanels();
                renderStore();
                alert(`Produk "${name}" berhasil ditambahkan. Jangan lupa upload file dan buat kode akses!`);
            }
        };
    }

    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            const wa = document.getElementById('waNumberInput').value;
            const secret = document.getElementById('adminSecretInput').value;
            const expiry = document.getElementById('codeExpiryMinutes').value;
            if (wa) localStorage.setItem(STORAGE_KEYS.waNumber, wa);
            if (secret) {
                localStorage.setItem(STORAGE_KEYS.adminSecret, secret);
                correctSecret = secret;
            }
            if (expiry) localStorage.setItem(STORAGE_KEYS.codeExpiry, expiry);
            alert('Pengaturan tersimpan');
            renderStore();
        };
    }

    const tabs = document.querySelectorAll('.admin-tabs .tab-btn');
    tabs.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            const activePanel = document.getElementById(`${tabId}Tab`);
            if (activePanel) activePanel.classList.add('active');
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    const submitCodeBtn = document.getElementById('submitCodeBtn');
    if (submitCodeBtn) {
        submitCodeBtn.onclick = verifyAndDownload;
    }

    const closeCodeModalBtn = document.getElementById('closeCodeModal');
    if (closeCodeModalBtn) {
        closeCodeModalBtn.onclick = closeCodeModal;
    }

    document.getElementById('accessCodeInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyAndDownload();
    });

    window.onclick = (e) => {
        if (e.target === modal) {
            if (modal) modal.classList.remove('show');
        }
        if (e.target === document.getElementById('codeModal')) {
            closeCodeModal();
        }
    };
});