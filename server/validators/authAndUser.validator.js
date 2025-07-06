import { body } from 'express-validator';

// Validators
const emailValidator = () =>
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address.');

const passwordValidator = (field = 'password', message = 'Password must be at least 6 characters long') =>
  body(field)
    .notEmpty().withMessage(`${field} is required`)
    .isLength({ min: 6 }).withMessage(message);

const phoneValidator = () =>
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone('any').withMessage('Please provide a valid phone number');

const staffAndViewerValidator = () =>
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['staff', 'viewer']).withMessage('Role must be one of: staff, viewer');

const wageValidator = () =>
  body('wagePerHour')
    .optional()
    .isNumeric().withMessage('Wage must be a number')
    .isFloat({ min: 0 }).withMessage('Wage must be a positive number');

const notEmptyValidator = (field, message) =>
  body(field)
    .notEmpty()
    .withMessage(message || `${field} cannot be empty`);







// Grouped Validations
const registerValidation = [
  emailValidator(),
  passwordValidator(),
  notEmptyValidator('name', 'Name is required'),
];

const loginValidation = [
  emailValidator(),
  notEmptyValidator('password', 'Password is required'),
];

const changePasswordValidation = [
  notEmptyValidator('oldPassword', 'Old password is required'),
  passwordValidator('newPassword', 'New password must be at least 6 characters'),
];

const createUserValidation = [
  notEmptyValidator('fullName', 'Full name is required'),
  emailValidator(),
  passwordValidator(),
  phoneValidator(),
  staffAndViewerValidator(),
  wageValidator(),
];

const createSupplierValidation = [
  notEmptyValidator('fullName', 'Full name is required'),
  notEmptyValidator('companyName', 'Company name is required'),
  emailValidator(),
  passwordValidator(),
  phoneValidator(),
];

const createTransporterValidation = [
  notEmptyValidator('fullName', 'Full name is required'),
  notEmptyValidator('companyName', 'Company name is required'),
  emailValidator(),
  passwordValidator(),
  phoneValidator(),
];

export {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  createUserValidation,
  createSupplierValidation,
  createTransporterValidation,
};