# E-Commerce Platform - Architecture & Workflow Diagrams

This document contains comprehensive architecture and workflow diagrams for the Saree Elegance e-commerce platform.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end
    
    subgraph "Frontend Layer"
        React[React + TypeScript]
        Vite[Vite Dev Server]
        Router[React Router]
        TanStack[TanStack Query]
        UI[Shadcn UI Components]
    end
    
    subgraph "Backend Layer"
        Express[Express.js Server]
        JWT[JWT Authentication]
        Multer[File Upload Handler]
        S3[AWS S3 Storage]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB Database)]
        JSONFiles[JSON File Storage]
        LocalStorage[Browser LocalStorage]
    end
    
    subgraph "External Services"
        Email[Nodemailer SMTP]
        WhatsApp[WhatsApp API]
        Payment[Payment Gateway]
    end
    
    Browser --> React
    Mobile --> React
    React --> Router
    React --> TanStack
    React --> UI
    TanStack --> Express
    Express --> JWT
    Express --> Multer
    Multer --> S3
    Express --> MongoDB
    Express --> JSONFiles
    React --> LocalStorage
    Express --> Email
    Express --> WhatsApp
    Express --> Payment
    
    style React fill:#61dafb
    style Express fill:#000000,color:#fff
    style MongoDB fill:#47a248,color:#fff
    style S3 fill:#ff9900,color:#fff
```

---

## 2. Frontend Component Architecture

```mermaid
graph TB
    subgraph "App.tsx - Root Component"
        QueryClient[QueryClientProvider]
        Router[BrowserRouter]
        Layout[Layout Component]
    end
    
    subgraph "Layout Component"
        Header[Header/Navbar]
        Footer[Footer]
        WhatsApp[WhatsApp Widget]
    end
    
    subgraph "Public Pages"
        Home[Home Page]
        Products[Products/Shop]
        ProductDetail[Product Detail]
        Blog[Blog]
        PageView[Static Pages]
        Login[Login]
        Register[Register]
    end
    
    subgraph "Authenticated Pages"
        Cart[Cart]
        Checkout[Checkout]
        Account[Account]
        Orders[Orders]
        Wishlist[Wishlist]
        TrackOrder[Track Order]
    end
    
    subgraph "Admin Pages"
        Admin[Admin Dashboard]
        AdminProducts[Product Management]
        AdminOrders[Order Management]
        AdminSettings[Settings]
        AdminBlogs[Blog Management]
        AdminGallery[Gallery Management]
    end
    
    subgraph "Shared Components"
        ProductCard[ProductCard]
        HeroCarousel[HeroCarousel]
        AboutUs[AboutUs]
        ContactUs[ContactUs]
        PrivacyPolicy[PrivacyPolicy]
        TermsConditions[TermsConditions]
        ReturnsPolicy[ReturnsPolicy]
    end
    
    QueryClient --> Router
    Router --> Layout
    Layout --> Header
    Layout --> Footer
    Layout --> WhatsApp
    
    Router --> Home
    Router --> Products
    Router --> ProductDetail
    Router --> Blog
    Router --> PageView
    Router --> Login
    Router --> Register
    
    Router --> Cart
    Router --> Checkout
    Router --> Account
    Router --> Orders
    Router --> Wishlist
    Router --> TrackOrder
    
    Router --> Admin
    Router --> AdminProducts
    Router --> AdminOrders
    Router --> AdminSettings
    Router --> AdminBlogs
    Router --> AdminGallery
    
    Products --> ProductCard
    Home --> HeroCarousel
    PageView --> AboutUs
    PageView --> ContactUs
    PageView --> PrivacyPolicy
    PageView --> TermsConditions
    PageView --> ReturnsPolicy
    
    style Admin fill:#ff6b6b
    style Authenticated fill:#4ecdc4
    style Public fill:#95e1d3
