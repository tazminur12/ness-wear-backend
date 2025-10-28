# Ness Wear Backend

A complete e-commerce backend API for Ness Wear clothing store built with Node.js, Express, and MongoDB.

## Features

- 🛍️ **Product Management** - CRUD operations for products
- 👥 **User Management** - User registration, login, and profile management
- 📦 **Order Management** - Order creation, tracking, and status updates
- 🔒 **CORS Enabled** - Cross-origin resource sharing for frontend integration
- 📊 **Health Check** - API health monitoring endpoint
- 🗄️ **MongoDB Integration** - NoSQL database for flexible data storage

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ness-wear-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your MongoDB connection string and other configurations.

4. **Start the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000` (or your configured PORT).

## API Endpoints

### Health Check
- `GET /api/health` - Check if the API is running

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/category/:category` - Get products by category

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/login` - User login

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order
- `GET /api/orders/user/:userId` - Get orders by user
- `PUT /api/orders/:id/status` - Update order status

## Data Models

### Product
```json
{
  "_id": "ObjectId",
  "name": "String",
  "description": "String",
  "price": "Number",
  "category": "String",
  "size": "String",
  "color": "String",
  "image": "String",
  "stock": "Number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### User
```json
{
  "_id": "ObjectId",
  "email": "String",
  "password": "String",
  "firstName": "String",
  "lastName": "String",
  "address": "Object",
  "phone": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Order
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "items": [
    {
      "productId": "ObjectId",
      "quantity": "Number",
      "price": "Number"
    }
  ],
  "totalPrice": "Number",
  "status": "String",
  "shippingAddress": "Object",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/nesswearDB` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | JWT secret key | - |

## Development

### Project Structure
```
ness-wear-backend/
├── routes/
│   ├── products.js
│   ├── users.js
│   └── orders.js
├── index.js
├── package.json
├── env.example
└── README.md
```

### Adding New Routes

1. Create a new route file in the `routes/` directory
2. Import and use it in `index.js`
3. Follow the existing pattern for error handling and response formatting

### Error Handling

All routes include proper error handling with consistent response format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a production MongoDB instance
3. Set up proper logging and monitoring
4. Configure reverse proxy (nginx) if needed
5. Use PM2 or similar process manager

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License
