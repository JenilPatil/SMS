const express = require("express");
const router = express.Router();
const db = require("../../data/database");
const multer = require("multer");

let Storege = multer.diskStorage({
  destination: "public/userImg/",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

let upload = multer({
  storage: Storege,
});
// principalUtils.js

async function getPrincipalDetails(email) {
  try {
    const principal = await db
      .getDb()
      .collection("Principal")
      .findOne({ email: email });

    if (principal) {
      return {
        principalName: `${principal.firstname} ${principal.lastname}`.trim(),
        userPhoto: principal.userphoto || "" // Default to empty string if userphoto is not available
      };
    } else {
      return { principalName: "Principal", userPhoto: "" };
    }
  } catch (error) {
    console.error("Error fetching principal details:", error);
    return { principalName: "Principal", userPhoto: "" };
  }
}


router.get("/principal-dashboard", async function (req, res) {
  try {
    // Fetch counts of achievements, events, and leave records
     const userEmail = req.session.user.email;
      const { principalName, userPhoto } = await getPrincipalDetails(userEmail);
    const achievementsCount = await db
      .getDb()
      .collection("Achievements")
      .countDocuments();

    // Fetch count of upcoming events
    const currentDate = new Date().toISOString(); // Current date in ISO string format
    const upcomingEventsCount = await db
      .getDb()
      .collection("Events")
      .countDocuments({ date: { $gte: currentDate } }); // Find events with dates greater than or equal to the current date

    const leaveCount = await db
      .getDb()
      .collection("LeaveRequests")
      .countDocuments();

    // Render the principal dashboard with the fetched data
    res.render("principal/principal-dashboard", {
      principalName: principalName,
      userPhoto: userPhoto,
      achievementsCount: achievementsCount,
      upcomingEventsCount: upcomingEventsCount,
      leaveCount: leaveCount,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/Principal-Achievement", async function (req, res) {
  try {
     const userEmail = req.session.user.email;
     const { principalName, userPhoto } = await getPrincipalDetails(userEmail);
    // Fetch all achievements from the database
    const achievements = await db
      .getDb()
      .collection("Achievements")
      .find({})
      .toArray();

    res.render("principal/Principal-Achievement", {
      achievements: achievements,
      userPhoto: userPhoto,
      principalName: principalName,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/principal-department", async function (req, res) {

   try {
     const userEmail = req.session.user.email;
     const { principalName, userPhoto } = await getPrincipalDetails(userEmail);

     const departments = await db
       .getDb()
       .collection("Departments")
       .find()
       .toArray();

     res.render("principal/principal-department", {
       principalName: principalName,
       userPhoto: userPhoto,
       departments: departments,
     });
   } catch (error) {
     console.error("Error fetching department data:", error);
     res.status(500).send("Internal Server Error");
   }
  
  
});

router.get("/principal-leave", async function (req, res) {
   const userEmail = req.session.user.email;
   const { principalName, userPhoto } = await getPrincipalDetails(userEmail);
  res.render("principal/principal-leave", {
    principalName: principalName,
    userPhoto: userPhoto,
  });
});
router.get("/principal-events", async function (req, res) {
   try {
     const userEmail = req.session.user.email;
     const { principalName, userPhoto } = await getPrincipalDetails(userEmail);
     // Fetch events from the database
     const events = await db.getDb().collection("Events").find().toArray();

     res.render("principal/principal-events", {
       events: events,
       principalName: principalName,
       userPhoto: userPhoto,
     });
   } catch (error) {
     console.error("Error fetching events:", error);
   }

});

router.get("/principal-salary", async function (req, res) {


 try {
   const userEmail = req.session.user.email;
   const { principalName, userPhoto } = await getPrincipalDetails(userEmail);
   const staffMember = await db
     .getDb()
     .collection("Principal")
     .findOne({ email: userEmail });

   // Convert salary string to number
   const baseSalary = parseFloat(staffMember.salary);

   // Check if the conversion was successful
   if (isNaN(baseSalary)) {
     throw new Error("Invalid salary format in the database");
   }

   // Calculate A.G.P (Assuming it's a fixed amount)
   const AGP = 5000; // Example: A.G.P is 5000

   // Calculate other components based on the base salary
   const DA = 0.1 * baseSalary; // Example: 10% of base salary for D.A
   const HRA = 0.05 * baseSalary; // Example: 5% of base salary for HRA
   const otherSalary = 0.02 * baseSalary; // Example: 2% of base salary for other components

   // Calculate total salary
   const totalSalary = baseSalary + AGP + DA + HRA + otherSalary;

   const staffSalary = {
     name: `${staffMember.firstname} ${staffMember.lastname}`,
     salary: {
       basic: baseSalary,
       agp: AGP,
       da: DA,
       hra: HRA,
       other: otherSalary,
       total: totalSalary,
     },
   };

   res.render("principal/principal-salary", {
     staffSalary: staffSalary,
     principalName: principalName,
     userPhoto: userPhoto,
   });
 } catch (error) {
   console.error("Error fetching staff salary:", error);
   res.status(500).send("Internal Server Error");
 }
});

router.get("/principal-profile", async function (req, res) {
  try { const userEmail = req.session.user.email;
  const { principalName, userPhoto } = await getPrincipalDetails(userEmail);
    
    const user = await db
      .getDb()
      .collection("Principal")
      .findOne({ email: userEmail });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const department = await db
      .getDb()
      .collection("Departments")
      .findOne({ "members.email": userEmail });

    res.render("principal/principal-profile", {
      user: user,
      department: department,
      userPhoto: userPhoto,
      principalName: principalName,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).send("Internal server error");
  }
});
router.get("/principal-updprof", async function (req, res) {
   const userEmail = req.session.user.email;
   const { principalName, userPhoto } = await getPrincipalDetails(userEmail);
  res.render("principal/principal-updprof", {
    principalName: principalName,
    userPhoto: userPhoto,
  });
});


router.post(
  "/principal-updprof",
  upload.single("userPhoto"),
  async function (req, res) {
    const userEmail = req.session.user.email;

    const newUser = req.body;

    const entredFirstName = newUser.firstName;
    const enteredLastName = newUser.lastName;
    const enteredPhoneNumber = newUser.phoneNumber;
    const enteredEmgPhoneNumber = newUser.emnumber;
    const enterdGender = newUser.gender;
    const enteredDateOfBirth = newUser.dateOfBirth;
    const enteredHouseno = newUser.houseno;
    const enteredSociety = newUser.society;
    const enteredArea = newUser.area;
    const enteredcity = newUser.City;
    const enteredDateOfJoining = newUser.dateOfJoining;
    const enteredQualification = newUser.qualification;
    const enteredExperience = newUser.experience;
    const enteredqualification = newUser.qualification;
    const enterdDept = newUser.dept;

    if (
      !entredFirstName ||
      !enteredLastName ||
      !enteredPhoneNumber ||
      !enterdGender ||
      !enteredDateOfBirth ||
      !enteredDateOfJoining ||
      !enteredQualification ||
      !enteredExperience
    ) {
      console.log("Invalid Input- please check your data.");
    }

    try {
      await db
        .getDb()
        .collection("Principal")
        .updateOne(
          { email: userEmail }, // Update based on the user's email
          {
            $set: {
              firstname: entredFirstName,
              lastname: enteredLastName,
              phonenumber: enteredPhoneNumber,
              emgnumber: enteredEmgPhoneNumber,
              gender: enterdGender,
              dateofbirth: enteredDateOfBirth,
              dateofjoining: enteredDateOfJoining,
              experience: enteredExperience,
              qualification: enteredqualification,
              address: {
                Houseno: enteredHouseno,
                Society: enteredSociety,
                Area: enteredArea,
                city: enteredcity,
              },
              enterdDept: newUser.dept,

              userphoto: req.file.filename,
            },
          }
        );

      const departmentExists = await db
        .getDb()
        .collection("Departments")
        .findOne({ name: enterdDept });

      if (!departmentExists) {
        await db
          .getDb()
          .collection("Departments")
          .insertOne({ name: enterdDept, members: [] });
      }

      // Add the user to the specified department
      await db
        .getDb()
        .collection("Departments")
        .updateOne(
          { name: enterdDept },
          {
            $addToSet: {
              members: {
                firstname: entredFirstName,
                lastname: enteredLastName,
                phonenumber: enteredPhoneNumber,
                dateofbirth: enteredDateOfBirth,
                email: userEmail,
              },
            },
          }
        );

      res.redirect("/principal/principal-dashboard"); // Redirect to a different page if necessary
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).send("Internal server error");
    }
  }
);

module.exports = router;
