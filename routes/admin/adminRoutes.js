// routes/admin/adminRoutes.js
const path = require("path");
const express = require("express");
const { getJsDateFromExcel } = require("excel-date-to-js");
const router = express.Router();
const db = require("../../data/database");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const xlsx = require("xlsx");
const moment = require("moment");
let Storege = multer.diskStorage({
  destination: "public/userImg/",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

let upload = multer({
  storage: Storege,
});

router.get("/admin-dashboard", async function (req, res) {
  const userEmail = req.session.user.email;

  try {
    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });

    const adminName = admin.username;

    const totalAchievements = await db
      .getDb()
      .collection("Achievements")
      .estimatedDocumentCount();

    const staffCount = await db
      .getDb()
      .collection("Users")
      .countDocuments({ role: { $ne: "admin" } });

    const currentDate = new Date();
    const upcomingEvents = await db
      .getDb()
      .collection("Events")
      .find()
      .toArray();

    const filteredEvents = upcomingEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= currentDate;
    });

    res.render("admin/admin-dashboard", {
      adminName: adminName,
      totalAchievements: totalAchievements,
      staffCount: staffCount,
      upcomingEvents: filteredEvents,
    });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/staff-member", async function (req, res) {
  const userEmail = req.session.user.email;

  const admin = await db
    .getDb()
    .collection("Admins")
    .findOne({ email: userEmail });

  const adminName = admin.username;
  const allUsers = await db
    .getDb()
    .collection("Principal")
    .aggregate([
      { $unionWith: { coll: "HODs" } },
      { $unionWith: { coll: "StaffMembers" } },
    ])
    .toArray();

  res.render("admin/staff-member", {
    adminName: adminName,
    allUsers: allUsers,
  });
});

const { ObjectId } = require("mongodb");
router.post("/staff-member/delete/:userId", async function (req, res) {
  try {
    const userId = req.params.userId;
    console.log(userId);

    // Delete the staff member with the provided user ID
    // Example: Deletion operation for StaffMembers collection
    await db
      .getDb()
      .collection("StaffMembers")
      .deleteOne({ _id: new ObjectId(userId) });

    // Redirect to the staff members page after successful deletion
    res.redirect("/admin/staff-member");
  } catch (error) {
    console.error("Error deleting staff member:", error);
    res.status(500).send("Internal server error");
  }
});
router.get("/admin-contact", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });

    const adminName = admin.username;

    const allUsers = await db
      .getDb()
      .collection("Principal")
      .aggregate([
        { $unionWith: { coll: "HODs" } },
        { $unionWith: { coll: "StaffMembers" } },
      ])
      .toArray();

    res.render("admin/admin-contact", {
      adminName: adminName,
      allUsers: allUsers,
    });
  } catch (error) {
    console.error("Error fetching admin contact:", error);
    res.status(500).send("Internal server error");
  }
});

