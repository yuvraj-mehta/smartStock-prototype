import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js"
import bcrypt from "bcryptjs";


const createUser = catchAsyncErrors(async (req, res) => {
  const { fullName, email, password, role, status } = req.body;;

  if (!fullName || !email || !password || !role || !status) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: 'User with this email already exists.'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    fullName,
    email,
    password: hashedPassword,
    role,
    status,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  res.status(201).json({
    message: 'User created successfully.',
    user: {
      id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      emailVerified: newUser.emailVerified,
    }
  })
})

export default createUser;