import express from "express";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const app = express();

const PORT = process.env.PORT || 5000;

// ========================================
// CORS
// ========================================

const allowedOrigins = [
  "http://localhost:5173",
  "https://finly-blond.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Разрешаем запросы без origin
      // Postman, Vercel health check и т.д.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked:", origin);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());

// ========================================
// DATABASE — NEON
// ========================================

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add Neon connection string in Vercel."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },
});

// Проверка подключения
pool
  .connect()
  .then((client) => {
    console.log("✅ Neon PostgreSQL connected");
    client.release();
  })
  .catch((error) => {
    console.error("❌ Neon PostgreSQL connection error:");
    console.error(error.message);
  });

// ========================================
// JWT
// ========================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not configured");
}

// ========================================
// CREATE TOKEN
// ========================================

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },

    JWT_SECRET,

    {
      expiresIn: "7d",
    }
  );
}

// ========================================
// AUTH MIDDLEWARE
// ========================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Invalid authorization format",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

// ========================================
// ROOT
// ========================================

app.get("/", (req, res) => {
  res.json({
    message: "Personal Finance API",
    version: "1.0.0",
    status: "running",
  });
});

// ========================================
// HEALTH
// ========================================

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS time,
        current_database() AS database
    `);

    res.json({
      status: "ok",
      database: "connected",
      databaseName: result.rows[0].database,
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error("HEALTH CHECK ERROR:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message,
    });
  }
});

// ========================================
// REGISTER
// ========================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `
      INSERT INTO users (
        email,
        password_hash,
        name
      )

      VALUES (
        $1,
        $2,
        $3
      )

      RETURNING
        id,
        email,
        name,
        currency,
        timezone,
        created_at
      `,
      [email.toLowerCase(), passwordHash, name]
    );

    const user = userResult.rows[0];

    // ========================================
    // DEFAULT CATEGORIES
    // ========================================

    const defaultCategories = [
      ["Еда", "expense", "utensils"],
      ["Транспорт", "expense", "car"],
      ["Покупки", "expense", "shopping-bag"],
      ["Развлечения", "expense", "gamepad-2"],
      ["Дом", "expense", "house"],
      ["Здоровье", "expense", "heart-pulse"],
      ["Образование", "expense", "graduation-cap"],
      ["Подписки", "expense", "credit-card"],
      ["Другое", "expense", "ellipsis"],

      ["Зарплата", "income", "briefcase"],
      ["Подработка", "income", "wallet"],
      ["Фриланс", "income", "laptop"],
      ["Другое", "income", "ellipsis"],
    ];

    for (const category of defaultCategories) {
      await pool.query(
        `
        INSERT INTO categories (
          user_id,
          name,
          type,
          icon
        )

        VALUES (
          $1,
          $2,
          $3,
          $4
        )
        `,
        [
          user.id,
          category[0],
          category[1],
          category[2],
        ]
      );
    }

    const token = createToken(user);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// ========================================
// LOGIN
// ========================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      `,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        currency: user.currency,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// ========================================
// GET CURRENT USER
// ========================================