router.get("/admin-achievement", async function (req, res) {
  try {
    const achievements = await db
      .getDb()
      .collection("Achievements")
      .find()
      .toArray();

    const userEmail = req.session.user.email;
    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });
    const adminName = admin.username;

    res.render("admin/admin-achievement", {
      adminName: adminName,
      achievements: achievements,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.get("/admin-attendance", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });
    const adminName = admin.username;
    const publicFolderPath = path.join(__dirname, "../../public");

    // Construct the file path to the attendance.xlsx file
    const filePath = path.join(publicFolderPath, "attendance.xlsx");

    // Read the Excel file from the server filesystem
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const attendanceData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Process the attendance data
    const processedData = attendanceData.map((entry) => {
      // Convert Excel date serial number to JavaScript Date object
      const date = getJsDateFromExcel(entry.Date);

      // Format the date as "DD-MM-YYYY"
      const formattedDate = formatDate(date);

      // Other processing logic for Total Time, Status, etc.
      // Calculate Total Time, determine Status, and other processing logic...
      const inTime = moment(entry["In Time"], "hh:mm A");
      const outTime = moment(entry["Out Time"], "hh:mm A");
      let totalTime = "0hrs"; // Initialize total time
      let hours = 0; // Initialize hours

      if (inTime.isValid() && outTime.isValid()) {
        const duration = moment.duration(outTime.diff(inTime));
        hours = Math.floor(duration.asHours());
        const minutes = Math.floor(duration.asMinutes()) % 60;
        totalTime = hours + "hrs " + minutes + "mins";
      }

      let status = "Absent";
      if (totalTime !== "0hrs") {
        status = "Present";
        if (hours < 8) {
          status = "Half Present";
        }
        if (hours < 4) {
          status = "Absent";
        }
      }

      return {
        Date: formattedDate,
        Name: entry.Name,
        Email: entry.Email,
        "In Time": entry["In Time"],
        "Out Time": entry["Out Time"],
        "Total Time": totalTime,
        Status: status,
      };
    });

    res.render("admin/admin-attendance", {
      attendanceData: processedData,
      adminName: adminName,
    });
  } catch (error) {
    console.error("Error reading Excel file:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Helper function to format date as "DD-MM-YYYY"
function formatDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
router.get("/admin-leave", async function (req, res) {
  const userEmail = req.session.user.email;
  try {
    const leaveRequests = await db
      .getDb()
      .collection("LeaveRequests")
      .find()
      .toArray();

    for (const request of leaveRequests) {
      const userEmail = await db
        .getDb()
        .collection("StaffMembers")
        .findOne({ email: request.email });

      request.userEmail = userEmail;
    }
    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });
    const adminName = admin.username;

    res.render("admin/admin-leave", {
      leaveRequests: leaveRequests,
      adminName: adminName,
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).send("Internal server error");
  }
});

router.get("/admin-createUser", async function (req, res) {
  const userEmail = req.session.user.email;

  const admin = await db
    .getDb()
    .collection("Admins")
    .findOne({ email: userEmail });
  const adminName = admin.username;
  res.render("admin/admin-createUser", { adminName: adminName });
});

router.post(
  "/admin-createUser",
  upload.single("userPhoto"),
  async function (req, res) {
    const newUser = req.body;
    const enteredRole = newUser.role;
    const enteredEmail = newUser.email;
    const enteredPassword = newUser.password;
    const enteredSalary = newUser.salary;

    if (
      !enteredEmail ||
      !enteredRole ||
      !enteredSalary ||
      !enteredPassword.trim() ||
      enteredPassword.trim().length < 6 ||
      !enteredEmail.includes("@")
    ) {
      console.log("Invalid Input- please check your data.");
    }

    function getDbName(enteredRole) {
      let dbName;
      if (enteredRole == "principal") {
        dbName = "Principal";
      } else if (enteredRole == "hod") {
        dbName = "HODs";
      } else if (enteredRole == "staff") {
        dbName = "StaffMembers";
      } else {
        throw new Error("Role Does not Exist");
      }
      return dbName;
    }
    const DbName = getDbName(enteredRole);

    const addUsersExists = await db
      .getDb()
      .collection("Users")
      .findOne({ email: enteredEmail });

    if (addUsersExists) {
      console.log("User exists already!");
      return res.status(400).send("User already exists");
    }
    const hashPassword = await bcrypt.hash(enteredPassword, 12);

    const addUsers = {
      email: enteredEmail,
      password: hashPassword,
      role: enteredRole,
      salary: enteredSalary,
    };

    const Users = {
      email: enteredEmail,
      password: hashPassword,
      role: enteredRole,
    };
    try {
      await db.getDb().collection(DbName).insertOne(addUsers);
      await db.getDb().collection("Users").insertOne(Users);
      res.redirect("/admin/admin-dashboard");
    } catch (error) {
      console.error("Error inserting user:", error);
      res.status(500).send("Internal server error");
    }
  }
);
router.get("/admin-event", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });
    const adminName = admin.username;

    const eventsCursor = await db.getDb().collection("Events").find();
    const events = await eventsCursor.toArray();

    res.render("admin/admin-event", { events: events, adminName: adminName });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/admin-addevent", async function (req, res) {
  const userEmail = req.session.user.email;

  const admin = await db
    .getDb()
    .collection("Admins")
    .findOne({ email: userEmail });
  const adminName = admin.username;
  res.render("admin/admin-addevent", { adminName: adminName });
});

router.post("/admin-addevent", async function (req, res) {
  try {
    const { name, coordinator, contact, date, time, place, targetAudience } = req.body;

    await db
      .getDb()
      .collection("Events")
      .insertOne({
        name,
        coordinator,
        contact,
        date,
        time,
        place,
        targetAudience,
      });

    res.redirect("/admin/admin-event");
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).send("Internal server error");
  }
});

router.get("/admin-department", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });

    const adminName = admin.username;

    const departments = await db
      .getDb()
      .collection("Departments")
      .find()
      .toArray();

    res.render("admin/admin-department", {
      adminName: adminName,
      departments: departments,
    });
  } catch (error) {
    console.error("Error fetching department data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/admin-salary", async function (req, res) {
  const userEmail = req.session.user.email;

  try {
    const admin = await db
      .getDb()
      .collection("Admins")
      .findOne({ email: userEmail });

    const users = await db
      .getDb()
      .collection("Principal")
      .aggregate([
        { $unionWith: { coll: "HODs" } },
        { $unionWith: { coll: "StaffMembers" } },
        {
          $project: {
            name: { $concat: ["$firstname", " ", "$lastname"] },
            salary: { $toDouble: "$salary" },
            role: 1,
            department: 1,
            AGP: { $literal: 5000 },
            DA: { $multiply: [0.1, { $toDouble: "$salary" }] }, // Calculate DA: 10% of base salary
            HRA: { $multiply: [0.05, { $toDouble: "$salary" }] }, // Calculate HRA: 5% of base salary
            otherSalary: { $multiply: [0.02, { $toDouble: "$salary" }] }, // Calculate other components: 2% of base salary
          },
        },
        {
          $set: {
            totalSalary: {
              $sum: ["$salary", "$AGP", "$DA", "$HRA", "$otherSalary"],
            }, // Calculate total salary
          },
        },
      ])
      .toArray();

    const adminName = admin.username;
    res.render("admin/admin-salary", { adminName: adminName, users: users });
  } catch (error) {
    console.error("Error fetching and aggregating salary data:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
