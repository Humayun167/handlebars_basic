const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [16, 'Age must be at least 16'],
        max: [100, 'Age must be less than 100']
    },
    major: {
        type: String,
        required: [true, 'Major is required'],
        trim: true
    },
    gpa: {
        type: Number,
        required: [true, 'GPA is required'],
        min: [0.0, 'GPA must be at least 0.0'],
        max: [4.0, 'GPA must be at most 4.0']
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
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Add a method to calculate class statistics
studentSchema.statics.getClassStats = async function() {
    const students = await this.find();
    const count = students.length;
    const avgGPA = count > 0 ? (students.reduce((sum, student) => sum + student.gpa, 0) / count) : 0;
    
    return {
        count,
        avgGPA: parseFloat(avgGPA.toFixed(2))
    };
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;