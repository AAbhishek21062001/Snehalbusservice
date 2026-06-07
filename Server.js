const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer'); 

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json()); // JSON packet read karne ke liye

// ── MONGODB CONNECTION & AUTOMATIC INDEX FIX ──
mongoose.connect('mongodb://localhost:27017/snehal_bus')
.then(async () => {
    console.log('MongoDB connected successfully via Node.js!');
    
    // ── CODE SE AUTOMATIC PURANA CONSTRAINT INDEX DROP KARNA ──
    try {
        const adminDb = mongoose.connection.db;
        const collections = await adminDb.listCollections({ name: 'users' }).toArray();
        
        if (collections.length > 0) {
            // users collection ke saare indexes check karo
            const indexes = await adminDb.collection('users').indexes();
            const hasPhoneIndex = indexes.some(idx => idx.name === 'phone_1');
            
            if (hasPhoneIndex) {
                console.log('[INDEX FIX] Purana phone_1 index mila! Isko automatic drop kiya ja raha hai...');
                await adminDb.collection('users').dropIndex('phone_1');
                console.log('[INDEX FIX] Purana unique phone restriction safalta-purvak hat gaya!');
            } else {
                console.log('[INDEX FIX] phone_1 index pehle se hata hua hai. Shabaash!');
            }
        }
    } catch (indexErr) {
        console.log('[INDEX FIX NOTE] Index reset loop checked smoothly:', indexErr.message);
    }
})
.catch(err => console.error('Database connection error:', err));

// ── USER SCHEMA (UPDATED FOR PURE EMAIL SYSTEM) ──
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true },
    otp: { type: String, default: null }, 
    otpExpires: { type: Date, default: null } 
}, { collection: 'users' }); 

const User = mongoose.model('User', userSchema);

// ── 1. SIGN UP ROUTE ──
app.post('/save', async (req, res) => {
    const { name, email, password } = req.body; 

    try {
        if (!email) {
            return res.status(400).send("Email address missing!");
        }

        const cleanEmail = email.toString().toLowerCase().trim();

        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.send("पहले से रजिस्टर्ड");
        }

        const newUser = new User({ 
            name: name, 
            email: cleanEmail, 
            password: password 
        });

        await newUser.save(); 
        console.log(`[SUCCESS] New user saved in MongoDB: ${cleanEmail}`);
        res.send("Account Created Successfully");
    } catch (err) {
        console.error("MongoDB Sign-Up Save Error:", err);
        res.status(500).send(err.message);
    }
});

// ── 2. LOGIN ROUTE ──
app.post('/login', async (req, res) => {
    const { email, password } = req.body; 

    try {
        if (!email) {
            return res.json({ status: "Fail", message: "Email is required!" });
        }

        const cleanEmail = email.toString().toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail, password: password });
        
        if (user) {
            console.log(`[SUCCESS] User authenticated cleanly: ${cleanEmail}`);
            res.json({
                status: "Success",
                name: user.name,
                email: user.email
            });
        } else {
            res.json({
                status: "Fail",
                message: "Invalid credentials!" 
            });
        }
    } catch (err) {
        console.error("MongoDB Login Error:", err);
        res.status(500).json({ status: "Error", message: err.message });
    }
});

// ── 3. NODEMAILER CONFIGURATION ──
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sarthpatil020205@gmail.com', 
        pass: 'wbwysprxqnwkvmvt'       
    }
});

// ── 4. FORGOT PASSWORD ROUTE ──
app.post('/forgot-password', async (req, res) => {
    const { identity } = req.body; 

    try {
        if (!identity) {
            return res.send("Identity/Email is missing!");
        }
        const cleanEmail = identity.toString().toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.send("Account not found!");
        }

        const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

        user.otp = generatedOTP;
        user.otpExpires = Date.now() + 5 * 60 * 1000; 
        await user.save();

        const mailOptions = {
            from: 'sarthpatil020205@gmail.com',
            to: cleanEmail,
            subject: '🔒 Snehal Bus Service - Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #1A2456; border-radius: 10px; max-width: 450px;">
                    <h2 style="color: #1A2456; text-align: center;">Snehal Bus Service</h2>
                    <p>Aapne password reset karne ke liye request ki hai. Aapka OTP niche diya gaya hai:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #FF6B00; background: #E8F4FD; padding: 10px 20px; border-radius: 5px; border: 1px dashed #1A2456;">${generatedOTP}</span>
                    </div>
                    <p style="font-size: 12px; color: #E74C3C;">*Yeh OTP sirf 5 minute tak valid hai. Kisi ke sath share na karein.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("OTP Email Error:", error);
                return res.send("Email sending failed.");
            }
            res.send("Success: Reset link sent");
        });

    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ── 5. VERIFY OTP ROUTE ──
