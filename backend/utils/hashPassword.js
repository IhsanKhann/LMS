import bcrypt from "bcryptjs";

// Run this manually to get a hash for Workbench
const saltRounds = 10;
const myPlaintextPassword = "admin123"; 

bcrypt.hash(myPlaintextPassword, saltRounds, (err, hash) => {
    console.log("Copy this hash into your DB:", hash);
});