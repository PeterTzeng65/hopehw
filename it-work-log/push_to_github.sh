#!/bin/bash

echo "========================================="
echo " 🚀 IT Work Log System - GitHub Push"
echo "========================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

echo "🔧 Step 1: Initializing Git repository..."
git init

echo "🔧 Step 2: Setting main branch..."
git branch -M main

echo "🔧 Step 3: Adding all files..."
git add .

echo "🔧 Step 4: Creating initial commit..."
git commit -m "🎉 Add IT Work Log Management System v1.1 - Enterprise Features

✨ Major Features:
- Complete CRUD operations for work logs
- User authentication and role-based access control  
- Photo upload and management (before/after photos)
- Advanced statistics and reporting with Chart.js
- Operation logging and complete audit trail
- Soft delete with recovery capabilities
- Role-based access control (Admin/Manager/User/Viewer)
- Export capabilities (PDF/Excel/CSV/PowerPoint)

🛠️ Tech Stack:
- Node.js + Express.js backend
- SQLite3 database with enterprise schema
- JWT authentication system
- Responsive web design
- Chart.js for data visualization
- Multer + Sharp for photo processing

📊 System Stats:
- 5,000+ lines of enterprise-grade code
- 25+ RESTful API endpoints
- 20+ major features implemented
- Complete audit trail and security features
- Multi-format data export capabilities

🔒 Security Features:
- Role-based permission system
- Soft delete with recovery
- Complete operation logging
- Secure file upload handling
- JWT token authentication"

echo "🔧 Step 5: Adding remote repository..."
git remote add origin https://github.com/PeterTzeng65/hopehw.git

echo "🔧 Step 6: Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🏷️  Creating version tag..."
    git tag -a v1.1.0 -m "v1.1.0: Enterprise IT Management System

🚀 Major Release - Enterprise Features:
✅ Operation logging and complete audit trail
✅ Soft delete with manager-level recovery
✅ Advanced role-based access control
✅ Photo management with before/after states
✅ Comprehensive statistics and reporting
✅ Multi-format export capabilities

🐛 Technical Improvements:
✅ Fixed Express.js routing conflicts
✅ Resolved authentication token management
✅ Enhanced error handling and logging
✅ Improved database schema with indexes
✅ Optimized frontend performance

🔒 Security Enhancements:
✅ Implemented soft delete for data protection
✅ Added comprehensive audit trails
✅ Enhanced role-based permission system
✅ Secure file upload validation
✅ Production-ready security configurations"

    echo "🔧 Step 7: Pushing version tag..."
    git push origin v1.1.0

    echo ""
    echo "========================================="
    echo "✅ SUCCESS! Your IT Work Log System has been pushed to GitHub!"
    echo "🌐 Repository: https://github.com/PeterTzeng65/hopehw"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Visit your GitHub repository"
    echo "   2. Update repository description"
    echo "   3. Add topic tags for better discoverability"
    echo "   4. Create a release from the v1.1.0 tag"
    echo "   5. Consider making it public to showcase your work"
    echo "========================================="
else
    echo "❌ Push failed. Please check your GitHub credentials and network connection."
    echo "💡 You might need to:"
    echo "   1. Set up your GitHub authentication"
    echo "   2. Check if the repository exists"
    echo "   3. Verify your internet connection"
fi