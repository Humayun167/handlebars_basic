const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [22, 'Age must be at least 22'],
        max: [80, 'Age must be less than 80']
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    experience: {
        type: Number,
        required: [true, 'Experience is required'],
        min: [0, 'Experience must be at least 0 years'],
        max: [50, 'Experience must be less than 50 years']
    },
    salary: {
        type: Number,
        required: [true, 'Salary is required'],
        min: [20000, 'Salary must be at least  ৳20,000'],
        max: [200000, 'Salary must be less than ৳200,000']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
            validator: function(v) {
                // More flexible phone validation - allows various formats
                return /^[\+]?[1-9][\d]{0,15}$/.test(v.replace(/[\s\(\)\-\.]/g, ''));
            },
            message: 'Please provide a valid phone number (10+ digits)'
        }
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Add a method to calculate teacher statistics
teacherSchema.statics.getTeacherStats = async function() {
    const teachers = await this.find();
    const count = teachers.length;
    const avgSalary = count > 0 ? (teachers.reduce((sum, teacher) => sum + teacher.salary, 0) / count) : 0;
    const avgExperience = count > 0 ? (teachers.reduce((sum, teacher) => sum + teacher.experience, 0) / count) : 0;
    
    return {
        count,
        avgSalary: parseFloat(avgSalary.toFixed(2)),
        avgExperience: parseFloat(avgExperience.toFixed(1))
    };
};

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;