```

---

## 3. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant AuthLib
    participant Backend
    participant Database
    participant LocalStorage
    
    Note over User,LocalStorage: Registration Flow
    User->>Frontend: Enter email, password, invite code
    Frontend->>AuthLib: register({email, password, invite})
    AuthLib->>Backend: POST /api/auth/register
    Backend->>Database: Check if user exists
    Database-->>Backend: User not found
    Backend->>Backend: Hash password (bcrypt)
    Backend->>Database: Insert new user
    Database-->>Backend: User created
    Backend->>Backend: Generate JWT token
    Backend-->>AuthLib: {token, user: {email, role}}
    AuthLib->>LocalStorage: Store token & role
    AuthLib->>AuthLib: syncAccountStateAfterAuth()
    AuthLib-->>Frontend: Registration success
    Frontend->>Frontend: Navigate to /account or /admin
    
    Note over User,LocalStorage: Login Flow
    User->>Frontend: Enter email, password
    Frontend->>AuthLib: login({email, password})
    AuthLib->>Backend: POST /api/auth/login
    Backend->>Database: Find user by email
    Database-->>Backend: User found
    Backend->>Backend: Compare password (bcrypt)
    Backend->>Backend: Generate JWT token
    Backend-->>AuthLib: {token, user: {email, role}}
    AuthLib->>LocalStorage: Store token & role
    AuthLib->>AuthLib: syncAccountStateAfterAuth()
    AuthLib-->>Frontend: Login success
    Frontend->>Frontend: Navigate based on role
    
    Note over User,LocalStorage: Protected Route Access
    User->>Frontend: Access /admin or /account
    Frontend->>AuthLib: getToken()
    AuthLib->>LocalStorage: Retrieve token
    LocalStorage-->>AuthLib: Token or null
    alt Token exists
        Frontend->>Backend: GET /api/auth/me (with Bearer token)
        Backend->>Backend: Verify JWT token
        Backend->>Database: Get user details
        Database-->>Backend: User data
        Backend-->>Frontend: {email, role}
        Frontend->>Frontend: Allow access
    else No token
        Frontend->>Frontend: Redirect to /login
    end
    
    Note over User,LocalStorage: API Request with Auth
    Frontend->>AuthLib: authFetch("/api/cart")
    AuthLib->>LocalStorage: getToken()
    LocalStorage-->>AuthLib: Token
    AuthLib->>Backend: GET /api/cart (Header: Authorization: Bearer token)
    Backend->>Backend: authMiddleware - Verify token
    Backend->>Database: Fetch cart data
    Database-->>Backend: Cart items
    Backend-->>Frontend: Cart data
```

---

## 4. Shopping Cart Flow

```mermaid
sequenceDiagram
    participant User
    participant CartPage
    participant CartLib
    participant LocalStorage
    participant Backend
    participant Database
    
    Note over User,Database: Add to Cart
    User->>CartPage: Click "Add to Cart"
    CartPage->>CartLib: addToCart(product, quantity)
    CartLib->>CartLib: getToken() - Check auth
    alt Not authenticated
        CartLib->>CartPage: Redirect to /login
    else Authenticated
        CartLib->>LocalStorage: Read current cart
        LocalStorage-->>CartLib: Cart items
        CartLib->>CartLib: Check if product exists
        alt Product in cart
            CartLib->>CartLib: Update quantity
        else New product
            CartLib->>CartLib: Add new item
        end
        CartLib->>LocalStorage: Write updated cart
        CartLib->>CartLib: Dispatch "cart:update" event
        CartLib->>Backend: POST /api/cart (async)
        Backend->>Database: Save/update cart
        Database-->>Backend: Success
        Backend-->>CartLib: Cart saved
    end
    
    Note over User,Database: Update Quantity
    User->>CartPage: Click +/- button
    CartPage->>CartLib: updateQuantity(productId, newQty)
    CartLib->>CartLib: Validate stock limit
    alt Exceeds stock
        CartLib-->>CartPage: {success: false, message: "Exceeds stock"}
        CartPage->>CartPage: Show error toast
    else Valid quantity
        CartLib->>LocalStorage: Update quantity locally
        CartLib->>CartLib: Dispatch "cart:update" event
        CartLib->>Backend: PUT /api/cart (async)
        Backend->>Database: Update cart item
        CartLib-->>CartPage: {success: true}
        CartPage->>CartPage: Refresh UI
    end
    
    Note over User,Database: Remove from Cart
    User->>CartPage: Click delete button
    CartPage->>CartLib: removeFromCart(productId)
    CartLib->>LocalStorage: Filter out product
    CartLib->>LocalStorage: Write updated cart
    CartLib->>CartLib: Dispatch "cart:update" event
    CartLib->>Backend: DELETE /api/cart/:productId (async)
    Backend->>Database: Remove cart item
    CartPage->>CartPage: Refresh UI
    
    Note over User,Database: Sync Cart from Server
    CartPage->>CartLib: syncCartFromServer()
    CartLib->>Backend: GET /api/cart
    Backend->>Database: Fetch user's cart
    Database-->>Backend: Cart items
    Backend-->>CartLib: Cart data
    CartLib->>LocalStorage: Write server cart
    CartLib->>CartLib: Dispatch "cart:update" event
    CartPage->>CartPage: Refresh UI
```

