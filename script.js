const products = [
    { id: 1, name: "Netflix Premium 1 DAY", price: 19, desc: "Netflix แท้จอไม่ชน 100%", image: "netflix.png" },
    { id: 2, name: "Netflix Premium 3 DAY", price: 39, desc: "Netflix แท้จอไม่ชน 100%", image: "netflix.png" },
    { id: 3, name: "Netflix Premium 7 DAY", price: 59, desc: "Netflix แท้จอไม่ชน 100%", image: "netflix.png" },
    { id: 4, name: "Netflix Premium 15 DAY", price: 109, desc: "Netflix แท้จอไม่ชน 100%", image: "netflix.png" },
    { id: 5, name: "Netflix Premium 30 DAY", price: 159, desc: "Netflix แท้จอไม่ชน 100%", image: "netflix.png" },
    { id: 6, name: "YouTube Premium 30 DAY", price: 99, desc: "YouTube Premium แท้100%", image: "youtube.png" },
];

const state = {
    cart: [],
    user: null,
};

// Elements
const productsContainer = document.getElementById("products");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const checkoutPanel = document.getElementById("checkoutPanel");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const closeCart = document.getElementById("closeCart");
const closeCheckout = document.getElementById("closeCheckout");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const confirmMessage = document.getElementById("confirmMessage");
const qrAmount = document.getElementById("qrAmount");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const userBadge = document.getElementById("userBadge");
const heroShopBtn = document.getElementById("heroShopBtn");

function renderProducts() {
    if (!productsContainer) return;
    
    productsContainer.innerHTML = products
        .map((product) => `
            <div class="product-card">
                <div>
                    <h4>${product.name}</h4>
                    <p>${product.desc}</p>
                </div>
                <div class="product-image-wrap">
                    <img src="${product.image}" alt="${product.name}" class="product-image" />
                </div>
                <div>
                    <div class="price">฿${product.price} ฿</div>
                    <button class="button button-primary full-width" data-id="${product.id}">
                        <i class="fas fa-plus"></i> เพิ่มเข้าตะกร้า
                    </button>
                </div>
            </div>
        `)
        .join("");

    productsContainer.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => addToCart(Number(button.dataset.id)));
    });
}

function renderCart() {
    if (!cartItems) return;

    cartItems.innerHTML = "";
    
    if (state.cart.length === 0) {
        cartItems.innerHTML = `
            <div style="text-align:center; padding: 20px; color: var(--text-muted);">
                <i class="fas fa-shopping-basket" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>ยังไม่มีสินค้าในตะกร้า</p>
            </div>`;
        cartTotal.textContent = "฿0";
        cartCount.textContent = "0";
        return;
    }

    state.cart.forEach((item) => {
        const element = document.createElement("div");
        element.className = "cart-item";
        element.innerHTML = `
            <div class="cart-item-info">
                <strong>${item.name}</strong>
                <div class="cart-item-meta">
                    <span>฿${item.price}</span>
                    <div class="quantity-controls">
                        <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}"><i class="fas fa-minus"></i></button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
            </div>
            <div class="item-actions">
                <button data-id="${item.id}"><i class="fas fa-trash-alt"></i> ลบ</button>
            </div>
        `;

        element.querySelector(".item-actions button").addEventListener("click", () => removeFromCart(item.id));
        element.querySelectorAll(".qty-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.dataset.action;
                const currentQuantity = item.quantity;
                const newQuantity = action === "increase" ? currentQuantity + 1 : currentQuantity - 1;
                updateCartQuantity(item.id, newQuantity);
            });
        });
        cartItems.appendChild(element);
    });

    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cartTotal.textContent = `฿${total}`;
    cartCount.textContent = count;
    if(qrAmount) qrAmount.textContent = `฿${total}`;
}

function addToCart(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const existing = state.cart.find((item) => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    
    renderCart();
    showToast("เพิ่มสินค้าในรถเขนเรียบร้อยแล้ว");
    // ไม่เปิดตะกร้า/ชำระเงินทันทีเมื่อเพิ่มสินค้า
}

function removeFromCart(productId) {
    state.cart = state.cart.filter((item) => item.id !== productId);
    renderCart();
}

function updateCartQuantity(productId, quantity) {
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = state.cart.find((entry) => entry.id === productId);
    if (!item) return;
    item.quantity = quantity;
    renderCart();
}

function openCart() {
    renderCart();
    cartPanel.classList.remove("hidden");
}

function openCheckout() {
    if (state.cart.length === 0) {
        showToast("กรุณาเพิ่มสินค้าก่อนชำระเงิน", "error");
        return;
    }
    cartPanel.classList.add("hidden"); // ปิดตะกร้า
    renderCart();
    checkoutPanel.classList.remove("hidden"); // เปิดชำระเงิน
    confirmMessage.classList.add("hidden");
    generateQRCode();
}

function buildTLV(tag, value) {
    const length = String(value.length).padStart(2, '0');
    return `${tag}${length}${value}`;
}

function calculateCRC16(payload) {
    let crc = 0xFFFF;
    const poly = 0x1021;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ poly) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatPromptPayAmount(amount) {
    return amount.toFixed(2).toString();
}

function generatePromptPayPayload(amount) {
    const phone = '0960200859';
    const promptPayId = `0066${phone.slice(1)}`;
    const merchantInfo = buildTLV('00', 'A000000677010111') + buildTLV('01', promptPayId);

    let payload = '';
    payload += buildTLV('00', '01');
    payload += buildTLV('01', '12');
    payload += buildTLV('29', merchantInfo);
    payload += buildTLV('52', '0000');
    payload += buildTLV('53', '764');
    payload += buildTLV('54', formatPromptPayAmount(amount));
    payload += buildTLV('58', 'TH');
    payload += buildTLV('59', 'Netflix Shop');
    payload += buildTLV('60', 'BKK');
    payload += '6304';
    payload += calculateCRC16(payload);
    return payload;
}

function generateQRCode() {
    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const qrText = generatePromptPayPayload(total);
    
    const qrContainer = document.getElementById("qrcode");
    if(qrContainer) {
        qrContainer.innerHTML = "";
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: qrText,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        } else {
            qrContainer.innerHTML = "<p style='color:red'>Error loading QR Library</p>";
        }
    }
}

