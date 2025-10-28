import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://nesswearforyou.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());

// JWT utilities
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// MongoDB setup
const client = new MongoClient(process.env.MONGO_URI);
let db;

// connect function
async function connectDB() {
  try {
    await client.connect();
    db = client.db("nesswearDB");
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// test route
app.get("/", (req, res) => {
  res.send("NESS WEAR server is running...");
});

// check database connection
app.get("/api/test-db", async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    res.json({ message: "Database connected!", collections });
  } catch (err) {
    res.status(500).json({ error: "Database not connected" });
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// JWT test route
app.get("/api/test-jwt", (req, res) => {
  const testUser = {
    _id: "test123",
    email: "test@nesswear.com",
  };
  const token = generateToken(testUser);
  res.json({
    message: "JWT token generated successfully",
    token,
    decoded: verifyToken(token),
  });
});

// ==========================
// Categories Routes (CRUD)
// ==========================

// GET /categories - Get all categories
app.get("/categories", async (req, res) => {
  try {
    const categories = await db.collection("categories").find({}).toArray();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /categories/:id - Get single category
app.get("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const category = await db.collection("categories").findOne({ _id: id });
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// POST /categories - Create new category
app.post("/categories", authenticateToken, async (req, res) => {
  try {
    const { name, description, image, isActive = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const category = {
      _id: new Date().getTime().toString(), // Simple ID generation
      name,
      description,
      image,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("categories").insertOne(category);
    
    if (result.insertedId) {
      res.status(201).json(category);
    } else {
      res.status(500).json({ error: "Failed to create category" });
    }
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /categories/:id - Update category
app.put("/categories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive } = req.body;
    
    const updateData = {
      updatedAt: new Date(),
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await db.collection("categories").updateOne(
      { _id: id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const updatedCategory = await db.collection("categories").findOne({ _id: id });
    res.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /categories/:id - Delete category
app.delete("/categories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.collection("categories").deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Also delete all subcategories under this category
    await db.collection("subcategories").deleteMany({ categoryId: id });
    
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ==========================
// SubCategories Routes (CRUD)
// ==========================

// GET /subcategories - Get all subcategories or filter by categoryId
app.get("/subcategories", async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = categoryId ? { categoryId } : {};
    
    const subcategories = await db.collection("subcategories").find(query).toArray();
    res.json(subcategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

// GET /subcategories/:id - Get single subcategory
app.get("/subcategories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const subcategory = await db.collection("subcategories").findOne({ _id: id });
    
    if (!subcategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    
    res.json(subcategory);
  } catch (error) {
    console.error("Error fetching subcategory:", error);
    res.status(500).json({ error: "Failed to fetch subcategory" });
  }
});

// POST /subcategories - Create new subcategory
app.post("/subcategories", authenticateToken, async (req, res) => {
  try {
    const { name, description, categoryId, image, isActive = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Subcategory name is required" });
    }
    
    if (!categoryId) {
      return res.status(400).json({ error: "Category ID is required" });
    }

    // Verify that the parent category exists
    const category = await db.collection("categories").findOne({ _id: categoryId });
    if (!category) {
      return res.status(400).json({ error: "Parent category not found" });
    }

    const subcategory = {
      _id: new Date().getTime().toString(), // Simple ID generation
      name,
      description,
      categoryId,
      image,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("subcategories").insertOne(subcategory);
    
    if (result.insertedId) {
      res.status(201).json(subcategory);
    } else {
      res.status(500).json({ error: "Failed to create subcategory" });
    }
  } catch (error) {
    console.error("Error creating subcategory:", error);
    res.status(500).json({ error: "Failed to create subcategory" });
  }
});

// PUT /subcategories/:id - Update subcategory
app.put("/subcategories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, image, isActive } = req.body;
    
    const updateData = {
      updatedAt: new Date(),
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (categoryId !== undefined) {
      // Verify that the new parent category exists
      const category = await db.collection("categories").findOne({ _id: categoryId });
      if (!category) {
        return res.status(400).json({ error: "Parent category not found" });
      }
      updateData.categoryId = categoryId;
    }

    const result = await db.collection("subcategories").updateOne(
      { _id: id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    const updatedSubcategory = await db.collection("subcategories").findOne({ _id: id });
    res.json(updatedSubcategory);
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({ error: "Failed to update subcategory" });
  }
});

// DELETE /subcategories/:id - Delete subcategory
app.delete("/subcategories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.collection("subcategories").deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    
    res.json({ message: "Subcategory deleted successfully" });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({ error: "Failed to delete subcategory" });
  }
});

// start server
app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