app.post('/verify-otp', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        if (!email) return res.json({ status: "Fail", message: "Email is missing!" });
        const cleanEmail = email.toString().toLowerCase().trim();
        
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.json({ status: "Fail", message: "Account not found!" });
        }

        if (!user.otp || user.otp !== otp) {
            return res.json({ status: "Fail", message: "Invalid OTP code pin, try again!" });
        }

        if (Date.now() > user.otpExpires) {
            return res.json({ status: "Fail", message: "OTP has expired!" });
        }

        user.password = newPassword;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ status: "Success", message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ status: "Error", message: err.message });
    }
});

// ── 6. CHILD REGISTRATION SCHEMA ──
const childRegistrationSchema = new mongoose.Schema({
    childName: { type: String, required: true },
    parentName: { type: String, required: true },
    email: { type: String, required: true }, // Synchronized property key name
    address: { type: String, required: true }, 
    startPoint: { type: String, required: true },
    endPoint: { type: String, required: true },
    driverName: { type: String, default: "Pending Allocation" }, 
    busNumber: { type: String, default: "Not Assigned Yet" },    
    createdAt: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', childRegistrationSchema);

// ── 7. REGISTER CHILD ROUTE (FIXED SYNC KEY) ──
app.post('/register-child', async (req, res) => {
    // FIXED: Ab frontend se bheja gaya 'email' parameter bina kisi confusion ke seedhe 'email' key par map hoga
    const { childName, parentName, email, address, startPoint, endPoint } = req.body; 

    try {
        if (!email) {
            return res.status(400).json({ status: "Error", message: "Parent email key is completely missing!" });
        }

        const cleanEmail = email.toString().toLowerCase().trim();
        const cleanStartPoint = startPoint ? startPoint.toString().trim() : "";

        const newRegistration = new Registration({ 
            childName, 
            parentName, 
            email: cleanEmail, // Safely mapped to schema field entry
            address,
            startPoint: cleanStartPoint, 
            endPoint,
            driverName: "Pending Allocation", 
            busNumber: "Not Assigned Yet"     
        });
        
        await newRegistration.save();
        console.log(`[SUCCESS] New child student profile saved into MongoDB for: ${cleanEmail}`);

        // Professional HTML Email Notification Structure
        const mailOptions = {
            from: 'sarthpatil020205@gmail.com', 
            to: 'sarthpatil020205@gmail.com', 
            subject: `🚌 New Bus Service Registration Request: ${childName}`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #1A2456; padding: 20px; border-radius: 10px; max-width: 500px;">
                    <h2 style="color: #1A2456; border-bottom: 2px solid #FFD600; padding-bottom: 10px;">Snehal Bus Service - New Registration Request</h2>
                    <p><strong>Child Name:</strong> ${childName}</p>
                    <p><strong>Parent Name:</strong> ${parentName}</p>
                    <p><strong>Parent Email Address:</strong> ${cleanEmail}</p>
                    <p><strong>Home Address Path:</strong> ${address}</p>
                    <p style="background: #E8F4FD; padding: 10px; border-radius: 5px;">
                        <strong>Route Stop Path:</strong> <span style="color: #FF6B00;">${cleanStartPoint}</span> ➔ <span style="color: #2ECC71;">${endPoint}</span>
                    </p>
                    <p style="border-top: 1px solid #ddd; padding-top: 10px; font-weight: bold; color: #E74C3C;">
                        ⚠️ Status: Waiting for you to assign driver and bus vehicle via MongoDB Compass.
                    </p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Admin Email Warning Sending Error:", error);
                return res.json({ status: "Success", message: "Data saved to MongoDB, but email alert failed." });
            }
            res.json({ status: "Success", message: "Child registered perfectly!" });
        });

    } catch (err) {
        console.error("Database Registration Error Loop:", err);
        res.status(500).json({ status: "Error", message: err.message });
    }
});

// ── 8. DYNAMIC DB FETCH ROUTE: GET CHILDREN DIRECTLY FROM MONGO ──
app.get('/get-children', async (req, res) => {
    const parentEmail = req.query.email;
    try {
        if (!parentEmail) return res.status(400).json([]);
        const children = await Registration.find({ email: parentEmail.toLowerCase().trim() });
        res.json(children);
    } catch (err) {
        res.status(500).json([]);
    }
});

// ── 9. DYNAMIC DB REMOVE ROUTE: REMOVE RECORDS DIRECTLY FROM MONGO ──
app.post('/delete-child', async (req, res) => {
    const { id } = req.body;
    try {
        await Registration.findByIdAndDelete(id);
        res.json({ status: "Success" });
    } catch (err) {
        res.status(500).json({ status: "Error" });
    }
});

app.listen(5000, () => {
    console.log('Node.js Server is running perfectly on http://localhost:5000');
});