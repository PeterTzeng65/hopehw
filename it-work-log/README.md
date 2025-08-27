# 🖥️ IT Work Log Management System

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue.svg)](https://sqlite.org/)
[![Express](https://img.shields.io/badge/Framework-Express-lightgrey.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive IT work log management system designed for IT departments to track, manage, and analyze technical issues and resolutions. Built with modern web technologies for reliability and ease of use.

## ✨ Features

### 🏠 Core Functionality
- **Work Log Management**: Create, edit, view, and organize IT work logs
- **Advanced Search & Filtering**: Multi-criteria search with real-time filtering
- **User Authentication**: JWT-based secure authentication system
- **Role-Based Access Control**: Admin, Manager, User, and Viewer roles
- **Photo Management**: Upload and manage before/after photos for each work log

### 📊 Analytics & Reporting
- **Interactive Dashboard**: Real-time statistics and key metrics
- **Advanced Statistics**: Multiple chart types (pie, bar, line, doughnut)
- **Data Visualization**: Powered by Chart.js 3.9.1
- **Export Capabilities**: PDF, Excel, CSV, and PowerPoint export
- **Trend Analysis**: Multi-dimensional data analysis

### 🔐 Enterprise Features
- **Operation Logging**: Complete audit trail for all actions
- **Soft Delete**: Safe data deletion with recovery capabilities
- **Data Protection**: Deleted records visible only to managers and admins
- **Backup & Restore**: Automated backup system
- **PWA Support**: Progressive Web App capabilities

### 📱 User Experience
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Live data synchronization
- **Intuitive UI**: Modern, clean interface design
- **Multi-language Ready**: Localization support

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16.0 or higher
- **npm** 6.0 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/it-work-log.git
   cd it-work-log
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and visit `http://localhost:3009`
   - Default admin credentials: `admin` / `admin123`

## 🛠️ Technical Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcrypt for password hashing
- **File Upload**: Multer with Sharp for image processing

### Frontend
- **Core**: Vanilla JavaScript (ES6+)
- **Charts**: Chart.js 3.9.1
- **Icons**: Font Awesome 6.4.0
- **Export**: xlsx, jsPDF, PptxGenJS
- **UI**: Custom CSS with modern design

### Database Schema
```sql
-- Work Logs
work_logs (id, serial_number, current_status, improved_status, 
          problem_category, department, reporter, resolver, status, 
          notes, is_deleted, deleted_date, deleted_by)

-- Users
users (id, username, password, full_name, email, department, 
       role, permissions, is_active)

-- Operation Logs (Audit Trail)
operation_logs (id, work_log_id, user_id, operation_type, 
               old_data, new_data, description, ip_address)

-- Photo Management
work_log_photos (id, work_log_id, photo_type, file_name, 
                file_path, thumbnail_path, file_size)
```

## 📖 Usage Guide

### User Roles & Permissions

| Role | Create | Read | Update | Delete | Manage Users | View Stats | View Deleted |
|------|--------|------|--------|--------|-------------|------------|--------------|
| **Viewer** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Key Workflows

1. **Creating Work Logs**
   - Fill in issue details and categorization
   - Upload before/after photos
   - Track resolution progress

2. **Managing Photos**
   - Support for before/after state documentation
   - Automatic thumbnail generation
   - Organized photo galleries

3. **Statistical Analysis**
   - Generate various chart types
   - Filter by date ranges and categories
   - Export reports in multiple formats

4. **Data Recovery**
   - Soft delete with manager-level recovery
   - Complete operation audit trail
   - Data integrity protection

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=3009
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Database Configuration
DB_PATH=./database/work_log.db

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif
```

### Deployment Options

#### Docker Deployment
```bash
# Build and run with Docker
docker build -t it-work-log .
docker run -p 3009:3009 -v $(pwd)/database:/app/database it-work-log
```

#### PM2 Production
```bash
# Install PM2 globally
npm install pm2 -g

# Start with PM2
pm2 start ecosystem.config.js
pm2 monit
```

## 📊 Project Statistics

- **Lines of Code**: ~5,000+
- **Database Tables**: 5 main tables
- **API Endpoints**: 25+ RESTful endpoints
- **Features**: 20+ major features
- **Supported Formats**: PDF, Excel, CSV, PowerPoint
- **Chart Types**: 4 different visualization types

## 🔒 Security Features

- **Authentication**: JWT-based token system
- **Authorization**: Role-based access control
- **Data Protection**: Soft delete mechanism
- **Audit Trail**: Complete operation logging
- **Input Validation**: Server-side validation
- **File Upload Security**: Type and size restrictions

## 🤝 Contributing

We welcome contributions to improve this project!

### Development Setup
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Use ESLint configuration provided
- Follow existing naming conventions
- Add comments for complex logic
- Write tests for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chart.js** - For excellent charting capabilities
- **Express.js** - For robust web framework
- **SQLite** - For reliable database engine
- **Font Awesome** - For beautiful icons
- **Community** - For inspiration and feedback

## 📞 Support

For support and questions:
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: Check the `/docs` folder for detailed guides
- **Wiki**: Visit the project wiki for additional resources

## 🔄 Version History

### v1.1 (Latest) - Enterprise Features
- ✅ Operation logging and audit trail
- ✅ Soft delete with recovery
- ✅ Manager-level deleted record access
- ✅ Enhanced security and data protection

### v1.0 - Core Features
- ✅ Basic CRUD operations
- ✅ User authentication and roles
- ✅ Photo upload and management
- ✅ Statistics and reporting
- ✅ Data export capabilities

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Made with ❤️ for IT departments worldwide**