function confirmPayment() {
    if (state.cart.length === 0) return;
    confirmMessage.classList.remove("hidden");
    // เลื่อนลงไปดูข้อความยืนยัน
    setTimeout(() => {
        confirmMessage.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const icons = {
        success: "<i class='fas fa-check'></i>",
        error: "<i class='fas fa-exclamation-triangle'></i>",
        info: "<i class='fas fa-info-circle'></i>"
    };

    toast.innerHTML = `
        <span class="toast__icon">${icons[type] || icons.info}</span>
        <span class="toast__message">${message}</span>
    `;

    toast.classList.remove("hidden", "toast--success", "toast--error", "toast--info");
    toast.classList.add("show", `toast--${type}`);

    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2400);
}

function handleGoogleLogin() {
    const name = prompt("จำลองการเข้าสู่ระบบ Google\nกรุณาใส่ชื่อผู้ใช้:", "User_Demo");
    if (!name) return;
    
    state.user = { name };
    userBadge.textContent = `สวัสดี, ${name}`;
    userBadge.classList.remove("hidden");
    googleLoginBtn.classList.add("hidden"); // ซ่อนปุ่มล็อกอิน
}

function toggleLogin() {
    if (state.user) {
        // Logout
        state.user = null;
        userBadge.classList.add("hidden");
        googleLoginBtn.classList.remove("hidden");
        googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> เข้าสู่ระบบ';
    } else {
        handleGoogleLogin();
    }
}

function init() {
    renderProducts();
    renderCart();

    if(googleLoginBtn) googleLoginBtn.addEventListener("click", toggleLogin);
    if(cartBtn) cartBtn.addEventListener("click", openCart);
    if(closeCart) closeCart.addEventListener("click", () => cartPanel.classList.add("hidden"));
    if(closeCheckout) closeCheckout.addEventListener("click", () => checkoutPanel.classList.add("hidden"));
    if(checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);
    if(confirmPaymentBtn) confirmPaymentBtn.addEventListener("click", confirmPayment);
    if(heroShopBtn) heroShopBtn.addEventListener("click", () => {
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });

    // Click outside to close modals
    if(cartPanel) {
        cartPanel.addEventListener("click", (event) => {
            if (event.target === cartPanel) cartPanel.classList.add("hidden");
        });
    }
    if(checkoutPanel) {
        checkoutPanel.addEventListener("click", (event) => {
            if (event.target === checkoutPanel) checkoutPanel.classList.add("hidden");
        });
    }
}

// ... (โค้ดเดิมด้านบนคงไว้เหมือนเดิม) ...

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // ปิดข้ออื่นทั้งหมดก่อน (เลือกเปิดได้ทีละข้อ)
            faqItems.forEach(i => i.classList.remove('active'));
            
            // ถ้าไม่ได้อยู่ในสถานะเปิด ให้เปิด
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

function init() {
    renderProducts();
    renderCart();
    initFAQ(); // 🔽 เรียกใช้ส่วน FAQ 🔽

    if(googleLoginBtn) googleLoginBtn.addEventListener("click", toggleLogin);
    if(cartBtn) cartBtn.addEventListener("click", openCart);
    if(closeCart) closeCart.addEventListener("click", () => cartPanel.classList.add("hidden"));
    if(closeCheckout) closeCheckout.addEventListener("click", () => checkoutPanel.classList.add("hidden"));
    if(checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);
    if(confirmPaymentBtn) confirmPaymentBtn.addEventListener("click", confirmPayment);
    if(heroShopBtn) heroShopBtn.addEventListener("click", () => {
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });

    if(cartPanel) {
        cartPanel.addEventListener("click", (event) => {
            if (event.target === cartPanel) cartPanel.classList.add("hidden");
        });
    }
    if(checkoutPanel) {
        checkoutPanel.addEventListener("click", (event) => {
            if (event.target === checkoutPanel) checkoutPanel.classList.add("hidden");
        });
    }
}



document.addEventListener('DOMContentLoaded', init);

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', init);