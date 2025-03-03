# 🛒 Grocery Shopping List App - Technical Specification

## Tech Stack 📱
- **Frontend:**  
  - React Native (TypeScript) + Expo + Expo Router  
  - React Native Paper (UI Framework)  
- **Backend:**  
  - Supabase (Database & Auth)  

---

## Database Schema 📊

- **Users**
  - `id` (UUID, Primary Key)
  - `username` (String, Unique)
  - `email` (String, Unique)
  - `password_hash` (String)
  - `user_type` (Enum: 'Customer', 'Vendor')
  - `created_at` (Timestamp)

- **Lists**
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key to Users)
  - `name` (String)
  - `created_at` (Timestamp)

- **Items**
  - `id` (UUID, Primary Key)
  - `list_id` (UUID, Foreign Key to Lists)
  - `name` (String)
  - `quantity` (Integer)
  - `price` (Decimal)
  - `created_at` (Timestamp)

- **Shops**
  - `id` (UUID, Primary Key)
  - `vendor_id` (UUID, Foreign Key to Users)
  - `name` (String)
  - `address` (String)
  - `contact` (String)
  - `map_link` (String)
  - `created_at` (Timestamp)

- **Inventory**
  - `id` (UUID, Primary Key)
  - `shop_id` (UUID, Foreign Key to Shops)
  - `item_id` (UUID, Foreign Key to Items)
  - `price` (Decimal)
  - `stock_status` (Boolean)
  - `updated_at` (Timestamp)

---

## Optimal Folder Structure 📂

/shopsmart
│
├── /src
│   ├── /components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   │
│   ├── /screens
│   │   ├── WelcomeScreen.tsx
│   │   ├── CreateListScreen.tsx
│   │   ├── ListViewScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── ...
│   │
│   ├── /navigation
│   │   ├── AppNavigator.tsx
│   │   └── ...
│   │
│   ├── /context
│   │   ├── AuthContext.tsx
│   │   └── ...
│   │
│   ├── /services
│   │   ├── api.ts
│   │   └── ...
│   │
│   ├── /utils
│   │   ├── helpers.ts
│   │   └── ...
│   │
│   ├── /assets
│   │   ├── /images
│   │   ├── /fonts
│   │   └── ...
│   │
│   ├── App.tsx
│   └── ...
│
├── /docs
│   └── context.md
│
├── /config
│   ├── database.ts
│   └── ...
│
├── /tests
│   ├── /unit
│   ├── /integration
│   └── ...
│
├── package.json
└── ...

## Customer Flow 👤

### 1. Welcome Screen
**UI Components:**
- **Primary Buttons:**
  - `Create List` → Navigates to Create New List Screen
  - `Login` → Navigates to Login Screen
- **Footer Text Link:**  
  - `Sign Up` → Navigates to Signup Screen

**Auth Requirement:**  
⚠️ Requires login for full features:
- Shop comparisons
- Image search
- Price totals
- Parking info

### 2. List Creation Flow
#### Create New List Screen
- **Inputs:**
  - `List Name` text field
  - `Items` multi-line field
- **Actions:**
  - `Cancel` → Returns to the previous screen
  - `Create` → Navigates to List View Screen

#### List View Screen
**Features:**
- **Top Bar:**
  - `Search by Image` → Opens Camera/Browser selector
- **Per Item:**
  - `View Shops` → Opens Shop selection modal
- **Bottom Section:**
  - Total price display
  - `Add Item` → Opens List editor
  - `View Parking` → Opens Map integration

### 3. Authentication Flow
#### Login Screen
- **Fields:**
  - 📧 Email input
  - 🔒 Password input
- **User Type:** Dropdown (Customer/Vendor)
- **Links:**  
  - `Create Account` → Navigates to Signup Screen

#### Signup Screen
- **Fields:**
  - 👤 Username
  - 📧 Email
  - 🔒 Password
  - User Type dropdown

### 4. Shop Interaction
#### Item Picking Modal
**Displayed Info:**
- Shop name & distance
- Item name
- Price & stock status
- Item image thumbnail

**Actions:**
- `View Item` → Opens Detail modal
- `View Location` → Opens Map integration
- `Pick Item` → Adds to list

### 5. Dashboard & Profile Management

#### Dashboard Features
- **List Display:**  
  - Shows the names of lists the user has created.
- **Create New List Button:**  
  - Provides quick access to create a new list.

#### Profile Screen
- **Access:**  
  - Reachable from the dashboard.
- **User Profile Details:**  
  - Displays user-specific information.
- **Logout Button:**  
  - Allows the user to log out of their account.

---

## Vendor Flow 🏪

### 1. Vendor Dashboard
- Store list with inventory counts
- `Add Store` button → Navigates to Store Creation

### 2. Store Management
#### Store Creation Screen
- **Fields:**
  - Store name
  - Address
  - Contact
  - Map link or map location

#### Inventory Management
**Per Item Actions:**
- `View/Update` → Opens Detail editor
- `Update Price` → Opens Quick edit modal
- `Update Stock` → Toggles availability

**Add Item Flow:**
- Photo upload
- Price/availability fields
- Product details textarea

---

## Feature Matrix 📊

| Customers ✅                | Vendors 🏭                |
|----------------------------|---------------------------|
| Price comparisons          | Multi-store management    |
| Image-based search         | Real-time inventory       |
| Parking location maps      | Item updates              |
| List sharing/export        |             |
| Shop distance sorting      |                           |
