require('dotenv').config();
const {create} = require('express-handlebars');
const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/database');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const { requireAuth, checkAdminCredentials, addUserToLocals } = require('./middleware/auth');
const app = express();

// Connect to MongoDB
connectDB();

const hbs = create({
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    }
});

app.engine("handlebars", hbs.engine);

app.set("view engine", "handlebars");

// Set views directory with absolute path for Vercel
app.set("views", path.join(__dirname, "views"));

// Middleware to parse JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration - handle serverless environment
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Only use memory sessions for development, disable for serverless
if (process.env.NODE_ENV !== 'production') {
    app.use(session(sessionConfig));
} else {
    // For serverless, use a simplified session middleware
    app.use((req, res, next) => {
        req.session = {};
        next();
    });
}

// Add user info to all templates
app.use(addUserToLocals);

// Test route for Vercel deployment
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        mongodb: process.env.MONGODB_URI ? 'configured' : 'missing'
    });
});

// Test route for debugging
app.post('/api/test-teacher', requireAuth, async (req, res) => {
    console.log('=== DEBUGGING TEACHER DATA ===');
    console.log('Raw body:', req.body);
    console.log('Headers:', req.headers);
    res.json({ received: req.body, success: true });
});
// ===================== AUTHENTICATION ROUTES =====================

// Login page
app.get('/login', (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect('/');
    }
    res.render('login', { title: 'Admin Login' });
});

// Login form submission
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const isValid = await checkAdminCredentials(email, password);
        
        if (isValid) {
            req.session.isAuthenticated = true;
            req.session.user = {
                email: email,
                role: 'admin'
            };
            res.redirect('/');
        } else {
            res.render('login', {
                title: 'Admin Login',
                error: 'Invalid email or password',
                email: email
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            title: 'Admin Login',
            error: 'Login failed. Please try again.',
            email: email
        });
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

// ===================== PROTECTED ROUTES =====================

app.get("/", requireAuth, async (req, res) => {
    try {
        // Get statistics for dashboard
        const studentStats = await Student.getClassStats();
        const teacherStats = await Teacher.getTeacherStats();
        
        const data = {
            name: "Student Portal Admin",
            title: "Student Portal Dashboard",
            showStudents: false, // Show dashboard instead of student list
            studentCount: studentStats.count,
            avgGPA: studentStats.avgGPA,
            teacherCount: teacherStats.count,
            avgExperience: teacherStats.avgExperience
        };
        res.render("home", data);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.render("home", {
            name: "Student Portal Admin",
            title: "Student Portal Dashboard",
            showStudents: false,
            studentCount: 0,
            avgGPA: '0.00',
            teacherCount: 0,
            avgExperience: '0.0',
            error: 'Unable to fetch dashboard data'
        });
    }
});

// Route to display all students
app.get("/students", requireAuth, async (req, res) => {
    try {
        const students = await Student.find({}).sort({ name: 1 }); // Sort by name
        res.render("home", { 
            title: "Student List",
            students: students,
            showStudents: true
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.render("home", {
            title: "Student List", 
            students: [],
            showStudents: true,
            error: 'Unable to fetch student data'
        });
    }
});

// API route to add a new student
app.post("/api/students", requireAuth, async (req, res) => {
    try {
        const studentData = {
            name: req.body.name,
            age: parseInt(req.body.age),
            major: req.body.major,
            gpa: parseFloat(req.body.gpa),
            email: req.body.email
        };
        
        const student = new Student(studentData);
        const savedStudent = await student.save();
        
        res.status(201).json({
            success: true,
            message: 'Student added successfully',
            student: savedStudent
        });
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(400).json({
            success: false,
            message: 'Error adding student',
            error: error.message
        });
    }
});

// API route to get a specific student
app.get("/api/students/:id", requireAuth, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        res.json({
            success: true,
            student: student
        });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching student',
            error: error.message
        });
    }
});

// API route to update a student
app.put("/api/students/:id", requireAuth, async (req, res) => {
    try {
        const studentData = {
            name: req.body.name,
            age: parseInt(req.body.age),
            major: req.body.major,
            gpa: parseFloat(req.body.gpa),
            email: req.body.email
        };
        
        const student = await Student.findByIdAndUpdate(
            req.params.id, 
            studentData, 
            { new: true, runValidators: true }
        );
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Student updated successfully',
            student: student
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(400).json({
            success: false,
            message: 'Error updating student',
            error: error.message
        });
    }
});

// API route to delete a student
app.delete("/api/students/:id", requireAuth, async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        res.json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting student',
            error: error.message
        });
    }
});