app.get(
  "/api/auth/me",

  authenticateToken,

  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          email,
          name,
          avatar_url,
          currency,
          timezone,
          created_at

        FROM users

        WHERE id = $1
        `,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        user: result.rows[0],
      });
    } catch (error) {
      console.error("GET USER ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET CATEGORIES
// ========================================

app.get(
  "/api/categories",

  authenticateToken,

  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *

        FROM categories

        WHERE user_id = $1

        ORDER BY type, name
        `,
        [req.user.id]
      );

      res.json({
        categories: result.rows,
      });
    } catch (error) {
      console.error("GET CATEGORIES ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// CREATE CATEGORY
// ========================================

app.post(
  "/api/categories",

  authenticateToken,

  async (req, res) => {
    try {
      const {
        name,
        type,
        icon,
        color,
      } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          message: "Name and type are required",
        });
      }

      if (!["expense", "income"].includes(type)) {
        return res.status(400).json({
          message: "Type must be expense or income",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO categories (
          user_id,
          name,
          type,
          icon,
          color
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )

        RETURNING *
        `,
        [
          req.user.id,
          name,
          type,
          icon || null,
          color || null,
        ]
      );

      res.status(201).json({
        category: result.rows[0],
      });
    } catch (error) {
      console.error("CREATE CATEGORY ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET EXPENSES
// ========================================

app.get(
  "/api/expenses",

  authenticateToken,

  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          expenses.*,

          categories.name AS category_name,
          categories.icon AS category_icon,
          categories.color AS category_color

        FROM expenses

        JOIN categories
          ON expenses.category_id = categories.id

        WHERE expenses.user_id = $1

        ORDER BY
          expenses.date DESC,
          expenses.created_at DESC
        `,
        [req.user.id]
      );

      res.json({
        expenses: result.rows,
      });
    } catch (error) {
      console.error("GET EXPENSES ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// CREATE EXPENSE
// ========================================

app.post(
  "/api/expenses",

  authenticateToken,

  async (req, res) => {
    try {
      const {
        category_id,
        amount,
        date,
        payment_method,
        description,
        is_recurring,
      } = req.body;

      if (!category_id || !amount) {
        return res.status(400).json({
          message: "Category and amount are required",
        });
      }

      if (Number(amount) <= 0) {
        return res.status(400).json({
          message: "Amount must be greater than 0",
        });
      }

      const categoryResult = await pool.query(
        `
        SELECT id

        FROM categories

        WHERE id = $1
          AND user_id = $2
          AND type = 'expense'
        `,
        [
          category_id,
          req.user.id,
        ]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({
          message: "Invalid expense category",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO expenses (
          user_id,
          category_id,
          amount,
          date,
          payment_method,
          description,
          is_recurring
        )

        VALUES (
          $1,
          $2,
          $3,
          COALESCE($4, CURRENT_DATE),
          $5,
          $6,
          COALESCE($7, FALSE)
        )

        RETURNING *
        `,
        [
          req.user.id,
          category_id,
          amount,
          date || null,
          payment_method || null,
          description || null,
          is_recurring || false,
        ]
      );

      res.status(201).json({
        message: "Expense created",
        expense: result.rows[0],
      });
    } catch (error) {
      console.error("CREATE EXPENSE ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// DELETE EXPENSE
// ========================================

app.delete(
  "/api/expenses/:id",

  authenticateToken,

  async (req, res) => {
    try {
      const result = await pool.query(
        `
        DELETE FROM expenses

        WHERE id = $1
          AND user_id = $2

        RETURNING id
        `,
        [
          req.params.id,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Expense not found",
        });
      }

      res.json({
        message: "Expense deleted",
      });
    } catch (error) {
      console.error("DELETE EXPENSE ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// GET INCOME
// ========================================

app.get(
  "/api/income",

  authenticateToken,

  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          income.*,

          categories.name AS category_name,
          categories.icon AS category_icon

        FROM income

        LEFT JOIN categories
          ON income.category_id = categories.id

        WHERE income.user_id = $1

        ORDER BY
          income.date DESC,
          income.created_at DESC
        `,
        [req.user.id]
      );

      res.json({
        income: result.rows,
      });
    } catch (error) {
      console.error("GET INCOME ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// CREATE INCOME
// ========================================

app.post(
  "/api/income",

  authenticateToken,

  async (req, res) => {
    try {
      const {
        category_id,
        amount,
        source,
        date,
        comment,
      } = req.body;

      if (!amount || !source) {
        return res.status(400).json({
          message: "Amount and source are required",
        });
      }

      if (Number(amount) <= 0) {
        return res.status(400).json({
          message: "Amount must be greater than 0",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO income (
          user_id,
          category_id,
          amount,
          source,
          date,
          comment
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE($5, CURRENT_DATE),
          $6
        )

        RETURNING *
        `,
        [
          req.user.id,
          category_id || null,
          amount,
          source,
          date || null,
          comment || null,
        ]
      );

      res.status(201).json({
        message: "Income created",
        income: result.rows[0],
      });
    } catch (error) {
      console.error("CREATE INCOME ERROR:", error);

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// ========================================
// 404
// ========================================

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    method: req.method,
    path: req.path,
  });
});

// ========================================
// ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  res.status(500).json({
    message: "Server error",
    error: error.message,
  });
});

// ========================================
// LOCAL SERVER
// ========================================

// На Vercel app экспортируется.
// Локально запускается через app.listen.

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
========================================
💰 Personal Finance API
========================================

🚀 Server:
http://localhost:${PORT}

📡 API:
http://localhost:${PORT}/api

❤️ Health:
http://localhost:${PORT}/api/health

========================================
    `);
  });
}

export default app;