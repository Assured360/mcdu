// Configuración de Firebase
const firebaseConfig = {
  apiKey: "",
  authDomain: "mercaduniversidad.firebaseapp.com",
  projectId: "mercaduniversidad",
  storageBucket: "mercaduniversidad.firebasestorage.app",
  messagingSenderId: "379558481120",
  appId: "1:379558481120:web:76f45aac72b7a7bfe51485"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();
const storage = firebase.storage();

// Estados de la aplicación
let currentUser = null;
let userRole = null;

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Verificar estado de autenticación
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            checkUserRole();
        } else {
            renderAuthPage();
        }
    });
}

// Renderizar página de autenticación
function renderAuthPage() {
    const appContainer = document.getElementById('app-container');
    const authTemplate = document.getElementById('auth-template');

    appContainer.innerHTML = '';
    appContainer.appendChild(authTemplate.content.cloneNode(true));

    const authForm = document.getElementById('auth-form');
    const nameGroup = document.getElementById('name-group');
    const authTitle = document.getElementById('auth-title');
    let isSignUp = false;

    // Cambiar entre Iniciar Sesión y Registrarse
    function toggleAuthMode() {
        isSignUp = !isSignUp;
        nameGroup.classList.toggle('d-none', !isSignUp);
        authTitle.textContent = isSignUp ? 'Registrarse' : 'Iniciar Sesión';
        authForm.querySelector('button').textContent = isSignUp ? 'Registrarse' : 'Iniciar Sesión';
    }

    // Crear enlace para cambiar entre modos
    const toggleLink = document.createElement('div');
    toggleLink.classList.add('auth-footer');
    toggleLink.innerHTML = isSignUp 
        ? '¿Ya tienes cuenta? <a href="#" id="toggle-mode">Iniciar Sesión</a>'
        : '¿No tienes cuenta? <a href="#" id="toggle-mode">Registrarse</a>';

    authForm.appendChild(toggleLink);

    // Manejar cambio de modo de autenticación
    document.addEventListener('click', (e) => {
        if (e.target.id === 'toggle-mode') {
            e.preventDefault();
            toggleAuthMode();
        }
    });

    // Manejar envío del formulario de autenticación
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = isSignUp ? document.getElementById('name').value : null;

        try {
            if (isSignUp) {
                // Registro de nuevo usuario
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({ displayName: name });

                // Guardar información adicional del usuario
                await firestore.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    role: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                renderRoleSelectionPage();
            } else {
                // Inicio de sesión
                await auth.signInWithEmailAndPassword(email, password);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

// Renderizar página de selección de rol
function renderRoleSelectionPage() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="container">
            <div class="role-selection">
                <div class="role-card seller" data-role="seller">
                    <i class="fas fa-store"></i>
                    <h3>Vendedor</h3>
                    <p>Vende tus productos universitarios</p>
                </div>
                <div class="role-card buyer" data-role="buyer">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Comprador</h3>
                    <p>Explora productos de emprendedores</p>
                </div>
            </div>
        </div>
    `;

    // Manejar selección de rol
    appContainer.addEventListener('click', async (e) => {
        const roleCard = e.target.closest('.role-card');
        if (roleCard) {
            const role = roleCard.dataset.role;

            // Actualizar rol del usuario en Firestore
            await firestore.collection('users').doc(currentUser.uid).update({ role });

            // Renderizar dashboard según el rol
            role === 'seller' ? renderSellerDashboard() : renderBuyerDashboard();
        }
    });
}

// Renderizar dashboard de vendedor
function renderSellerDashboard() {
    const appContainer = document.getElementById('app-container');
    const mainHeader = document.getElementById('main-header');
    mainHeader.classList.remove('d-none');

    appContainer.innerHTML = `
        <div class="container dashboard">
            <div class="dashboard-header">
                <h1 class="dashboard-title">Panel de Vendedor</h1>
                <button class="btn btn-secondary" id="add-product-btn">
                    <i class="fas fa-plus"></i> Agregar Producto
                </button>
            </div>

            <div class="seller-stats">
                <div class="stat-card">
                    <i class="fas fa-shopping-bag"></i>
                    <div class="stat-number" id="total-products">0</div>
                    <div class="stat-label">Productos</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-line"></i>
                    <div class="stat-number" id="total-views">0</div>
                    <div class="stat-label">Vistas</div>
                </div>
            </div>

            <div id="products-grid" class="products-grid">
                <!-- Productos del vendedor se cargarán aquí -->
            </div>
        </div>

        <!-- Modal para agregar producto -->
        <div id="product-modal" class="modal d-none">
            <div class="modal-content product-form">
                <h2>Agregar Nuevo Producto</h2>
                <form id="product-form">
                    <div class="image-preview" id="image-preview">
                        <span>Seleccionar Imagen</span>
                    </div>
                    <input type="file" id="product-image" accept="image/*" class="d-none">

                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre del Producto</label>
                            <input type="text" id="product-name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Precio</label>
                            <input type="number" id="product-price" class="form-control" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Descripción</label>
                        <textarea id="product-description" class="form-control" rows="3" required></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Horario de Disponibilidad</label>
                            <input type="text" id="product-hours" class="form-control" placeholder="Ej: Lun-Vie 10am-2pm">
                        </div>
                    </div>

                    <div class="form-group">
                        <button type="submit" class="btn btn-block">Publicar Producto</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Cargar productos del vendedor
    loadSellerProducts();
    setupProductForm();
}

// Renderizar dashboard de comprador
function renderBuyerDashboard() {
    const appContainer = document.getElementById('app-container');
    const mainHeader = document.getElementById('main-header');
    mainHeader.classList.remove('d-none');

    appContainer.innerHTML = `
        <div class="container dashboard">
            <div class="dashboard-header">
                <h1 class="dashboard-title">Productos Disponibles</h1>
                <div class="search-container">
                    <input type="text" id="search-products" class="form-control" placeholder="Buscar productos...">
                </div>
            </div>

            <div id="all-products-grid" class="products-grid">
                <!-- Todos los productos se cargarán aquí -->
            </div>
        </div>
    `;

    // Cargar todos los productos
    loadAllProducts();
}

// Funciones auxiliares de vendedor
function setupProductForm() {
    const imagePreview = document.getElementById('image-preview');
    const imageInput = document.getElementById('product-image');
    const productForm = document.getElementById('product-form');
    const productModal = document.getElementById('product-modal');
    const addProductBtn = document.getElementById('add-product-btn');

    // Abrir modal de producto
    addProductBtn.addEventListener('click', () => {
        productModal.classList.remove('d-none');
    });

    // Selección de imagen
    imagePreview.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                imagePreview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    });

    // Envío de formulario de producto
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageFile = imageInput.files[0];

        if (!imageFile) {
            alert('Por favor, selecciona una imagen');
            return;
        }

        try {
            // Subir imagen a Firebase Storage
            const imageRef = storage.ref(`products/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            const imageSnapshot = await imageRef.put(imageFile);
            const imageUrl = await imageSnapshot.ref.getDownloadURL();

            // Guardar datos del producto en Firestore
            const productData = {
                name: document.getElementById('product-name').value,
                price: parseFloat(document.getElementById('product-price').value),
                description: document.getElementById('product-description').value,
                hours: document.getElementById('product-hours').value,
                imageUrl: imageUrl,
                sellerId: currentUser.uid,
                sellerName: currentUser.displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await firestore.collection('products').add(productData);

            // Resetear y cerrar modal
            productForm.reset();
            imagePreview.innerHTML = '<span>Seleccionar Imagen</span>';
            imagePreview.classList.remove('has-image');
            productModal.classList.add('d-none');

            // Recargar productos
            loadSellerProducts();

        } catch (error) {
            console.error('Error al subir producto:', error);
            alert('Ocurrió un error al publicar el producto');
        }
    });
}

// Cargar productos del vendedor
async function loadSellerProducts() {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = ''; // Limpiar productos anteriores

    const querySnapshot = await firestore.collection('products')
        .where('sellerId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get();

    // Actualizar contador de productos
    document.getElementById('total-products').textContent = querySnapshot.size;

    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productCard = createProductCard(product, doc.id);
        productsGrid.appendChild(productCard);
    });
}

// Cargar todos los productos para compradores
async function loadAllProducts() {
    const productsGrid = document.getElementById('all-products-grid');
    productsGrid.innerHTML = ''; // Limpiar productos anteriores

    const querySnapshot = await firestore.collection('products')
        .orderBy('createdAt', 'desc')
        .get();

    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productCard = createProductCard(product, doc.id, true);
        productsGrid.appendChild(productCard);
    });
}

// Crear tarjeta de producto
function createProductCard(product, productId, isBuyerView = false) {
    const card = document.createElement('div');
    card.classList.add('product-card');
    card.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" class="product-img">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <div class="product-seller">${product.sellerName}</div>
            <p class="product-description">${product.description}</p>
            <div class="product-hours">
                <i class="fas fa-clock"></i> ${product.hours}
            </div>
            ${isBuyerView ? `
                <div class="product-actions">
                    <button class="btn btn-secondary" data-id="${productId}">
                        <i class="fas fa-comment"></i> Contactar
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    // Si es vista de comprador, añadir evento de contacto
    if (isBuyerView) {
        const contactBtn = card.querySelector('button');
        contactBtn.addEventListener('click', () => {
            openChatWithSeller(product.sellerId, product);
        });
    }

    return card;
}

// Verificar rol del usuario
async function checkUserRole() {
    const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();

    if (!userData.role) {
        renderRoleSelectionPage();
    } else {
        userRole = userData.role;
        userRole === 'seller' ? renderSellerDashboard() : renderBuyerDashboard();
    }
}

// Funciones de chat
function openChatWithSeller(sellerId, product) {
    renderChatPage(sellerId, product);
}

function renderChatPage(sellerId, product) {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="container">
            <div class="chat-container">
                <div class="chat-sidebar">
                    <div class="chat-header">
                        <h3>Conversaciones</h3>
                    </div>
                    <ul class="contact-list" id="contact-list">
                        <!-- Contactos se cargarán aquí -->
                    </ul>
                </div>
                <div class="chat-main">
                    <div class="chat-header">
                        <h3 id="chat-title">Nuevo Chat</h3>
                    </div>
                    <div class="chat-messages" id="chat-messages">
                        <!-- Mensajes se cargarán aquí -->
                    </div>
                    <div class="chat-input">
                        <input type="text" id="message-input" placeholder="Escribir mensaje...">
                        <button id="send-message">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupChatFunctionality(sellerId, product);
}

function setupChatFunctionality(sellerId, product) {
    // Implementación básica de chat (requeriría expansión)
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');

    sendMessageBtn.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        if (message) {
            try {
                // Guardar mensaje en Firestore
                await firestore.collection('chats').add({
                    senderId: currentUser.uid,
                    receiverId: sellerId,
                    message: message,
                    productId: product.id,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                messageInput.value = '';
            } catch (error) {
                console.error('Error enviando mensaje:', error);
            }
        }
    });
}

// Cerrar sesión
function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        userRole = null;
        renderAuthPage();
    });
}
