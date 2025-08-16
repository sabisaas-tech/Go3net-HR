# Go3net HR Management System

A comprehensive HR management system built with Express.js backend and React frontend, featuring role-based access control, employee management, time tracking, and task management.

## 🚀 Features

- **Role-Based Access Control** - Super Admin, HR Admin, Manager, HR Staff, Employee roles
- **Employee Management** - Complete employee lifecycle management
- **Time Tracking** - Check-in/check-out with GPS location support
- **Task Management** - Assign and track tasks across teams
- **Authentication** - Email/password and Google OAuth support
- **Email Verification** - Secure account activation process
- **Mobile-Responsive** - Optimized for all device sizes
- **System Initialization** - Automated setup with super admin creation

## 🏗️ Tech Stack

### Backend
- **Express.js** with TypeScript
- **Supabase** (PostgreSQL database)
- **JWT** Authentication with refresh tokens
- **Bcrypt** for password hashing
- **Joi** for request validation
- **Nodemailer** for email services

### Frontend
- **React** with TypeScript
- **CSS Modules** with design system
- **Context API** for state management
- **React Router** for navigation
- **Mobile-first** responsive design

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Email service (for verification emails)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd go3net-hr-management
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file in backend directory:
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Secrets
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# Server
PORT=5000
NODE_ENV=development

# Email Configuration (for verification emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create `.env` file in frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Database Setup
Run the database schema setup in your Supabase SQL editor:
```bash
# The schema is in backend/database/schema.sql
```

### 5. System Initialization

**IMPORTANT**: Before starting the application, you need to initialize the system with a super admin account.

```bash
cd backend
npm run init-system
```

This will:
- Create the first super admin account
- Generate secure credentials
- Display the login information

**Save the generated credentials securely!**

### 6. Start Development Servers

Backend:
```bash
cd backend
npm run dev
```

Frontend (in another terminal):
```bash
cd frontend
npm start
```

## 🔐 Authentication Flow

### System Hierarchy
1. **Super Admin** - System administrator (created during initialization)
2. **HR Admin** - Full HR management access
3. **Manager** - Team management and oversight
4. **HR Staff** - HR operations and recruitment
5. **Employee** - Basic employee access

### Registration Process
1. User registers with email/password
2. System sends verification email
3. User clicks verification link
4. Account is activated
5. User can log in

### Email Verification
- All new accounts require email verification
- Verification links expire in 24 hours
- Users can request new verification emails
- Unverified accounts cannot log in

## 📱 Usage

### First Time Setup
1. Run system initialization: `npm run init-system`
2. Save the super admin credentials
3. Start the application
4. Log in with super admin credentials
5. Create HR admin accounts
6. Begin setting up your organization

### Creating Users
- **Super Admin** can create HR Admin accounts
- **HR Admin** can create all other user types
- **Managers** can create employee accounts in their teams
- Regular registration is available for employees (with email verification)

### Key Features
- **Dashboard** - Personalized overview for each role
- **Employee Directory** - Search and filter employees
- **Time Tracking** - GPS-enabled check-in/check-out
- **Task Management** - Create, assign, and track tasks
- **Profile Management** - Complete employee profiles

## 🧪 Testing

Backend tests:
```bash
cd backend
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

Frontend tests:
```bash
cd frontend
npm test                # Run all tests
npm run test:coverage   # Coverage report
```

## 📚 API Documentation

### System Endpoints
- `GET /api/system/status` - Check system initialization status
- `POST /api/system/initialize` - Initialize system (creates super admin)

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email address

### Employee Endpoints
- `GET /api/employees` - Get all employees (with filters)
- `POST /api/employees` - Create new employee
- `GET /api/employees/:id` - Get employee by ID
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Time Tracking Endpoints
- `POST /api/time-tracking/checkin` - Check in
- `POST /api/time-tracking/checkout` - Check out
- `GET /api/time-tracking/history` - Get time tracking history

### Task Management Endpoints
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## 🚀 Deployment

### Backend Deployment
1. Build the project: `npm run build`
2. Set production environment variables
3. Deploy to your preferred platform (Heroku, AWS, Railway, etc.)
4. Run system initialization on production

### Frontend Deployment
1. Update API URL in environment variables
2. Build the project: `npm run build`
3. Deploy the `build` folder to hosting service (Netlify, Vercel, etc.)

## 🔧 Troubleshooting

### Common Issues

**System not initialized:**
- Run `npm run init-system` in the backend directory
- Check database connection
- Verify environment variables

**Email verification not working:**
- Check email service configuration
- Verify SMTP settings
- Check spam folder

**Authentication errors:**
- Verify JWT secrets are set
- Check token expiration
- Clear browser storage

**Database connection issues:**
- Verify Supabase credentials
- Check network connectivity
- Review database schema

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting section

---

**Made with ❤️ by the Go3net Team**