// Route for student management page
app.get("/manage", requireAuth, async (req, res) => {
    try {
        const students = await Student.find({}).sort({ name: 1 });
        const stats = await Student.getClassStats();
        res.render("manage-students", { 
            title: "Manage Students",
            students: students,
            studentCount: stats.count,
            avgGPA: stats.avgGPA
        });
    } catch (error) {
        console.error('Error fetching students for management:', error);
        res.render("manage-students", {
            title: "Manage Students",
            students: [],
            studentCount: 0,
            avgGPA: '0.00',
            error: 'Unable to fetch student data'
        });
    }
});

// ===================== TEACHER ROUTES =====================

// Route to display all teachers
app.get("/teachers", requireAuth, async (req, res) => {
    try {
        const teachers = await Teacher.find({}).sort({ name: 1 }); // Sort by name
        res.render("teachers", { 
            title: "Teacher List",
            teachers: teachers,
            showTeachers: true
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.render("teachers", {
            title: "Teacher List", 
            teachers: [],
            showTeachers: true,
            error: 'Unable to fetch teacher data'
        });
    }
});

// Route for teacher management page
app.get("/manage-teachers", requireAuth, async (req, res) => {
    try {
        const teachers = await Teacher.find({}).sort({ name: 1 });
        const stats = await Teacher.getTeacherStats();
        res.render("manage-teachers", { 
            title: "Manage Teachers",
            teachers: teachers,
            teacherCount: stats.count,
            avgSalary: stats.avgSalary,
            avgExperience: stats.avgExperience
        });
    } catch (error) {
        console.error('Error fetching teachers for management:', error);
        res.render("manage-teachers", {
            title: "Manage Teachers",
            teachers: [],
            teacherCount: 0,
            avgSalary: '0.00',
            avgExperience: '0.0',
            error: 'Unable to fetch teacher data'
        });
    }
});

// API route to add a new teacher
app.post("/api/teachers", requireAuth, async (req, res) => {
    try {
        console.log('Received teacher data:', req.body); // Debug logging
        
        const teacherData = {
            name: req.body.name,
            age: parseInt(req.body.age),
            subject: req.body.subject,
            department: req.body.department,
            experience: parseInt(req.body.experience),
            salary: parseFloat(req.body.salary),
            email: req.body.email,
            phone: req.body.phone
        };
        
        console.log('Processed teacher data:', teacherData); // Debug logging
        
        const teacher = new Teacher(teacherData);
        const savedTeacher = await teacher.save();
        
        console.log('Teacher saved successfully:', savedTeacher._id); // Debug logging
        
        res.status(201).json({
            success: true,
            message: 'Teacher added successfully',
            teacher: savedTeacher
        });
    } catch (error) {
        console.error('Error adding teacher:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Error adding teacher';
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            errorMessage = `Validation Error: ${validationErrors.join(', ')}`;
        } else if (error.code === 11000) {
            errorMessage = 'Email address is already in use. Please use a different email.';
        } else {
            errorMessage = error.message || 'Unknown error occurred';
        }
        
        res.status(400).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
});

// API route to get a specific teacher
app.get("/api/teachers/:id", requireAuth, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
        res.json({
            success: true,
            teacher: teacher
        });
    } catch (error) {
        console.error('Error fetching teacher:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teacher',
            error: error.message
        });
    }
});

// API route to update a teacher
app.put("/api/teachers/:id", requireAuth, async (req, res) => {
    try {
        const teacherData = {
            name: req.body.name,
            age: parseInt(req.body.age),
            subject: req.body.subject,
            department: req.body.department,
            experience: parseInt(req.body.experience),
            salary: parseFloat(req.body.salary),
            email: req.body.email,
            phone: req.body.phone
        };
        
        const teacher = await Teacher.findByIdAndUpdate(
            req.params.id, 
            teacherData, 
            { new: true, runValidators: true }
        );
        
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Teacher updated successfully',
            teacher: teacher
        });
    } catch (error) {
        console.error('Error updating teacher:', error);
        res.status(400).json({
            success: false,
            message: 'Error updating teacher',
            error: error.message
        });
    }
});

// API route to delete a teacher
app.delete("/api/teachers/:id", requireAuth, async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
        res.json({
            success: true,
            message: 'Teacher deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting teacher',
            error: error.message
        });
    }
});

    const PORT = process.env.PORT || 8080;

    // Only start server if not in Vercel environment
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }

    // Export the app for Vercel
    module.exports = app;