---

## 5. Order Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Checkout
    participant CartLib
    participant Backend
    participant Database
    participant Email
    
    Note over User,Email: Checkout Process
    User->>Checkout: Fill shipping details
    Checkout->>Checkout: Validate form fields
    alt Validation fails
        Checkout->>User: Show error messages
    else Validation passes
        User->>Checkout: Click "Place Order"
        Checkout->>CartLib: getCart()
        CartLib->>LocalStorage: Read cart items
        LocalStorage-->>Checkout: Cart items
        Checkout->>Checkout: Calculate totals (subtotal, shipping, tax, total)
        Checkout->>Backend: POST /api/orders
        Note over Checkout,Backend: Payload: {items, shipping, payment, address}
        Backend->>Backend: Validate order data
        Backend->>Backend: Generate 12-digit tracking ID
        Backend->>Database: Create order record
        Database-->>Backend: Order created
        Backend->>Backend: Update product stock
        Backend->>Database: Update products
        Backend->>CartLib: Clear cart
        Backend->>Database: Clear user's cart
        Backend->>Email: Send order confirmation email
        Backend-->>Checkout: {orderId, trackingId, status}
        Checkout->>Checkout: Navigate to /order/:id
    end
    
    Note over User,Email: Order Tracking
    User->>Checkout: Enter tracking ID
    Checkout->>Backend: GET /api/orders/track/:trackingId
    Backend->>Database: Find order by trackingId
    Database-->>Backend: Order data
    Backend-->>Checkout: Order details (status, items, address)
    Checkout->>Checkout: Display order status
    
    Note over User,Email: Admin Order Management
    User->>Backend: GET /api/admin/orders (admin only)
    Backend->>Database: Fetch all orders
    Database-->>Backend: All orders
    Backend-->>User: Orders list
    User->>Backend: PUT /api/admin/orders/:id (update status)
    Backend->>Database: Update order status
    Database-->>Backend: Updated
    Backend->>Email: Send status update email
    Backend-->>User: Status updated
