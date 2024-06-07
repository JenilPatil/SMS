const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

let database;

async function connect() {
    try {
        const client = await MongoClient.connect("mongodb://localhost:27017");
        database = client.db("sms");
        console.log("Connected to the database");
    } catch (error) {
        console.error("Error connecting to db:", error.message);
        throw new Error("Unable to connect to the database");
    }
}

function getDb() {
    if (!database) {
        throw new Error("Database connection not established!");
    }
    return database;
}

// Function to perform operations on the respective collection based on user role
async function performOperationBasedOnRole(email, operation) {
    const usersCollection = database.collection('users');
    const user = await usersCollection.findOne({ email });

    if (!user) {
        throw new Error("User not found");
    }

    let collectionName;
    switch (user.role) {
        case "Principal":
            collectionName = "Principals";
            break;
        case "HOD":
            collectionName = "HODs";
            break;
        case "Staff":
            collectionName = "StaffMembers";
            break;
        case "Admin":
            collectionName = "Admins";
            break;
        default:
            throw new Error("Invalid user role");
    }

    const collection = database.collection(collectionName);
    return operation(collection);
}

module.exports = {
    connectToDatabase: connect,
    getDb: getDb,
    performOperationBasedOnRole: performOperationBasedOnRole
};