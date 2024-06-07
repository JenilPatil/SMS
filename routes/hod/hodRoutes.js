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

async function getHODDetails(email) {
  try {
    const hod = await db.getDb().collection("HODs").findOne({ email: email });

    if (hod) {
      return {
        hodName: `${hod.firstname} ${hod.lastname}`.trim(),
        department: hod.department || "",
        userPhoto: hod.userphoto || "", // Default to empty string if userphoto is not available
      };
    } else {
      return { hodName: "H.O.D", department: "", userPhoto: "" };
    }
  } catch (error) {
    console.error("Error fetching H.O.D details:", error);
    return { hodName: "H.O.D", department: "", userPhoto: "" };
  }
}



router.get("/hod-dashboard", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    // Fetch H.O.D details
    const { hodName, department, userPhoto } = await getHODDetails(userEmail);

    // Fetch upcoming events and leave requests
    const currentDate = new Date().toISOString(); // Current date in ISO string format
   const upcomingEventsCount = await db
     .getDb()
     .collection("Events")
     .countDocuments({ date: { $gte: currentDate } });

    let pendingLeaveCount = 0; // Initialize pending leave count

    // Check if there are any pending leave requests
    const pendingLeaveRequests = await db
      .getDb()
      .collection("LeaveRequests")
      .find({ status: "pending" })
      .toArray();

    if (pendingLeaveRequests && pendingLeaveRequests.length > 0) {
      // If there are pending leave requests, fetch the count
      pendingLeaveCount = pendingLeaveRequests.length;
    }

    // Render the H.O.D dashboard with the fetched data
    res.render("hod/hod-dashboard", {
      hodName: hodName,
      department: department,
      userPhoto: userPhoto,
      upcomingEventsCount: upcomingEventsCount,
      pendingLeaveCount: pendingLeaveCount,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.get("/HOD-staff", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    // Fetch H.O.D details
    const { hodName, department, userPhoto } = await getHODDetails(userEmail);

    const hod = await db
      .getDb()
      .collection("HODs")
      .findOne({ email: userEmail });

    if (!hod) {
      return res.status(404).send("HOD not found");
    }

    const hodDepartment = hod.department;

    const staffMembers = await db
      .getDb()
      .collection("StaffMembers")
      .find({ department: hodDepartment })
      .toArray();

    res.render("hod/HOD-staff", {
      staffMembers: staffMembers,
      hodName: hodName,
      department: department,
      userPhoto: userPhoto,
    });
  } catch (error) {
    console.error("Error fetching staff members:", error);
    res.status(500).send("Internal server error");
  }
});
router.get("/HOD-ach", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    // Fetch H.O.D details
    const { hodName, department, userPhoto } = await getHODDetails(userEmail);
    const achievements = await db
      .getDb()
      .collection("Achievements")
      .find({})
      .toArray();

    res.render("hod/HOD-ach", {
      achievements: achievements,
      hodName: hodName,
      department: department,
      userPhoto: userPhoto,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/HOD-event", async function (req, res) {
  try {
    const userEmail = req.session.user.email;

    // Fetch H.O.D details
    const { hodName, department, userPhoto } = await getHODDetails(userEmail);
    const events = await db.getDb().collection("Events").find().toArray();

    res.render("hod/HOD-event", {
      events: events,
      hodName: hodName,
      department: department,
      userPhoto: userPhoto,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/HOD-salary", async function (req, res) {
  try {
   const userEmail = req.session.user.email;

   // Fetch H.O.D details
   const { hodName, department, userPhoto } = await getHODDetails(userEmail);

    const staffMember = await db
      .getDb()
      .collection("HODs")
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
      name: staffMember.firstname,
      salary: {
        basic: baseSalary,
        agp: AGP,
        da: DA,
        hra: HRA,
        other: otherSalary,
        total: totalSalary,
      },
    };

    res.render("hod/HOD-salary", {
      staffSalary: staffSalary,
      hodName: hodName,
      department: department,
      userPhoto: userPhoto,
    });
  } catch (error) {
    console.error("Error fetching staff salary:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/HOD-profile", async function (req, res) {
  try {
   const userEmail = req.session.user.email;

   // Fetch H.O.D details
   const { hodName, userPhoto } = await getHODDetails(userEmail);
    const user = await db
      .getDb()
      .collection("HODs")
      .findOne({ email: userEmail });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const department = await db
      .getDb()
      .collection("Departments")
      .findOne({ "members.email": userEmail });

    res.render("hod/HOD-profile", {
      user: user,
      department: department,
      hodName: hodName,
    
      userPhoto: userPhoto,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).send("Internal server error");
  }
});
router.get("/HOD-updprof", async function (req, res) {
  const userEmail = req.session.user.email;

  // Fetch H.O.D details
  const { hodName, department, userPhoto } = await getHODDetails(userEmail);
  res.render("hod/HOD-updprof", {
    hodName: hodName,
    department: department,
    userPhoto: userPhoto,
  });
});

router.post(
  "/HOD-updprof",
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
        .collection("HODs")
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
              department: newUser.dept,

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

      res.redirect("/hod/hod-dashboard");
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).send("Internal server error");
    }
  }
);

router.get("/HOD-leave", async (req, res) => {
  try {
   const userEmail = req.session.user.email;

   // Fetch H.O.D details
   const { hodName, department, userPhoto } = await getHODDetails(userEmail);

    const hod = await db
      .getDb()
      .collection("HODs")
      .findOne({ email: userEmail });

    if (!hod) {
      return res.status(404).send("HOD not found");
    }

    const hodDepartment = hod.department;

    const leaveRequests = await db
      .getDb()
      .collection("LeaveRequests")
      .find({ department: hodDepartment })
      .toArray();

    // Iterate through each leave request and fetch the corresponding user email
    for (const request of leaveRequests) {
      const userEmail = await db
        .getDb()
        .collection("StaffMembers")
        .findOne({ email: request.email });

      // Add the user email to the leave request object
      request.userEmail = userEmail;
    }

    res.render("hod/HOD-leave", {
      leaveRequests: leaveRequests,
      hodName: hodName,
      department: department,
      userPhoto: userPhoto,
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/HOD-leave/update-status", async (req, res) => {
  const email = req.body.email;
  const status = req.body.status;

  try {
    if (!email || !status) {
      throw new Error("Email or status is missing.");
    }
    // Ensure status is valid
    if (status !== "approved" && status !== "rejected") {
      throw new Error("Invalid status.");
    }

    // Update the status of the leave request
    const result = await db
      .getDb()
      .collection("LeaveRequests")
      .updateOne(
        { email: email, status: "pending" },
        { $set: { status: status } }
      );

    if (result.modifiedCount === 0) {
      throw new Error("Leave request not found or not modified");
    }

    res.redirect("/hod/HOD-leave");
  } catch (error) {
    console.error("Error updating leave request status:", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