```

---

## 6. Admin Workflow

```mermaid
graph TB
    subgraph "Admin Access"
        Login[Admin Login]
        Verify[Verify Admin Role]
        Dashboard[Admin Dashboard]
    end
    
    subgraph "Product Management"
        AddProduct[Add New Product]
        EditProduct[Edit Product]
        DeleteProduct[Delete Product]
        UploadImage[Upload Product Images]
        ManageStock[Manage Stock]
    end
    
    subgraph "Order Management"
        ViewOrders[View All Orders]
        UpdateStatus[Update Order Status]
        TrackOrder[Track Orders]
        GenerateReport[Generate Reports]
    end
    
    subgraph "Content Management"
        ManageBlogs[Manage Blog Posts]
        ManageGallery[Manage Gallery]
        ManageBanners[Manage Banners]
        ManageCarousel[Manage Carousel]
        ManagePages[Manage Static Pages]
    end
    
    subgraph "Settings Management"
        SiteSettings[Site Settings]
        ShippingCharges[Shipping Charges]
        SocialLinks[Social Media Links]
        WhatsAppConfig[WhatsApp Configuration]
    end
    
    Login --> Verify
    Verify -->|Admin Role| Dashboard
    Verify -->|Not Admin| Login
    
    Dashboard --> AddProduct
    Dashboard --> EditProduct
    Dashboard --> DeleteProduct
    Dashboard --> UploadImage
    Dashboard --> ManageStock
    
    Dashboard --> ViewOrders
    Dashboard --> UpdateStatus
    Dashboard --> TrackOrder
    Dashboard --> GenerateReport
    
    Dashboard --> ManageBlogs
    Dashboard --> ManageGallery
    Dashboard --> ManageBanners
    Dashboard --> ManageCarousel
    Dashboard --> ManagePages
    
    Dashboard --> SiteSettings
    Dashboard --> ShippingCharges
    Dashboard --> SocialLinks
    Dashboard --> WhatsAppConfig
    
    style Admin fill:#ff6b6b
    style Product fill:#4ecdc4
    style Order fill:#95e1d3
    style Content fill:#f38181
    style Settings fill:#a8e6cf
