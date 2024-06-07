const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const bcrypt = require("bcryptjs");
const app = express();

const db = require("./data/database");

// Create a MongoDB session store
const store = new MongoDBStore({
  uri: "mongodb://localhost:27017/sms",
  collection: "sessions",
});

// Catch errors in the session store
store.on("error", function (error) {
  console.error("Session store error:", error);
});

// Session middleware
app.use(
  session({
    secret: "2a12LJDKYRBuq27DPLK4e3F4vOrSsAdbUnGteNcux9hCMEQK23OXBm7lu",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: false,
      httpOnly: true,
    },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

const adminRoutes = require("./routes/admin/adminRoutes");
app.use("/admin", adminRoutes);

const staffRoutes = require("./routes/staff/staffRoutes");
app.use("/staff", staffRoutes);

const principalRoutes = require("./routes/principal/principalRoutes");
app.use("/principal", principalRoutes);

const hodRoutes = require("./routes/hod/hodRoutes");
app.use("/hod", hodRoutes);

app.get("/", function (req, res) {
  res.redirect("/index");
});

app.get("/index", function (req, res) {
  res.render("index");
});

app.get("/aboutUs", function (req, res) {
  res.render("aboutUs");
});

app.get("/contactUs", function (req, res) {
  res.render("contactUs");
});

app.post("/contactUs", async  function (req, res) {
  try {
    const {name , email, message} = req.body

    const contact = {
      name: name,
      email : email, 
      message: message,
    };
    
    
    await db.getDb().collection("contactUs").insertOne(contact);
  } catch {}
  res.render("contactUs");
});
app.get("/logIn", function (req, res) {
  res.render("logIn");
});
app.get("/signup", function (req, res) {
  res.render("signup");
});

app.post("/signup", async function (req, res) {
  const userData = req.body;
  const enteredUsername = userData.username;
  const enteredEmail = userData.email;
  const entredPassword = userData.password;
  const enteredConfirmPassword = userData.confirmPassword;
  const enteredRole = userData.role;

  if (
    !enteredEmail ||
    !entredPassword.trim() ||
    !enteredConfirmPassword.trim() ||
    entredPassword.trim().length < 6 ||
    enteredConfirmPassword.trim().length < 6 ||
    entredPassword.trim() !== enteredConfirmPassword.trim() ||
    !enteredEmail.includes("@")
  ) {
    console.log("Invalid Input- please check your data.");
  }

  const existingUser = await db
    .getDb()
    .collection("Admins")
    .findOne({ email: enteredEmail });

  if (existingUser) {
    console.log("User exists already!");
    return res.status(400).send("User already exists");
  }

  const hashPassword = await bcrypt.hash(entredPassword, 12);

  const admin = {
    username: enteredUsername,
    email: enteredEmail,
    password: hashPassword,
    role: enteredRole,
  };
  const user = {
    email: enteredEmail,
    password: hashPassword,
    role: enteredRole,
  };

  await db.getDb().collection("Admins").insertOne(admin);
  await db.getDb().collection("Users").insertOne(user);
  res.redirect("/login");
});
app.post("/logIn", async function (req, res) {
  const { email, password, role } = req.body;

  try {
    const existingUser = await db
      .getDb()
      .collection("Users")
      .findOne({ email });

    if (!existingUser) {
      console.log("User not found!");
      return res.status(400).send("User not found");
    }

    const passwordAreEqual = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!passwordAreEqual) {
      console.log("Invalid password!");
      return res.status(400).send("Invalid password");
    }

    if (existingUser.role !== role) {
      console.log("Role does not match!");
      return res.status(400).send("Role does not match");
    }

    // Store user data in the session
    req.session.user = existingUser;

    switch (existingUser.role) {
      case "admin":
        res.redirect("/admin/admin-dashboard");
        break;
      case "staff":
        res.redirect("/staff/staff-dashboard");
        break;
      case "principal":
        res.redirect("/principal/principal-dashboard");
        break;
      case "hod":
        res.redirect("/hod/hod-dashboard");
        break;
      default:
        res.redirect("/index");
        break;
    }
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/logout", function (req, res) {
  // Destroy the session
  req.session.destroy(function (err) {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Internal server error");
    }
    // Redirect the user to the index page or any other desired page after logout
    res.redirect("/index");
  });
});

db.connectToDatabase().then(function () {
  app.listen(3000, function () {
    console.log("Server is running on 3000 Port");
  });
});
