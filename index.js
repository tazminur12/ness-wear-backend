import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ====== Middleware ======
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://nesswearforyou.netlify.app"
    ],
    credentials: true,
  })
);
app.use(express.json());

// ====== JWT Utils ======
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in .env");
  process.exit(1);
}

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

// ====== MongoDB Setup ======
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("nesswearDB");

    // Safe index creation
    await db
      .collection("categories")
      .createIndex({ name: 1 }, { unique: true })
      .catch(() => {});
    await db
      .collection("subcategories")
      .createIndex({ name: 1 }, { unique: true })
      .catch(() => {});

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// ====== Routes ======

// Test route
app.get("/", (req, res) => {
  res.send("NESS WEAR server is running...✅");
});

// Test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    res.json({ message: "Database connected!", collections });
  } catch (err) {
    res.status(500).json({ error: "Database not connected" });
  }
});

// ====== Authentication Middleware ======
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) return res.status(401).json({ error: "Access token required" });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(403).json({ error: "Invalid or expired token" });

  req.user = decoded;
  next();
};

// JWT test
app.get("/api/test-jwt", (req, res) => {
  const testUser = { _id: "test123", email: "test@nesswear.com" };
  const token = generateToken(testUser);
  res.json({
    message: "JWT token generated successfully",
    token,
    decoded: verifyToken(token),
  });
});

// ==========================
// Categories CRUD
// ==========================

// Get all categories
app.get("/categories", async (req, res) => {
  try {
    const categories = await db.collection("categories").find({}).toArray();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get single category
app.get("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(id) });

    if (!category) return res.status(404).json({ error: "Category not found" });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// Create category
app.post("/categories", authenticateToken, async (req, res) => {
  try {
    const { name, description, image, isActive = true } = req.body;
    if (!name) return res.status(400).json({ error: "Category name required" });

    const category = {
      name,
      description,
      image,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("categories").insertOne(category);
    res.status(201).json({ ...category, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Update category
app.put("/categories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive } = req.body;

    const updateData = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await db
      .collection("categories")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Category not found" });

    const updatedCategory = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(id) });
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete category
app.delete("/categories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .collection("categories")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Category not found" });

    // Also delete subcategories under this category
    await db.collection("subcategories").deleteMany({ categoryId: id });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ==========================
// Subcategories CRUD
// ==========================

// Get all subcategories or filter by categoryId
app.get("/subcategories", async (req, res) => {
  try {
    const { categoryId } = req.query;
    const query = categoryId ? { categoryId } : {};
    const subcategories = await db.collection("subcategories").find(query).toArray();
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

// Get single subcategory
app.get("/subcategories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const subcategory = await db
      .collection("subcategories")
      .findOne({ _id: new ObjectId(id) });

    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });

    res.json(subcategory);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subcategory" });
  }
});

// Create subcategory
app.post("/subcategories", authenticateToken, async (req, res) => {
  try {
    const { name, description, categoryId, image, isActive = true } = req.body;
    if (!name) return res.status(400).json({ error: "Subcategory name required" });
    if (!categoryId) return res.status(400).json({ error: "Category ID required" });

    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(categoryId) });
    if (!category) return res.status(400).json({ error: "Parent category not found" });

    const subcategory = {
      name,
      description,
      categoryId,
      image,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("subcategories").insertOne(subcategory);
    res.status(201).json({ ...subcategory, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create subcategory" });
  }
});

// Update subcategory
app.put("/subcategories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, image, isActive } = req.body;

    const updateData = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (categoryId !== undefined) {
      const category = await db
        .collection("categories")
        .findOne({ _id: new ObjectId(categoryId) });
      if (!category) return res.status(400).json({ error: "Parent category not found" });
      updateData.categoryId = categoryId;
    }

    const result = await db
      .collection("subcategories")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Subcategory not found" });

    const updatedSubcategory = await db
      .collection("subcategories")
      .findOne({ _id: new ObjectId(id) });
    res.json(updatedSubcategory);
  } catch (error) {
    res.status(500).json({ error: "Failed to update subcategory" });
  }
});

// Delete subcategory
app.delete("/subcategories/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .collection("subcategories")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Subcategory not found" });

    res.json({ message: "Subcategory deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete subcategory" });
  }
});

// ====== Start Server ======
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("Failed to start server:", err));