```

---

## 7. Data Flow Architecture

```mermaid
graph LR
    subgraph "Frontend State Management"
        ReactState[React State]
        TanStackQuery[TanStack Query Cache]
        LocalStorage[Browser LocalStorage]
        Context[React Context]
    end
    
    subgraph "API Layer"
        AuthFetch[authFetch Helper]
        FetchAPI[Standard Fetch]
        APIBase[API Base URL Config]
    end
    
    subgraph "Backend API Routes"
        AuthRoute[/api/auth]
        ProductsRoute[/api/products]
        CartRoute[/api/cart]
        OrdersRoute[/api/orders]
        AdminRoute[/api/admin/*]
        SettingsRoute[/api/settings]
    end
    
    subgraph "Data Storage"
        MongoDB[(MongoDB)]
        JSONFiles[JSON Files]
        FileSystem[File System]
        S3Bucket[AWS S3]
    end
    
    ReactState --> TanStackQuery
    TanStackQuery --> AuthFetch
    TanStackQuery --> FetchAPI
    AuthFetch --> APIBase
    FetchAPI --> APIBase
    
    APIBase --> AuthRoute
    APIBase --> ProductsRoute
    APIBase --> CartRoute
    APIBase --> OrdersRoute
    APIBase --> AdminRoute
    APIBase --> SettingsRoute
    
    AuthRoute --> MongoDB
    AuthRoute --> JSONFiles
    ProductsRoute --> MongoDB
    ProductsRoute --> JSONFiles
    CartRoute --> MongoDB
    CartRoute --> JSONFiles
    OrdersRoute --> MongoDB
    OrdersRoute --> JSONFiles
    AdminRoute --> MongoDB
    AdminRoute --> JSONFiles
    SettingsRoute --> JSONFiles
    
    ProductsRoute --> FileSystem
    ProductsRoute --> S3Bucket
    AdminRoute --> FileSystem
    AdminRoute --> S3Bucket
    
    LocalStorage --> ReactState
    Context --> ReactState
    
    style MongoDB fill:#47a248,color:#fff
    style S3Bucket fill:#ff9900,color:#fff
    style TanStackQuery fill:#ff4154,color:#fff
```

---

## 8. API Structure & Endpoints

```mermaid
graph TB
    subgraph "Public Endpoints"
        GETProducts[GET /api/products]
        GETProduct[GET /api/products/:id]
        GETCategories[GET /api/categories]
        GETBlogs[GET /api/blogs]
        GETPages[GET /api/pages/:slug]
        TrackOrder[GET /api/orders/track/:trackingId]
    end
    
    subgraph "Authentication Endpoints"
        Register[POST /api/auth/register]
        Login[POST /api/auth/login]
        Me[GET /api/auth/me]
        ForgotPassword[POST /api/auth/forgot-password]
        ResetPassword[POST /api/auth/reset-password]
    end
    
    subgraph "User Endpoints (Authenticated)"
        GetCart[GET /api/cart]
        AddCart[POST /api/cart]
        UpdateCart[PUT /api/cart]
        DeleteCart[DELETE /api/cart/:id]
        CreateOrder[POST /api/orders]
        GetOrders[GET /api/orders]
        GetWishlist[GET /api/wishlist]
        AddWishlist[POST /api/wishlist]
        DeleteWishlist[DELETE /api/wishlist/:id]
    end
    
    subgraph "Admin Endpoints (Admin Only)"
        AdminProducts[GET/POST/PUT/DELETE /api/admin/products]
        AdminOrders[GET /api/admin/orders]
        UpdateOrderStatus[PUT /api/admin/orders/:id]
        AdminSettings[GET/PUT /api/admin/settings]
        AdminBanners[GET/POST/DELETE /api/admin/banners]
        AdminBlogs[GET/POST/PUT/DELETE /api/admin/blogs]
        AdminGallery[GET/POST/DELETE /api/admin/gallery]
        UploadFile[POST /api/upload]
    end
    
    subgraph "Content Endpoints"
        GetBanners[GET /api/banners]
        GetFeatured[GET /api/featured]
        GetBestsellers[GET /api/bestsellers]
        GetCarousel[GET /api/carousel]
        GetCategoryTiles[GET /api/category-tiles]
    end
    
    style Public fill:#95e1d3
    style Authentication fill:#4ecdc4
    style User fill:#a8e6cf
    style Admin fill:#ff6b6b
    style Content fill:#f38181
```

---

## 9. User Journey Flow

```mermaid
flowchart TD
    Start([User Visits Site]) --> Home[Home Page]
    Home --> Browse{Browse Products}
    
    Browse -->|View All| Products[Products Page]
    Browse -->|View Category| CategoryProducts[Category Filtered Products]
    Browse -->|View Sale| SaleProducts[Sale Products]
    Browse -->|View Best Sellers| BestSellerProducts[Best Seller Products]
    
    Products --> ProductDetail[Product Detail Page]
    CategoryProducts --> ProductDetail
    SaleProducts --> ProductDetail
    BestSellerProducts --> ProductDetail
    
    ProductDetail --> AddToCart{Add to Cart?}
    AddToCart -->|Yes| CheckAuth{Authenticated?}
    AddToCart -->|No| ProductDetail
    
    CheckAuth -->|No| Login[Login Page]
    CheckAuth -->|Yes| Cart[Cart Page]
    Login -->|After Login| Cart
    
    Cart --> UpdateCart{Update Cart?}
    UpdateCart -->|Change Quantity| Cart
    UpdateCart -->|Remove Item| Cart
    UpdateCart -->|Proceed| Checkout[Checkout Page]
    
    Checkout --> FillForm[Fill Shipping Details]
    FillForm --> ValidateForm{Form Valid?}
    ValidateForm -->|No| FillForm
    ValidateForm -->|Yes| PlaceOrder[Place Order]
    
    PlaceOrder --> OrderConfirmation[Order Confirmation]
    OrderConfirmation --> TrackOrder[Track Order]
    OrderConfirmation --> Orders[My Orders]
    
    Home --> Blog[Blog Page]
    Home --> AboutUs[About Us]
    Home --> ContactUs[Contact Us]
    Home --> Wishlist[Wishlist]
    
    Wishlist --> CheckAuth2{Authenticated?}
    CheckAuth2 -->|No| Login
    CheckAuth2 -->|Yes| WishlistView[View Wishlist]
    
    style Start fill:#a8e6cf
    style OrderConfirmation fill:#4ecdc4
    style Login fill:#ff6b6b
```

---

## 10. File Upload & Storage Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Multer
    participant FileSystem
    participant S3
    participant Database
    
    Note over Admin,Database: Image Upload Flow
    Admin->>Frontend: Select image file
    Frontend->>Frontend: Validate file (type, size)
    Frontend->>Backend: POST /api/upload (FormData)
    Backend->>Multer: Process multipart/form-data
    Multer->>Multer: Generate unique filename
    alt Development Mode
        Multer->>FileSystem: Save to /uploads folder
        FileSystem-->>Multer: File saved
        Multer-->>Backend: File path
    else Production Mode
        Multer->>S3: Upload to AWS S3 bucket
        S3-->>Multer: S3 URL
        Multer-->>Backend: S3 URL
    end
    Backend->>Database: Save product with image URL
    Database-->>Backend: Product saved
    Backend-->>Frontend: {url: imageUrl, filename}
    Frontend->>Frontend: Display uploaded image
    
    Note over Admin,Database: Image Serving
    Frontend->>Backend: GET /uploads/:filename
    alt Development
        Backend->>FileSystem: Read from /uploads
        FileSystem-->>Backend: Image file
        Backend-->>Frontend: Image data
    else Production
        Backend->>S3: Redirect to S3 URL
        S3-->>Frontend: Image data
    end
```

---

## 11. Database Schema (Conceptual)

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ CART : has
    USERS ||--o{ WISHLIST : has
    PRODUCTS ||--o{ CART_ITEMS : "in cart"
    PRODUCTS ||--o{ ORDER_ITEMS : "in order"
    PRODUCTS }o--|| CATEGORIES : belongs_to
    PRODUCTS }o--o{ SUBCATEGORIES : "has subcategory"
    ORDERS ||--o{ ORDER_ITEMS : contains
    CATEGORIES ||--o{ SUBCATEGORIES : has
    
    USERS {
        string email PK
        string password
        string role
        string name
        number createdAt
    }
    
    PRODUCTS {
        string id PK
        string name
        number price
        number originalPrice
        number discount
        array images
        string category
        string subcategory
        number stock
        number rating
        array reviews
        string description
    }
    
    CATEGORIES {
        string id PK
        string name
        string slug
    }
    
    SUBCATEGORIES {
        string id PK
        string categoryId FK
        string name
    }
    
    CART {
        string userEmail PK
        array items
    }
    
    ORDERS {
        string id PK
        string trackingId
        string userEmail FK
        object shippingAddress
        array items
        string status
        number total
        number createdAt
    }
    
    WISHLIST {
        string userEmail PK
        array productIds
    }
```

---

## 12. Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Frontend Deployment"
            FrontendDomain[ecom.speshwayhrms.com]
            ViteBuild[Vite Build Output]
            StaticFiles[Static Files]
            CDN[CDN/CloudFront]
        end
        
        subgraph "Backend Deployment"
            BackendDomain[ecomb.speshwayhrms.com]
            NodeServer[Node.js Server]
            ExpressApp[Express Application]
            PM2[PM2 Process Manager]
        end
        
        subgraph "Storage & Database"
            MongoDB[(MongoDB Atlas)]
            S3Bucket[AWS S3 Bucket]
            FileSystem[File System Storage]
        end
        
        subgraph "External Services"
            EmailService[SMTP Email Service]
            WhatsAppAPI[WhatsApp API]
        end
    end
    
    subgraph "Development Environment"
        DevFrontend[localhost:8080]
        DevBackend[localhost:3001]
        DevMongo[(Local MongoDB)]
        DevFiles[Local File System]
    end
    
    FrontendDomain --> CDN
    CDN --> StaticFiles
    StaticFiles --> ViteBuild
    
    BackendDomain --> PM2
    PM2 --> NodeServer
    NodeServer --> ExpressApp
    
    ExpressApp --> MongoDB
    ExpressApp --> S3Bucket
    ExpressApp --> FileSystem
    ExpressApp --> EmailService
    ExpressApp --> WhatsAppAPI
    
    DevFrontend --> DevBackend
    DevBackend --> DevMongo
    DevBackend --> DevFiles
    
    style Production fill:#4ecdc4
    style Development fill:#95e1d3
    style MongoDB fill:#47a248,color:#fff
    style S3Bucket fill:#ff9900,color:#fff
```

---

## 13. Security Architecture

```mermaid
graph TB
    subgraph "Frontend Security"
        TokenStorage[LocalStorage Token Storage]
        HTTPSOnly[HTTPS Only]
        InputValidation[Input Validation]
        XSSProtection[XSS Protection]
    end
    
    subgraph "Backend Security"
        JWTAuth[JWT Authentication]
        PasswordHash[bcrypt Password Hashing]
        CORS[CORS Configuration]
        RateLimit[Rate Limiting]
        AuthMiddleware[Auth Middleware]
        AdminMiddleware[Admin Middleware]
    end
    
    subgraph "API Security"
        BearerToken[Bearer Token Auth]
        TokenVerification[Token Verification]
        RoleBasedAccess[Role-Based Access Control]
    end
    
    subgraph "Data Security"
        EncryptedPasswords[Encrypted Passwords]
        SecureStorage[Secure File Storage]
        DataValidation[Data Validation]
    end
    
    TokenStorage --> JWTAuth
    HTTPSOnly --> CORS
    InputValidation --> DataValidation
    XSSProtection --> DataValidation
    
    JWTAuth --> BearerToken
    PasswordHash --> EncryptedPasswords
    CORS --> AuthMiddleware
    RateLimit --> AuthMiddleware
    AuthMiddleware --> TokenVerification
    AdminMiddleware --> RoleBasedAccess
    
    BearerToken --> TokenVerification
    TokenVerification --> RoleBasedAccess
    RoleBasedAccess --> SecureStorage
    
    style Security fill:#ff6b6b
    style Authentication fill:#4ecdc4
    style Data fill:#95e1d3
```

---

## 14. State Management Flow

```mermaid
graph TB
    subgraph "Client-Side State"
        ReactState[React useState/useReducer]
        TanStackCache[TanStack Query Cache]
        LocalStorage[Browser LocalStorage]
        SessionStorage[Session Storage]
    end
    
    subgraph "Server State"
        MongoDBState[(MongoDB State)]
        JSONFileState[JSON File State]
        CacheState[Server Cache]
    end
    
    subgraph "State Synchronization"
        SyncCart[Cart Sync]
        SyncWishlist[Wishlist Sync]
        SyncAuth[Auth Sync]
        SyncProducts[Products Sync]
    end
    
    ReactState --> TanStackCache
    TanStackCache --> LocalStorage
    LocalStorage --> SyncCart
    LocalStorage --> SyncWishlist
    
    SyncCart --> MongoDBState
    SyncWishlist --> MongoDBState
    SyncAuth --> MongoDBState
    SyncProducts --> MongoDBState
    
    MongoDBState --> JSONFileState
    JSONFileState --> CacheState
    CacheState --> TanStackCache
    
    style Client fill:#a8e6cf
    style Server fill:#4ecdc4
    style Sync fill:#f38181
```

---

## Summary

This e-commerce platform follows a modern **MERN stack** architecture with the following key characteristics:

1. **Frontend**: React + TypeScript with Vite, TanStack Query for data fetching, and Shadcn UI components
2. **Backend**: Express.js with JWT authentication, supporting both MongoDB and JSON file storage
3. **Storage**: AWS S3 for production file storage, local file system for development
4. **Authentication**: JWT-based authentication with role-based access control (admin/user)
5. **State Management**: Combination of React state, TanStack Query cache, and localStorage
6. **API Design**: RESTful API with clear separation between public, authenticated, and admin endpoints
7. **Security**: HTTPS, CORS, JWT tokens, password hashing, input validation
8. **Deployment**: Separate frontend and backend domains with proper CORS configuration

The architecture supports both development (local) and production (AWS) environments with seamless transitions between them.

